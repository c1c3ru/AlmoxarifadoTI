import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : 4,
  timeout: 30_000,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/ui" }]],
  outputDir: "test-results/ui",
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1366, height: 768 },
    locale: "pt-BR",
    timezoneId: "America/Fortaleza",
    reducedMotion: "reduce",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" }, testMatch: /smoke\.spec\.ts/ },
    { name: "webkit", use: { browserName: "webkit" }, testMatch: /smoke\.spec\.ts/ },
  ],
  webServer: {
    command: "npx tsx tests/e2e/server.ts",
    url: "http://127.0.0.1:4173/login",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
