export function simulationVerdict(
  result: {
    exitCode: number | null;
    error: string | null;
    stdout: string;
    stderr: string;
  },
  passMarker = "GOLDEN_PASS versatile-fifo",
): "timeout" | "infrastructure-error" | "killed" | "survived" | "output-invalid" {
  if (result.error?.includes("ETIMEDOUT")) return "timeout";
  if (result.error) return "infrastructure-error";
  if (result.exitCode !== 0) {
    return /Assertion failed|\$fatal|%Error:.*Assertion/i.test(result.stdout + result.stderr)
      ? "killed"
      : "infrastructure-error";
  }
  return result.stdout.includes(passMarker) ? "survived" : "output-invalid";
}
