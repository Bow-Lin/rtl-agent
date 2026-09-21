import { createHash } from "node:crypto";

export const sha = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");
export function coveragePoints(
  raw: string,
  files: string[],
): Record<string, { hit: number; total: number }> {
  const groups: Record<string, { hit: number; total: number }> = {};
  for (const line of raw.replace(/\r\n?/g, "\n").split("\n")) {
    const match = /^C '(.*)' (\d+)$/.exec(line);
    if (!match) continue;
    const metadata = Object.fromEntries(
      match[1]!
        .split("\x01")
        .filter(Boolean)
        .map((s) => s.split("\x02")),
    );
    if (!files.includes((metadata.f ?? "").replace(/\\/g, "/"))) continue;
    const type = metadata.t ?? "unknown";
    const item = (groups[type] ??= { hit: 0, total: 0 });
    item.total++;
    if (Number(match[2]) > 0) item.hit++;
  }
  if (!Object.keys(groups).length) throw new Error("NO_DUT_COVERAGE_POINTS");
  return groups;
}
export interface Candidate {
  line: number;
  column: number;
  operator: string;
  before: string;
  after: string;
  originalLine: string;
  mutatedLine: string;
  rank: string;
}

// Lexical mutation on explicitly reviewed executable line ranges only. Never infer
// equivalence or reachability from compilation. No coverage or simulation input.
export function candidates(
  source: string,
  ranges: [number, number][],
  seed = 42,
  expanded = false,
): Candidate[] {
  const result: Candidate[] = [];
  const rules: [string, RegExp, (token: string) => string][] = [
    [
      "comparison",
      /===|!==|==|!=/g,
      (s) => (s.startsWith("!") ? s.replace("!", "=") : "!" + s.slice(1)),
    ],
    [
      "boolean",
      /&&|\|\||(?<![&])&(?![&])|(?<![|])\|(?![|])|\^/g,
      (s) => ({ "&&": "||", "||": "&&", "&": "|", "|": "&", "^": "|" })[s]!,
    ],
    ["increment", /(?<=\s)\+(?=\s)|(?<=\s)-(?=\s)/g, (s) => (s === "+" ? "-" : "+")],
    ["polarity", /[!~](?!=)/g, () => ""],
    ["bit_constant", /1'b[01]/g, (s) => (s === "1'b0" ? "1'b1" : "1'b0")],
  ];
  if (expanded)
    rules.push(
      ["enable_inversion", /(?<=\bif\s*\()[a-zA-Z_]\w*(?=\s*\))/g, (s) => `!${s}`],
      ["reset_offset", /(?<=<=\s*)0(?=\s*;)/g, () => "1"],
      ["transfer_lsb", /(?<=<=\s*)[a-zA-Z_]\w*(?:\[[^;]+\])?(?=\s*;)/g, (s) => `(${s}) ^ 1'b1`],
    );
  for (const [index, line] of source.split("\n").entries()) {
    if (!ranges.some(([a, b]) => index + 1 >= a && index + 1 <= b)) continue;
    const code = line.split("//")[0]!;
    if (
      (!/\b(assign|if|else)\b|<=/.test(code) && !(expanded && /\bwire\b.*=/.test(code))) ||
      /^\s*`/.test(code)
    )
      continue;
    for (const [operator, regex, replace] of rules) {
      for (const match of code.matchAll(regex)) {
        const column = match.index;
        const after = replace(match[0]);
        const mutatedLine = line.slice(0, column) + after + line.slice(column + match[0].length);
        result.push({
          line: index + 1,
          column: column + 1,
          operator,
          before: match[0],
          after,
          originalLine: line,
          mutatedLine,
          rank: sha(`${seed}:${index + 1}:${column}:${operator}:${after}`),
        });
      }
    }
  }
  // Round-robin operator strata avoid one prolific operator monopolizing selection.
  const groups = rules.map(([name]) =>
    result.filter((c) => c.operator === name).sort((a, b) => a.rank.localeCompare(b.rank)),
  );
  const ordered: Candidate[] = [];
  while (groups.some((g) => g.length))
    for (const group of groups) {
      const c = group.shift();
      if (c) ordered.push(c);
    }
  return ordered;
}

export function applyCandidate(source: string, c: Candidate): string {
  const lines = source.split("\n");
  if (lines[c.line - 1] !== c.originalLine) throw new Error("SOURCE_LINE_MISMATCH");
  lines[c.line - 1] = c.mutatedLine;
  return lines.join("\n");
}

export function patchFor(file: string, c: Candidate): string {
  return `--- a/${file}\n+++ b/${file}\n@@ -${c.line},1 +${c.line},1 @@\n-${c.originalLine.replace(/\r$/, "")}\n+${c.mutatedLine.replace(/\r$/, "")}\n`;
}
