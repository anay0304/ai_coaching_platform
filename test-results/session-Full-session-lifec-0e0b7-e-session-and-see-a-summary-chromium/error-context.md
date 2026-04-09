# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: session.spec.ts >> Full session lifecycle (22.6) >> user can start a session, send a message, receive an AI response, end the session, and see a summary
- Location: e2e\session.spec.ts:27:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/dashboard/
Received string:  "http://localhost:3000/"
Timeout: 15000ms

Call log:
  - Expect "toHaveURL" with timeout 15000ms
    18 × unexpected value "http://localhost:3000/"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "NutriCoach" [level=1] [ref=e5]
      - paragraph [ref=e6]: AI-powered nutrition coaching for sustainable habit change
    - generic [ref=e7]:
      - generic [ref=e8]:
        - button "Log In" [ref=e9]
        - button "Sign Up" [ref=e10]
      - alert [ref=e11]: Invalid email or password. Please try again.
      - generic [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]: Email
          - textbox "Email" [ref=e15]:
            - /placeholder: you@example.com
            - text: demo@nutricoach.app
        - generic [ref=e16]:
          - generic [ref=e17]: Password
          - textbox "Password" [ref=e18]:
            - /placeholder: ••••••••
            - text: demo1234
        - button "Log In" [ref=e19]
    - generic [ref=e20]:
      - paragraph [ref=e21]: Try the demo
      - paragraph [ref=e22]: Shared account — data may be reset at any time. No sign-up needed.
      - generic [ref=e23]:
        - generic [ref=e24]:
          - term [ref=e25]: Email
          - definition [ref=e26]: demo@nutricoach.app
        - generic [ref=e27]:
          - term [ref=e28]: Password
          - definition [ref=e29]: demo1234
      - button "Log In as Demo User" [ref=e30]
  - button "Open Next.js Dev Tools" [ref=e36] [cursor=pointer]:
    - img [ref=e37]
  - alert [ref=e40]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | /**
  4  |  * E2E 22.6 — Full session lifecycle
  5  |  *
  6  |  * User (demo account) → start session → send message → receive AI response
  7  |  * → end session → view summary on dashboard.
  8  |  *
  9  |  * Uses the demo account so no sign-up is needed and the user always exists.
  10 |  * AI responses are real (hits OpenAI) — the test waits for the stream to
  11 |  * finish rather than asserting specific content.
  12 |  */
  13 | 
  14 | const DEMO_EMAIL = "demo@nutricoach.app";
  15 | const DEMO_PASSWORD = "demo1234";
  16 | 
  17 | test.describe("Full session lifecycle (22.6)", () => {
  18 |   test.beforeEach(async ({ page }) => {
  19 |     // Log in as the demo user before each test in this suite
  20 |     await page.goto("/");
  21 |     await page.getByLabel(/email/i).fill(DEMO_EMAIL);
  22 |     await page.getByLabel(/password/i).fill(DEMO_PASSWORD);
  23 |     await page.locator('button[type="submit"]').click();
> 24 |     await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  25 |   });
  26 | 
  27 |   test("user can start a session, send a message, receive an AI response, end the session, and see a summary", async ({
  28 |     page,
  29 |   }) => {
  30 |     // ── 1. Navigate to the coaching page ─────────────────────────────────────
  31 |     await page.getByRole("link", { name: /coaching/i }).click();
  32 |     await expect(page).toHaveURL(/\/coaching/);
  33 | 
  34 |     // ── 2. Start a new session ────────────────────────────────────────────────
  35 |     await page.getByRole("button", { name: /start.*session|new.*session/i }).click();
  36 | 
  37 |     // Should land on a specific session page
  38 |     await expect(page).toHaveURL(/\/coaching\/.+/, { timeout: 10_000 });
  39 | 
  40 |     // ── 3. Send a message ─────────────────────────────────────────────────────
  41 |     const messageInput = page.getByRole("textbox", { name: /message|type/i });
  42 |     await expect(messageInput).toBeVisible();
  43 |     await messageInput.fill("I struggle to eat breakfast in the mornings.");
  44 |     await page.getByRole("button", { name: /send/i }).click();
  45 | 
  46 |     // The user's message should appear in the chat
  47 |     await expect(
  48 |       page.getByText("I struggle to eat breakfast in the mornings.")
  49 |     ).toBeVisible();
  50 | 
  51 |     // ── 4. Wait for the AI response ───────────────────────────────────────────
  52 |     // The streaming indicator (three animated dots) appears while AI is typing.
  53 |     // Wait for it to disappear — meaning the stream has finished.
  54 |     await expect(page.locator(".animate-bounce").first()).toBeHidden({
  55 |       timeout: 30_000,
  56 |     });
  57 | 
  58 |     // At least one assistant bubble should now be visible
  59 |     const assistantBubble = page.locator('[data-role="assistant"]').or(
  60 |       page.locator(".bg-zinc-100, .bg-white").filter({ hasText: /[a-z]/i }).last()
  61 |     );
  62 |     await expect(assistantBubble).toBeVisible({ timeout: 30_000 });
  63 | 
  64 |     // ── 5. End the session ────────────────────────────────────────────────────
  65 |     await page.getByRole("button", { name: /end session/i }).click();
  66 | 
  67 |     // A summary card should appear in the chat area
  68 |     await expect(
  69 |       page.getByText(/next.*steps|next action/i)
  70 |     ).toBeVisible({ timeout: 30_000 });
  71 | 
  72 |     // ── 6. Go to dashboard and confirm session appears ────────────────────────
  73 |     await page.getByRole("link", { name: /dashboard/i }).click();
  74 |     await expect(page).toHaveURL(/\/dashboard/);
  75 | 
  76 |     // The completed session should be reflected on the dashboard
  77 |     // (either a session count increment or the session appearing in the list)
  78 |     await expect(page.getByText(/completed/i)).toBeVisible({ timeout: 10_000 });
  79 |   });
  80 | });
  81 | 
```