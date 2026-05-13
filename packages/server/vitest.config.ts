import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    // Default: run unit tests only (exclude integration)
    exclude: process.env.INTEGRATION
      ? ["**/node_modules/**", "**/dist/**"]
      : ["**/node_modules/**", "**/dist/**", "**/*.integration.test.ts"],
  },
});