import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/test/**/*.test.ts", "apps/*/test/**/*.test.ts", "tests/**/*.test.ts"],
    globalSetup: ["./tests/setup/global-setup.ts"],
    setupFiles: ["./tests/setup/env.ts"],
    // Integration tests share one Postgres database; run files serially for determinism.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
