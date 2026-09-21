"""Offline generator safety and evidence regression tests; never starts RTL tools."""

import contextlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch


MODULE_PATH = Path(__file__).with_name("generate_i2c_mutants.py")
SPEC = importlib.util.spec_from_file_location("generate_i2c_mutants", MODULE_PATH)
generator = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = generator
SPEC.loader.exec_module(generator)


class GeneratorSafetyTests(unittest.TestCase):
    def test_existing_output_is_preserved_before_reading_sources(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "mutation"
            output.mkdir()
            sentinel = output / "retained-suite.json"
            sentinel.write_bytes(b"existing frozen suite\n")
            with (
                patch.object(sys, "argv", ["generate", "--out", str(output)]),
                patch.object(generator, "load_golden_dut") as load,
                patch.object(generator, "verilator_validate") as validate,
            ):
                with self.assertRaisesRegex(SystemExit, "OUTPUT_ALREADY_EXISTS"):
                    generator.main()
                load.assert_not_called()
                validate.assert_not_called()
            self.assertEqual(sentinel.read_bytes(), b"existing frozen suite\n")
            self.assertEqual(list(output.iterdir()), [sentinel])

    def generate_fixture(self, output, skip_validation):
        source = "assign flag = 1'b0;\n"
        candidate = generator.Candidate(
            cid="fixture", file="dut/i2c_master_top.v", module="TopModule", line=1,
            operator="bit_constant", related_signal="flag", original="1'b0",
            mutated="1'b1", original_line="assign flag = 1'b0;",
            mutated_line="assign flag = 1'b1;", equivalence="needs_review",
        )
        argv = ["generate", "--out", str(output)]
        if skip_validation:
            argv.append("--skip-validation")
        with (
            patch.object(sys, "argv", argv),
            patch.object(generator, "load_golden_dut", return_value={candidate.file: source}),
            patch.object(generator, "verify_support_files", return_value={}),
            patch.object(generator, "scan_file", return_value=[candidate]),
            patch.object(generator, "DUT_FILES", [candidate.file]),
            patch.object(generator, "QUOTAS", [(candidate.operator, candidate.module, 1)]),
            patch.object(generator, "TARGET_MUTANTS", 1),
            patch.object(generator, "verilator_validate", return_value=(True, "")) as validate,
            contextlib.redirect_stdout(io.StringIO()),
        ):
            self.assertEqual(generator.main(), 0)
            self.assertEqual(validate.call_count, 0 if skip_validation else 2)
        return (
            json.loads((output / "manifest.json").read_text(encoding="utf-8")),
            (output / "summary.md").read_text(encoding="utf-8"),
        )

    def test_skipped_validation_never_publishes_compile_pass(self):
        with tempfile.TemporaryDirectory() as temporary:
            manifest, summary = self.generate_fixture(Path(temporary) / "output", True)
            self.assertEqual(manifest["mutants"][0]["compile"], "NOT_RUN")
            self.assertIn("Compile-valid selected: 0", summary)
            self.assertIn("Unvalidated selected mutants: 1", summary)
            self.assertNotIn("Final valid mutants:", summary)

    def test_successful_validation_retains_the_compile_pass_contract(self):
        with tempfile.TemporaryDirectory() as temporary:
            manifest, summary = self.generate_fixture(Path(temporary) / "output", False)
            self.assertEqual(manifest["mutants"][0]["compile"], "PASS")
            self.assertIn("Compile-valid selected: 1", summary)
            self.assertIn("Final valid mutants: 1", summary)


if __name__ == "__main__":
    unittest.main()
