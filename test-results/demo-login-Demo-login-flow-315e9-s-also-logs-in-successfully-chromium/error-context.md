# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demo-login.spec.ts >> Demo login flow (22.7) >> manually entering demo credentials also logs in successfully
- Location: e2e\demo-login.spec.ts:33:7

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
  4  |  * E2E 22.7 — Demo login flow
  5  |  *
  6  |  * The landing page prominently shows the demo account credentials and a
  7  |  * "Log In as Demo User" shortcut button. This test covers both paths:
  8  |  *   a) using the shortcut button
  9  |  *   b) manually entering the displayed credentials
  10 |  *
  11 |  * The demo account is always present (seeded via prisma/seed.ts) so these
  12 |  * tests are safe to run against any environment.
  13 |  */
  14 | 
  15 | const DEMO_EMAIL = "demo@nutricoach.app";
  16 | const DEMO_PASSWORD = "demo1234";
  17 | 
  18 | test.describe("Demo login flow (22.7)", () => {
  19 |   test("shortcut button logs in as demo user and redirects to /dashboard", async ({ page }) => {
  20 |     await page.goto("/");
  21 | 
  22 |     // The amber demo section must be visible with credentials displayed
  23 |     await expect(page.getByText(DEMO_EMAIL)).toBeVisible();
  24 |     await expect(page.getByText(DEMO_PASSWORD)).toBeVisible();
  25 | 
  26 |     // Click the one-tap demo login button
  27 |     await page.getByRole("button", { name: /log in as demo/i }).click();
  28 | 
  29 |     // Should land on the dashboard
  30 |     await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  31 |   });
  32 | 
  33 |   test("manually entering demo credentials also logs in successfully", async ({ page }) => {
  34 |     await page.goto("/");
  35 | 
  36 |     // Fill the login form with the demo credentials shown on the page
  37 |     await page.getByLabel(/email/i).fill(DEMO_EMAIL);
  38 |     await page.getByLabel(/password/i).fill(DEMO_PASSWORD);
  39 |     await page.locator('button[type="submit"]').click();
  40 | 
> 41 |     await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  42 |   });
  43 | 
  44 |   test("demo user sees the DemoNotice banner after logging in", async ({ page }) => {
  45 |     await page.goto("/");
  46 |     await page.getByRole("button", { name: /log in as demo/i }).click();
  47 |     await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  48 | 
  49 |     // The amber DemoNotice banner must be visible in the authenticated layout
  50 |     await expect(page.getByRole("status")).toBeVisible();
  51 |   });
  52 | 
  53 |   test("wrong password shows an error and stays on the landing page", async ({ page }) => {
  54 |     await page.goto("/");
  55 |     await page.getByLabel(/email/i).fill(DEMO_EMAIL);
  56 |     await page.getByLabel(/password/i).fill("wrong-password");
  57 |     await page.locator('button[type="submit"]').click();
  58 | 
  59 |     await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
  60 |     await expect(page).not.toHaveURL(/\/dashboard/);
  61 |   });
  62 | });
  63 | 
```