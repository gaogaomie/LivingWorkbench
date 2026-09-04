import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./desktop-e2e",
  outputDir: "../desktop/test-results",
  workers: 1,
  timeout: 60_000,
  reporter: "list",
});
