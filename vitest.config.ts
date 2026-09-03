import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./apps/web/src", import.meta.url)),
    },
  },
  test: {
    environmentMatchGlobs: [["apps/web/**/*.test.tsx", "jsdom"]],
    setupFiles: ["./apps/web/src/test/setup.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
    include: ["apps/**/*.test.{ts,tsx}", "packages/**/*.test.ts"],
  },
});
