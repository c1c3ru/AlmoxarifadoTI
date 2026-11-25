import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/integration",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/integration" }]],
  outputDir: "test-results/integration",
  use: {
    baseURL: "http://127.0.0.1:4174",
    browserName: "chromium",
    viewport: { width: 1366, height: 768 },
    locale: "pt-BR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    serviceWorkers: "block",
  },
  webServer: {
    command: "npx tsx tests/integration/server.ts",
    url: "http://127.0.0.1:4174/login",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
