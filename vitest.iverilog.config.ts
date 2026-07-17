import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/core-loop/test/iverilog.integration.test.ts",
      "packages/core-loop/test/r04-iverilog.integration.test.ts",
    ],
    exclude: ["**/dist/**", "**/node_modules/**"],
  },
});
