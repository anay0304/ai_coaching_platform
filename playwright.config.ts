import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration.
 *
 * Tests run against:
 *   - Local dev server (default): set PLAYWRIGHT_BASE_URL=http://localhost:3000
 *     and ensure `npm run dev` is running, OR let webServer start it automatically.
 *   - Deployed Worker: set PLAYWRIGHT_BASE_URL=https://ai-coaching-platform.apradh25.workers.dev
 *
 * Tests that create real users (22.5, 22.6) use a unique timestamp-based email
 * so each run is isolated and does not conflict with prior runs.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // run sequentially — tests share a real database
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    // Give SSE streams and AI responses enough time to complete
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Start Next.js dev server automatically when running locally
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
