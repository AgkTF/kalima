import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    globalSetup: ["src/__tests__/globalSetup.ts"],
    setupFiles: ["src/__tests__/setup.ts"],
    // Default: run unit tests only (exclude integration)
    exclude: process.env.INTEGRATION
      ? ["**/node_modules/**", "**/dist/**"]
      : ["**/node_modules/**", "**/dist/**", "**/*.integration.test.ts"],
  },
});