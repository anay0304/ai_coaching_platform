import { test, expect } from "@playwright/test";

/**
 * E2E 22.5 — Guest → sign up → dashboard redirect
 *
 * A visitor who has never logged in should be able to create a new account
 * from the landing page and land on /dashboard automatically.
 *
 * A unique email is generated per run so each test run creates a fresh user
 * and does not collide with previous runs.
 */

test.describe("Sign-up flow (22.5)", () => {
  test("new visitor can sign up and is redirected to /dashboard", async ({ page }) => {
    const uniqueEmail = `test+${Date.now()}@playwright.test`;
    const password = "Playwright123!";

    // ── 1. Land on the public home page ──────────────────────────────────────
    await page.goto("/");
    await expect(page).toHaveTitle(/NutriCoach/i);

    // The login form is visible by default (email input is shown)
    await expect(page.getByLabel(/email/i)).toBeVisible();

    // ── 2. Switch to the Sign Up tab ─────────────────────────────────────────
    await page.getByRole("button", { name: /sign up/i }).click();

    // Sign-up form fields should now be visible
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // ── 3. Fill in credentials ────────────────────────────────────────────────
    await page.getByLabel(/email/i).fill(uniqueEmail);
    await page.getByLabel(/password/i).fill(password);

    // ── 4. Submit and wait for redirect ──────────────────────────────────────
    await page.getByRole("button", { name: /create account/i }).click();

    // After successful sign-up + auto-login, the app redirects to /dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  test("sign-up form shows an error for a duplicate email", async ({ page }) => {
    // The demo account email is always in the database (seeded)
    await page.goto("/");
    await page.getByRole("button", { name: /sign up/i }).click();

    await page.getByLabel(/email/i).fill("demo@nutricoach.app");
    await page.getByLabel(/password/i).fill("somepassword");
    await page.getByRole("button", { name: /create account/i }).click();

    // An error message should appear — do not redirect
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
    await expect(page).not.toHaveURL(/\/dashboard/);
  });
});
