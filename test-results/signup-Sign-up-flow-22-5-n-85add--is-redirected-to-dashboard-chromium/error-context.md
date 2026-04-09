# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: signup.spec.ts >> Sign-up flow (22.5) >> new visitor can sign up and is redirected to /dashboard
- Location: e2e\signup.spec.ts:14:7

# Error details

```
Error: expect(page).toHaveTitle(expected) failed

Expected pattern: /NutriCoach/i
Received string:  "Create Next App"
Timeout: 5000ms

Call log:
  - Expect "toHaveTitle" with timeout 5000ms
    9 × unexpected value "Create Next App"

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
      - generic [ref=e11]:
        - generic [ref=e12]:
          - generic [ref=e13]: Email
          - textbox "Email" [ref=e14]:
            - /placeholder: you@example.com
        - generic [ref=e15]:
          - generic [ref=e16]: Password
          - textbox "Password" [ref=e17]:
            - /placeholder: ••••••••
        - button "Log In" [ref=e18]
    - generic [ref=e19]:
      - paragraph [ref=e20]: Try the demo
      - paragraph [ref=e21]: Shared account — data may be reset at any time. No sign-up needed.
      - generic [ref=e22]:
        - generic [ref=e23]:
          - term [ref=e24]: Email
          - definition [ref=e25]: demo@nutricoach.app
        - generic [ref=e26]:
          - term [ref=e27]: Password
          - definition [ref=e28]: demo1234
      - button "Log In as Demo User" [ref=e29]
  - button "Open Next.js Dev Tools" [ref=e35] [cursor=pointer]:
    - img [ref=e36]
  - alert [ref=e39]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | /**
  4  |  * E2E 22.5 — Guest → sign up → dashboard redirect
  5  |  *
  6  |  * A visitor who has never logged in should be able to create a new account
  7  |  * from the landing page and land on /dashboard automatically.
  8  |  *
  9  |  * A unique email is generated per run so each test run creates a fresh user
  10 |  * and does not collide with previous runs.
  11 |  */
  12 | 
  13 | test.describe("Sign-up flow (22.5)", () => {
  14 |   test("new visitor can sign up and is redirected to /dashboard", async ({ page }) => {
  15 |     const uniqueEmail = `test+${Date.now()}@playwright.test`;
  16 |     const password = "Playwright123!";
  17 | 
  18 |     // ── 1. Land on the public home page ──────────────────────────────────────
  19 |     await page.goto("/");
> 20 |     await expect(page).toHaveTitle(/NutriCoach/i);
     |                        ^ Error: expect(page).toHaveTitle(expected) failed
  21 | 
  22 |     // The login form is visible by default
  23 |     await expect(page.getByRole("button", { name: /log in/i })).toBeVisible();
  24 | 
  25 |     // ── 2. Switch to the Sign Up tab ─────────────────────────────────────────
  26 |     await page.getByRole("button", { name: /sign up/i }).click();
  27 | 
  28 |     // Sign-up form fields should now be visible
  29 |     await expect(page.getByLabel(/email/i)).toBeVisible();
  30 |     await expect(page.getByLabel(/password/i)).toBeVisible();
  31 | 
  32 |     // ── 3. Fill in credentials ────────────────────────────────────────────────
  33 |     await page.getByLabel(/email/i).fill(uniqueEmail);
  34 |     await page.getByLabel(/password/i).fill(password);
  35 | 
  36 |     // ── 4. Submit and wait for redirect ──────────────────────────────────────
  37 |     await page.getByRole("button", { name: /create account/i }).click();
  38 | 
  39 |     // After successful sign-up + auto-login, the app redirects to /dashboard
  40 |     await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  41 |   });
  42 | 
  43 |   test("sign-up form shows an error for a duplicate email", async ({ page }) => {
  44 |     // The demo account email is always in the database (seeded)
  45 |     await page.goto("/");
  46 |     await page.getByRole("button", { name: /sign up/i }).click();
  47 | 
  48 |     await page.getByLabel(/email/i).fill("demo@nutricoach.app");
  49 |     await page.getByLabel(/password/i).fill("somepassword");
  50 |     await page.getByRole("button", { name: /create account/i }).click();
  51 | 
  52 |     // An error message should appear — do not redirect
  53 |     await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
  54 |     await expect(page).not.toHaveURL(/\/dashboard/);
  55 |   });
  56 | });
  57 | 
```