import { test, expect } from "@playwright/test";

/**
 * E2E 22.6 — Full session lifecycle
 *
 * User (demo account) → start session → send message → receive AI response
 * → end session → view summary on dashboard.
 *
 * Uses the demo account so no sign-up is needed and the user always exists.
 * AI responses are real (hits OpenAI) — the test waits for the stream to
 * finish rather than asserting specific content.
 */

const DEMO_EMAIL = "demo@nutricoach.app";
const DEMO_PASSWORD = "demo1234";

test.describe("Full session lifecycle (22.6)", () => {
  test.beforeEach(async ({ page }) => {
    // Log in as the demo user before each test in this suite
    await page.goto("/");
    await page.getByLabel(/email/i).fill(DEMO_EMAIL);
    await page.getByLabel(/password/i).fill(DEMO_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  test("user can start a session, send a message, receive an AI response, end the session, and see a summary", async ({
    page,
  }) => {
    // ── 1. Navigate to the coaching page ─────────────────────────────────────
    await page.getByRole("link", { name: /coaching/i }).click();
    await expect(page).toHaveURL(/\/coaching/);

    // ── 2. Start a new session ────────────────────────────────────────────────
    await page.getByRole("button", { name: /start.*session|new.*session/i }).click();

    // Should land on a specific session page
    await expect(page).toHaveURL(/\/coaching\/.+/, { timeout: 10_000 });

    // ── 3. Send a message ─────────────────────────────────────────────────────
    const messageInput = page.getByRole("textbox", { name: /message|type/i });
    await expect(messageInput).toBeVisible();
    await messageInput.fill("I struggle to eat breakfast in the mornings.");
    await page.getByRole("button", { name: /send/i }).click();

    // The user's message should appear in the chat
    await expect(
      page.getByText("I struggle to eat breakfast in the mornings.")
    ).toBeVisible();

    // ── 4. Wait for the AI response ───────────────────────────────────────────
    // The streaming indicator (three animated dots) appears while AI is typing.
    // Wait for it to disappear — meaning the stream has finished.
    await expect(page.locator(".animate-bounce").first()).toBeHidden({
      timeout: 30_000,
    });

    // At least one assistant bubble should now be visible
    const assistantBubble = page.locator('[data-role="assistant"]').or(
      page.locator(".bg-zinc-100, .bg-white").filter({ hasText: /[a-z]/i }).last()
    );
    await expect(assistantBubble).toBeVisible({ timeout: 30_000 });

    // ── 5. End the session ────────────────────────────────────────────────────
    await page.getByRole("button", { name: /end session/i }).click();

    // A summary card should appear in the chat area
    await expect(
      page.getByText(/next.*steps|next action/i)
    ).toBeVisible({ timeout: 30_000 });

    // ── 6. Go to dashboard and confirm session appears ────────────────────────
    await page.getByRole("link", { name: /dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // The completed session should be reflected on the dashboard
    // (either a session count increment or the session appearing in the list)
    await expect(page.getByText(/completed/i)).toBeVisible({ timeout: 10_000 });
  });
});
