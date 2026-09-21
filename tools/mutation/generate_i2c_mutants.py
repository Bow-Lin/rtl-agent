#!/usr/bin/env python3
"""Generate the frozen i2c-mutants-v1 mutation benchmark for the FreeCores I2C DUT.

Standalone tool (no repo package imports). Pipeline:

  1. Verify Golden DUT sources against the locked SHA-256 digests.
  2. Rebuild the normalized workspace DUT copy (module rename only) and verify it
     against the baseline manifest digests of a pristine coverage run.
  3. Scan the DUT sources with constrained rule-based operators to build a
     candidate pool (candidates.json).
  4. Deterministically select 30 candidates (seed=42) under module/operator
     diversity quotas, validating each with the locked Verilator lint/elaborate
     flow; invalid candidates are replaced by the next candidate in the same
     bucket.
  5. Emit mutation/{manifest.json,summary.md,candidates.json,selection.json,
     mutants/Mxxx.patch}.

The tool never reads testbench content beyond digest verification and never
consumes coverage or kill information.
"""

from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import os
import random
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

VERSION = "i2c-mutants-v1"
SEED = 42
TARGET_MUTANTS = 30

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATASET = REPO_ROOT / ".rtl-agent" / "datasets" / "freecores-i2c"
DEFAULT_WORKSPACE_RTL = (
    REPO_ROOT
    / ".rtl-agent"
    / "i2c-coverage-runs"
    / "i2c-master"
    / "run_20260804-151037-229"
    / "workspace"
    / "rtl"
)
DEFAULT_OUT = REPO_ROOT / "mutation"
GOLDEN_COMMIT = "3b067f00ccced753b0502024766a51f58f3e04bc"

# Locked digests (packages/core-loop/src/i2c-coverage-lock.ts).
LOCKED_SOURCES = {
    "rtl/verilog/i2c_master_bit_ctrl.v": "6bafd8ac32abec95e07abcefacc3291e74cf9e620369e4e7c1f1df8036824b88",
    "rtl/verilog/i2c_master_byte_ctrl.v": "150ee658fa5985089819c2486e4d7a1940a348b68b6d10d0c3d6c3813ee0bbb6",
    "rtl/verilog/i2c_master_defines.v": "2e2974063bd8ad4befd1e4cdd3a3e4f981ec5df02d3411b04b5d88f0294be5e8",
    "rtl/verilog/i2c_master_top.v": "c179f381eb8117648de789339153e25fdd5fa1eaad66c25bbf9704bfe84b6431",
}

# Normalized workspace digests (evidence/baseline-manifest.json of a pristine run).
WORKSPACE_DIGESTS = {
    "dut/i2c_master_bit_ctrl.v": "6bafd8ac32abec95e07abcefacc3291e74cf9e620369e4e7c1f1df8036824b88",
    "dut/i2c_master_byte_ctrl.v": "150ee658fa5985089819c2486e4d7a1940a348b68b6d10d0c3d6c3813ee0bbb6",
    "dut/i2c_master_defines.v": "2e2974063bd8ad4befd1e4cdd3a3e4f981ec5df02d3411b04b5d88f0294be5e8",
    "dut/i2c_master_top.v": "48dc32a776c6d52a837732a4787ef70a8738337cc4e574ad526eef3166bdfb5e",
    "tb.sv": "e4dc4230dd669c34cb952be3f56efde7d9fca862249ef74cc96527783696536b",
    "checker.sv": "ba8e6b7003cc5f7dde0bf0ca45fda4dc3173bfe17515ceba7619a7cb8fb51bed",
    "i2c_slave_model.v": "672266fa67c3e8a0a7149ca226936be74f217da7c18ba87959d72b85ae326f12",
    "wb_master_model.v": "5e5a1040db60d377c38e4b42b2300b0f02624fd91de89c243ba2e6ad0b8779b9",
}

DUT_FILES = [
    "dut/i2c_master_bit_ctrl.v",
    "dut/i2c_master_byte_ctrl.v",
    "dut/i2c_master_top.v",
]

DEFAULT_VERILATOR = r"C:\msys64\ucrt64\bin\verilator_bin.exe"
DEFAULT_VERILATOR_ROOT = r"C:\msys64\ucrt64\share\verilator"

MODULE_OF_FILE = {
    "dut/i2c_master_bit_ctrl.v": "i2c_master_bit_ctrl",
    "dut/i2c_master_byte_ctrl.v": "i2c_master_byte_ctrl",
    "dut/i2c_master_top.v": "TopModule",
}

RESET_SIGNALS = re.compile(r"nreset|rst_i|wb_rst_i|arst_i|\brst\b", re.IGNORECASE)


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Golden preparation
# ---------------------------------------------------------------------------


def load_golden_dut(dataset: Path) -> dict[str, str]:
    """Read locked DUT sources, verify digests, apply the provider normalization.

    Mirrors the workspace byte-for-byte: bit/byte/defines keep their raw CRLF
    bytes (workspace copies are identical to upstream), while the top module is
    newline-normalized and renamed exactly like I2cCoverageFixtureProvider.
    """
    golden: dict[str, str] = {}
    for logical, digest in LOCKED_SOURCES.items():
        path = dataset / logical
        raw = path.read_bytes()
        actual = hashlib.sha256(raw).hexdigest()
        if actual != digest:
            raise SystemExit(f"GOLDEN_DIGEST_MISMATCH: {logical}: {actual} != {digest}")
        name = Path(logical).name
        if name == "i2c_master_top.v":
            text = raw.decode("utf-8").replace("\r\n", "\n").replace("\r", "\n")
            if text.count("module i2c_master_top") != 1:
                raise SystemExit("GOLDEN_NORMALIZATION_FAILED: module rename anchor missing")
            text = text.replace("module i2c_master_top", "module TopModule")
        else:
            text = raw.decode("utf-8")
        golden[f"dut/{name}"] = text
    for rel, text in golden.items():
        actual = sha256_text(text)
        if actual != WORKSPACE_DIGESTS[rel]:
            raise SystemExit(f"NORMALIZED_DIGEST_MISMATCH: {rel}: {actual}")
    return golden


def verify_support_files(workspace_rtl: Path) -> dict[str, str]:
    """Verify the pristine normalized TB/checker/models used as compile context."""
    support: dict[str, str] = {}
    for rel in ("tb.sv", "checker.sv", "i2c_slave_model.v", "wb_master_model.v"):
        data = (workspace_rtl / rel).read_bytes()
        actual = hashlib.sha256(data).hexdigest()
        if actual != WORKSPACE_DIGESTS[rel]:
            raise SystemExit(f"SUPPORT_DIGEST_MISMATCH: {rel} is not the pristine baseline copy")
        support[rel] = data.decode("utf-8").replace("\r\n", "\n").replace("\r", "\n")
    return support


# ---------------------------------------------------------------------------
# Candidate scanning
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Candidate:
    cid: str
    file: str
    module: str
    line: int  # 1-based line in the normalized workspace DUT file
    operator: str
    related_signal: str
    original: str
    mutated: str
    original_line: str
    mutated_line: str
    equivalence: str


def line_candidate(
    rel: str, lines: list[str], index: int, operator: str, related: str,
    mutated_line: str, equivalence: str,
) -> Candidate | None:
    raw_original = lines[index]
    crlf = raw_original.endswith("\r")
    original_line = raw_original[:-1] if crlf else raw_original
    mutated_line = mutated_line[:-1] if mutated_line.endswith("\r") else mutated_line
    if crlf:
        mutated_line += "\r"
    if mutated_line == raw_original:
        return None
    cid = f"{rel}:{index + 1}:{operator}:{hashlib.sha1(mutated_line.encode()).hexdigest()[:8]}"
    return Candidate(
        cid=cid,
        file=rel,
        module=MODULE_OF_FILE[rel],
        line=index + 1,
        operator=operator,
        related_signal=related,
        original=original_line.strip(),
        mutated=mutated_line.strip(),
        original_line=raw_original,
        mutated_line=mutated_line,
        equivalence=equivalence,
    )


IF_COND = re.compile(r"^(\s*(?:else\s+)?if\s*)\((.*)\)(\s*(?:begin)?\s*(?://.*)?)$")
HEX_CONST = re.compile(r"(\d+)'h([0-9a-fA-F]+)")
DEC_CONST = re.compile(r"(\d+)'d(\d+)")
BIT_SELECT = re.compile(r"([A-Za-z_]\w*)\[(\d+)(?::(\d+))?\]")
FSM_ASSIGN = re.compile(r"^(\s*(?:c_state|slave_state)\s*<=\s*)([A-Za-z_]\w*)(\s*;.*)$")
DECL = re.compile(r"\b(?:reg|wire)\s*\[\s*(\d+)\s*:\s*(\d+)\s*\]\s*([^;]+)")
COMMENT_LINE = re.compile(r"^\s*(//|/\*)")
CASE_LABEL = re.compile(r"^\s*(case\b|endcase|default\b|[A-Za-z_]\w*\s*:)")
SELF_ASSIGN = re.compile(
    r"^\s*([A-Za-z_]\w*(?:\[[^\]]+\])?)\s*<=\s*([A-Za-z_]\w*(?:\[[^\]]+\])?)\s*;"
)
ALWAYS_LINE = re.compile(r"^\s*always\s*@")
CASE_LINE = re.compile(r"\bcase\s*\(")

# LHS targets of continuous assignments must not be index-mutated (multi-driver risk).
ASSIGN_LHS = re.compile(r"^\s*assign\s+([A-Za-z_]\w*)\[")


def in_reset_branch(lines: list[str], index: int) -> bool:
    """Heuristic: a statement belongs to a reset branch if its own leading
    condition or the nearest enclosing condition above it (walking past sibling
    statements in the same begin block) is reset-conditioned. Stops at
    `end`/`always` boundaries."""
    own = lines[index].strip().rstrip("\r")
    own_cond = re.match(r"^(?:else\s+)?if\s*\((.*?)\)", own)
    if own_cond:
        return bool(RESET_SIGNALS.search(own_cond.group(1)))
    for j in range(index - 1, max(index - 40, -1), -1):
        text = lines[j].strip().rstrip("\r")
        if not text or text == "begin":
            continue
        if text == "end" or text.startswith("always"):
            return False
        if IF_COND.match(text) or re.match(r"^else\b", text):
            return bool(RESET_SIGNALS.search(text))
        # same-line `if (cond) stmt;` is a statement, not an enclosing block
        # otherwise a sibling statement (e.g. `foo <= 1'b0;`): keep walking up
    return False


def scan_file(rel: str, text: str) -> list[Candidate]:
    lines = text.split("\n")
    out: list[Candidate] = []

    widths: dict[str, tuple[int, int]] = {}
    for m in DECL.finditer(text):
        hi_decl, lo_decl = int(m.group(1)), int(m.group(2))
        for name in m.group(3).split(","):
            name = name.strip().split("=")[0].strip()
            if re.fullmatch(r"[A-Za-z_]\w*", name):
                widths[name] = (hi_decl, lo_decl)

    fsm_states: dict[str, list[str]] = {"c_state": [], "slave_state": []}
    for m in re.finditer(r"parameter\s*\[\d+:\d+\]\s*(\w+)\s*=", text):
        name = m.group(1)
        if name.startswith(("ST_", "idle", "start_", "stop_", "rd_", "wr_")):
            fsm_states["c_state"].append(name)
        elif name.startswith("slave_"):
            fsm_states["slave_state"].append(name)

    after_case = False  # FSM next-state assigns before the case are reset branches

    def add(cand: Candidate | None) -> None:
        if cand is not None:
            out.append(cand)

    for i, raw in enumerate(lines):
        line = raw[:-1] if raw.endswith("\r") else raw
        if ALWAYS_LINE.match(line):
            after_case = False
        if CASE_LINE.search(line):
            after_case = True

        stripped = line.strip()
        if not stripped or COMMENT_LINE.match(line):
            continue

        cond = IF_COND.match(line)

        # --- condition inversion: if (C) -> if (!(C)) -------------------------
        # Reset conditions are excluded: breaking reset is a trivial kill and
        # double negations like !(!nReset) are noise, not semantic bugs.
        if cond and "<=" not in cond.group(2) and "?" not in cond.group(2):
            if not RESET_SIGNALS.search(cond.group(2)):
                head, body, tail = cond.groups()
                sig = re.findall(r"[A-Za-z_]\w*", body)
                add(line_candidate(
                    rel, lines, i, "condition_inversion", sig[0] if sig else "",
                    f"{head}(!({body})){tail}", "suspected_non_equivalent",
                ))

        if CASE_LABEL.match(line):
            continue
        sm = SELF_ASSIGN.match(line)
        if sm and sm.group(1) == sm.group(2):
            continue  # keep-state self assignment carries no logic

        # --- relational swap inside if conditions -----------------------------
        if cond and "<=" not in cond.group(2):
            head, body, tail = cond.groups()
            if not RESET_SIGNALS.search(body):
                for op, alt in (("==", "!="), ("!=", "==")):
                    if op in body:
                        new_body = body.replace(op, alt, 1)
                        sig = re.findall(r"[A-Za-z_]\w*", body)
                        add(line_candidate(
                            rel, lines, i, "relational_swap", sig[0] if sig else "",
                            f"{head}({new_body}){tail}", "suspected_non_equivalent",
                        ))
                        break

        # --- boundary / constant +-1 ------------------------------------------
        # Skip pure reset-value assignments: the register is reloaded before use
        # in normal operation, so those mutants are near-equivalent noise.
        if not in_reset_branch(lines, i):
            matched_const = False
            for regex, base in ((HEX_CONST, 16), (DEC_CONST, 10)):
                cm = regex.search(line)
                if cm and ("<=" in line or "if" in line or "assign" in line):
                    width, value = int(cm.group(1)), int(cm.group(2), base)
                    for delta in (-1, 1):
                        new_value = value + delta
                        if 0 <= new_value < (1 << width):
                            digits = format(new_value, "x") if base == 16 else str(new_value)
                            fmt = f"{width}'{'h' if base == 16 else 'd'}{digits}"
                            sig = re.findall(r"[A-Za-z_]\w*", line.split(cm.group(0))[0])
                            add(line_candidate(
                                rel, lines, i, "boundary_constant",
                                sig[-1] if sig else cm.group(0),
                                line.replace(cm.group(0), fmt, 1),
                                "suspected_non_equivalent",
                            ))
                    matched_const = True
                if matched_const:
                    break

        # --- bit / part-select index +-1 --------------------------------------
        # Bounds checked against parsed declarations; continuous-assign LHS
        # targets are skipped to avoid creating multi-driver nets.
        bm = BIT_SELECT.search(line)
        if bm and "parameter" not in line and not ASSIGN_LHS.match(line):
            name, hi, lo = bm.group(1), int(bm.group(2)), bm.group(3)
            hi_max = widths.get(name, (hi, 0))[0]
            if lo is None:
                for delta in (-1, 1):
                    if 0 <= hi + delta <= hi_max:
                        add(line_candidate(
                            rel, lines, i, "bit_index", name,
                            line.replace(bm.group(0), f"{name}[{hi + delta}]", 1),
                            "suspected_non_equivalent",
                        ))
            else:
                lo_v = int(lo)
                for delta in (-1, 1):
                    if 0 <= lo_v + delta and hi + delta <= hi_max:
                        add(line_candidate(
                            rel, lines, i, "bit_index", name,
                            line.replace(bm.group(0), f"{name}[{hi + delta}:{lo_v + delta}]", 1),
                            "suspected_non_equivalent",
                        ))

        # --- logical operator swap on boolean-looking lines --------------------
        if (
            ("<=" in line or "assign" in line)
            and not cond
            and "?" not in line
            and "[" not in line
            and "{" not in line
            and not CASE_LABEL.match(line)
        ):
            for op, alt in (("&&", "||"), ("||", "&&"), (" & ", " | "), (" | ", " & ")):
                token = f" {op} " if op in ("&&", "||") else op
                if token in line:
                    sig = re.findall(r"[A-Za-z_]\w*", line)
                    add(line_candidate(
                        rel, lines, i, "logical_operator", sig[0] if sig else "",
                        line.replace(token, f" {alt} " if alt in ("&&", "||") else alt, 1),
                        "suspected_non_equivalent",
                    ))
                    break

        # --- protocol condition: flip one negation on detection lines ---------
        if re.search(r"(sta_condition|sto_condition|sda_chk|slave_wait|busy|al)\s*<=", line):
            neg = re.search(r"~\s*([A-Za-z_]\w*)", line)
            if neg and "if" not in line:
                add(line_candidate(
                    rel, lines, i, "protocol_condition", neg.group(1),
                    line.replace(neg.group(0), neg.group(1), 1),
                    "suspected_non_equivalent",
                ))

        # --- FSM next-state redirect (main case body only, not reset branches) --
        fm = FSM_ASSIGN.match(line)
        if fm and after_case:
            head, state, tail = fm.groups()
            reg = "c_state" if "c_state" in head else "slave_state"
            for alt_state in fsm_states[reg]:
                if alt_state != state:
                    add(line_candidate(
                        rel, lines, i, "fsm_transition", state,
                        f"{head}{alt_state}{tail}", "suspected_non_equivalent",
                    ))

        # --- datapath shift/concat direction reversal --------------------------
        # True mirror: {sig[hi:lo], b} -> {b, sig[max:max-(hi-lo)]} using the
        # declared width, so the mutated concat keeps both width and content
        # width — a genuine shift-direction bug, not a partial register freeze.
        cm = re.search(
            r"\{\s*([A-Za-z_]\w*)\[(\d+)(?::(\d+))?\]\s*,\s*([A-Za-z_]\w*)\s*\}", line
        )
        if cm and "<=" in line:
            name, hi_s, lo_s, right = cm.groups()
            hi_v = int(hi_s)
            decl = widths.get(name)
            if decl is not None:
                top = decl[0]
                if lo_s is None:
                    mirror = f"{name}[{top}]"
                else:
                    lo_v = int(lo_s)
                    mirror = f"{name}[{top}:{top - (hi_v - lo_v)}]"
                swapped = line.replace(cm.group(0), f"{{{right}, {mirror}}}", 1)
                add(line_candidate(
                    rel, lines, i, "datapath_shift", name,
                    swapped, "suspected_non_equivalent",
                ))

    # Deduplicate identical (file, line, mutated_line) keeping first operator tag.
    seen: set[tuple[str, int, str]] = set()
    unique: list[Candidate] = []
    for cand in out:
        key = (cand.file, cand.line, cand.mutated_line)
        if key not in seen:
            seen.add(key)
            unique.append(cand)
    return unique


# ---------------------------------------------------------------------------
# Selection (deterministic, seed=42) + validation
# ---------------------------------------------------------------------------

# (operator, module, quota) buckets, processed in order; quotas sum to 30.
QUOTAS: list[tuple[str, str, int]] = [
    ("condition_inversion", "i2c_master_bit_ctrl", 3),
    ("condition_inversion", "i2c_master_byte_ctrl", 2),
    ("condition_inversion", "TopModule", 1),
    ("relational_swap", "i2c_master_bit_ctrl", 1),
    ("boundary_constant", "i2c_master_bit_ctrl", 2),
    ("boundary_constant", "i2c_master_byte_ctrl", 2),
    ("boundary_constant", "TopModule", 1),
    ("bit_index", "i2c_master_bit_ctrl", 2),
    ("bit_index", "i2c_master_byte_ctrl", 1),
    ("bit_index", "TopModule", 1),
    ("logical_operator", "i2c_master_bit_ctrl", 2),
    ("logical_operator", "i2c_master_byte_ctrl", 1),
    ("logical_operator", "TopModule", 1),
    ("protocol_condition", "i2c_master_bit_ctrl", 3),
    ("fsm_transition", "i2c_master_bit_ctrl", 2),
    ("fsm_transition", "i2c_master_byte_ctrl", 3),
    ("datapath_shift", "i2c_master_bit_ctrl", 1),
    ("datapath_shift", "i2c_master_byte_ctrl", 1),
]

MAX_PER_SIGNAL = 3


def apply_mutant(golden: dict[str, str], cand: Candidate) -> dict[str, str]:
    mutated = dict(golden)
    lines = golden[cand.file].split("\n")
    assert lines[cand.line - 1] == cand.original_line, f"anchor mismatch: {cand.cid}"
    lines[cand.line - 1] = cand.mutated_line
    mutated[cand.file] = "\n".join(lines)
    return mutated


def verilator_validate(
    files: dict[str, str], support: dict[str, str], work: Path, env: dict[str, str], exe: str
) -> tuple[bool, str]:
    for rel, text in {**support, **files}.items():
        target = work / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8", newline="")
    sources = [
        "dut/i2c_master_bit_ctrl.v",
        "dut/i2c_master_byte_ctrl.v",
        "dut/i2c_master_defines.v",
        "dut/i2c_master_top.v",
        "i2c_slave_model.v",
        "wb_master_model.v",
        "tb.sv",
        "checker.sv",
    ]
    cmd = [
        exe,
        "--lint-only",
        "--timing",
        "-Wno-fatal",
        "--top-module",
        "tb",
        "-Idut",
        *sources,
    ]
    proc = subprocess.run(
        cmd, cwd=work, env=env, capture_output=True, text=True, timeout=120
    )
    output = (proc.stderr or "") + (proc.stdout or "")
    return proc.returncode == 0, output[-2000:]


def unified_patch(rel: str, original: str, mutated: str) -> str:
    diff = difflib.unified_diff(
        original.split("\n"),
        mutated.split("\n"),
        fromfile=f"a/rtl/{rel}",
        tofile=f"b/rtl/{rel}",
        lineterm="",
        n=3,
    )
    return "\n".join(diff) + "\n"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--workspace-rtl", type=Path, default=DEFAULT_WORKSPACE_RTL)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--verilator", default=os.environ.get("RTL_AGENT_VERILATOR_EXECUTABLE", DEFAULT_VERILATOR))
    parser.add_argument("--skip-validation", action="store_true")
    args = parser.parse_args()

    out: Path = args.out.resolve()
    # This path can contain other frozen suites. Never replace an existing output,
    # including a dangling symlink, and fail before source reads or compilation.
    if args.out.is_symlink() or out.exists():
        raise SystemExit(f"OUTPUT_ALREADY_EXISTS: {args.out}")

    golden = load_golden_dut(args.dataset)
    support = verify_support_files(args.workspace_rtl)
    print(f"golden DUT verified ({len(golden)} files), support files verified")

    candidates: list[Candidate] = []
    for rel in DUT_FILES:
        candidates.extend(scan_file(rel, golden[rel]))
    candidates.sort(key=lambda c: (c.file, c.line, c.operator, c.mutated_line))
    print(f"candidate pool: {len(candidates)}")

    env = dict(os.environ)
    env["VERILATOR_ROOT"] = env.get("VERILATOR_ROOT", DEFAULT_VERILATOR_ROOT)
    msys_bin = str(Path(args.verilator).parent)
    env["PATH"] = msys_bin + os.pathsep + env.get("PATH", "")

    rng = random.Random(SEED)
    buckets: dict[tuple[str, str], list[Candidate]] = {}
    for cand in candidates:
        buckets.setdefault((cand.operator, cand.module), []).append(cand)
    for key in buckets:
        rng.shuffle(buckets[key])

    decisions: list[dict] = []
    invalid: list[dict] = []
    final: list[Candidate] = []
    signal_count: dict[str, int] = {}
    used_lines: set[tuple[str, int]] = set()

    with tempfile.TemporaryDirectory(prefix="i2c-mutants-") as tmp:
        tmp_path = Path(tmp)
        if not args.skip_validation:
            ok, log = verilator_validate(golden, support, tmp_path / "golden", env, args.verilator)
            if not ok:
                raise SystemExit(f"GOLDEN_COMPILE_FAILED:\n{log}")
            print("golden compile sanity: PASS")

        for operator, module, quota in QUOTAS:
            pool = buckets.get((operator, module), [])
            chosen = 0
            for cand in pool:
                if chosen >= quota:
                    break
                entry = {"bucket": f"{operator}/{module}", "cid": cand.cid}
                if (cand.file, cand.line) in used_lines:
                    decisions.append({**entry, "picked": False, "reason": "line_already_used"})
                    continue
                if signal_count.get(cand.related_signal, 0) >= MAX_PER_SIGNAL:
                    decisions.append({**entry, "picked": False, "reason": "signal_cap"})
                    continue
                if args.skip_validation:
                    ok, log = True, ""
                else:
                    work = tmp_path / f"cand_{len(decisions)}"
                    work.mkdir(parents=True)
                    ok, log = verilator_validate(
                        apply_mutant(golden, cand), support, work, env, args.verilator
                    )
                if not ok:
                    decisions.append({**entry, "picked": False, "reason": "compile_invalid"})
                    invalid.append({"cid": cand.cid, "log_tail": log[-400:]})
                    print(f"INVALID: {cand.cid}")
                    continue
                final.append(cand)
                chosen += 1
                used_lines.add((cand.file, cand.line))
                signal_count[cand.related_signal] = signal_count.get(cand.related_signal, 0) + 1
                decisions.append({**entry, "picked": True})
            if chosen < quota:
                print(f"WARNING: bucket {operator}/{module} short: {chosen}/{quota}")

    if len(final) != TARGET_MUTANTS:
        raise SystemExit(f"only {len(final)} valid mutants; need {TARGET_MUTANTS}")

    # The exclusive mkdir also catches a directory created since preflight.
    out.mkdir(parents=True, exist_ok=False)
    (out / "mutants").mkdir()

    manifest_mutants = []
    operator_dist: dict[str, int] = {}
    for idx, cand in enumerate(final, start=1):
        mid = f"M{idx:03d}"
        files = apply_mutant(golden, cand)
        patch = unified_patch(cand.file, golden[cand.file], files[cand.file])
        (out / "mutants" / f"{mid}.patch").write_text(patch, encoding="utf-8", newline="\n")
        operator_dist[cand.operator] = operator_dist.get(cand.operator, 0) + 1
        manifest_mutants.append({
            "id": mid,
            "file": f"rtl/{cand.file}",
            "module": cand.module,
            "line": cand.line,
            "operator": cand.operator,
            "related_signal": cand.related_signal,
            "original": cand.original,
            "mutated": cand.mutated,
            "compile": "NOT_RUN" if args.skip_validation else "PASS",
            "equivalence": cand.equivalence,
        })

    golden_digests = {f"rtl/{rel}": f"sha256:{sha256_text(text)}" for rel, text in sorted(golden.items())}
    manifest = {
        "version": VERSION,
        "seed": SEED,
        "golden_commit": GOLDEN_COMMIT,
        "golden_digests": golden_digests,
        "support_digests": {
            f"rtl/{k}": f"sha256:{v}"
            for k, v in sorted(WORKSPACE_DIGESTS.items())
            if not k.startswith("dut/")
        },
        "mutants": manifest_mutants,
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (out / "candidates.json").write_text(
        json.dumps([c.__dict__ for c in candidates], indent=2) + "\n", encoding="utf-8"
    )
    (out / "selection.json").write_text(
        json.dumps(
            {
                "seed": SEED,
                "quotas": [list(q) for q in QUOTAS],
                "maxPerSignal": MAX_PER_SIGNAL,
                "decisions": decisions,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    review = [m for m in manifest_mutants if m["equivalence"] == "needs_review"]
    summary = [
        f"# {VERSION} summary",
        "",
        f"Generated candidates: {len(candidates)}",
        f"Compile-valid selected: {0 if args.skip_validation else len(final)}",
        f"Compile-invalid (replaced): {len(invalid)}",
        "Duplicates removed: exact-duplicate mutated lines deduplicated at scan time",
        f"Equivalent/suspected equivalent: none auto-proven; {len(review)} flagged needs_review",
        (f"Unvalidated selected mutants: {len(final)} (compile validation skipped)"
         if args.skip_validation else f"Final valid mutants: {len(final)}"),
        "",
        "## Operator distribution",
        "",
    ]
    for op, count in sorted(operator_dist.items()):
        summary.append(f"{op:<22} {count}")
    summary += ["", "## Mutants", ""]
    for m in manifest_mutants:
        summary.append(
            f"- {m['id']} {m['module']}:{m['line']} [{m['operator']}] "
            f"`{m['original']}` -> `{m['mutated']}` ({m['equivalence']})"
        )
    summary += ["", "## Needs human review", ""]
    if review:
        for m in review:
            summary.append(f"- {m['id']} {m['module']}:{m['line']} `{m['original']}` -> `{m['mutated']}`")
    else:
        summary.append("- none flagged; note non-equivalence is heuristic, not formally proven")
    (out / "summary.md").write_text("\n".join(summary) + "\n", encoding="utf-8")

    print(f"wrote {out} with {len(final)} mutants; {len(review)} need human review")
    return 0


if __name__ == "__main__":
    sys.exit(main())
