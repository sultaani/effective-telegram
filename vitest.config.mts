import { defineConfig } from "vitest/config";
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: { include: ["tests/**/*.test.ts"], pool: "forks", fileParallelism: false, testTimeout: 30000 },
} as never);
