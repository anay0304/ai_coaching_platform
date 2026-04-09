import { test, expect } from "@playwright/test";

/**
 * E2E 22.7 — Demo login flow
 *
 * The landing page prominently shows the demo account credentials and a
 * "Log In as Demo User" shortcut button. This test covers both paths:
 *   a) using the shortcut button
 *   b) manually entering the displayed credentials
 *
 * The demo account is always present (seeded via prisma/seed.ts) so these
 * tests are safe to run against any environment.
 */

const DEMO_EMAIL = "demo@nutricoach.app";
const DEMO_PASSWORD = "demo1234";

test.describe("Demo login flow (22.7)", () => {
  test("shortcut button logs in as demo user and redirects to /dashboard", async ({ page }) => {
    await page.goto("/");

    // The amber demo section must be visible with credentials displayed
    await expect(page.getByText(DEMO_EMAIL)).toBeVisible();
    await expect(page.getByText(DEMO_PASSWORD)).toBeVisible();

    // Click the one-tap demo login button
    await page.getByRole("button", { name: /log in as demo/i }).click();

    // Should land on the dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  test("manually entering demo credentials also logs in successfully", async ({ page }) => {
    await page.goto("/");

    // Fill the login form with the demo credentials shown on the page
    await page.getByLabel(/email/i).fill(DEMO_EMAIL);
    await page.getByLabel(/password/i).fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: /^log in$/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  test("demo user sees the DemoNotice banner after logging in", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /log in as demo/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    // The amber DemoNotice banner must be visible in the authenticated layout
    await expect(page.getByRole("status")).toBeVisible();
  });

  test("wrong password shows an error and stays on the landing page", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/email/i).fill(DEMO_EMAIL);
    await page.getByLabel(/password/i).fill("wrong-password");
    await page.getByRole("button", { name: /^log in$/i }).click();

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
    await expect(page).not.toHaveURL(/\/dashboard/);
  });
});
