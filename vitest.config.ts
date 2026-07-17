import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["apps/**/test/**/*.test.ts", "packages/**/test/**/*.test.ts"],
    exclude: ["**/dist/**", "**/node_modules/**", "**/*.integration.test.ts"],
    testTimeout: 15_000,
  },
});
