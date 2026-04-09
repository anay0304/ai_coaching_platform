"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

// ─── Demo account ─────────────────────────────────────────────────────────────
//
// These credentials are intentionally visible so anyone can try the app without
// registering. The demo user is seeded in the database (prisma/seed.ts).

const DEMO_EMAIL = "demo@nutricoach.app";
const DEMO_PASSWORD = "demo1234";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "login" | "signup";

// ─── LandingPage ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchTab(next: Tab) {
    setTab(next);
    setError(null);
  }

  // ── Log In ────────────────────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  // ── Sign Up ───────────────────────────────────────────────────────────────

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Create the account first.
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || undefined }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Sign-up failed. Please try again.");
      setLoading(false);
      return;
    }

    // Automatically sign in after successful registration.
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Account created, but sign-in failed. Please log in manually.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  // ── Demo Login ────────────────────────────────────────────────────────────

  async function handleDemoLogin() {
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Demo login failed. Please try again.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-zinc-950">
      <div className="w-full max-w-md">

        {/* Brand / hero */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            NutriCoach
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            AI-powered nutrition coaching for sustainable habit change
          </p>
        </div>

        {/* Auth card */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">

          {/* Tab switcher */}
          <div className="mb-5 flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
            {(["login", "signup"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={[
                  "flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition-colors",
                  tab === t
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50",
                ].join(" ")}
              >
                {t === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Error banner */}
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          )}

          {/* Log In form */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field id="login-email" label="Email">
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </Field>
              <Field id="login-password" label="Password">
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </Field>
              <SubmitButton loading={loading} label="Log In" loadingLabel="Signing in…" />
            </form>
          )}

          {/* Sign Up form */}
          {tab === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <Field
                id="signup-name"
                label="Name"
                hint="optional"
              >
                <input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Your name"
                />
              </Field>
              <Field id="signup-email" label="Email">
                <input
                  id="signup-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </Field>
              <Field id="signup-password" label="Password" hint="min. 8 characters">
                <input
                  id="signup-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </Field>
              <SubmitButton loading={loading} label="Create Account" loadingLabel="Creating account…" />
            </form>
          )}
        </div>

        {/* Demo account section */}
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Try the demo
          </p>
          <p className="mt-0.5 mb-3 text-xs text-amber-700 dark:text-amber-400">
            Shared account — data may be reset at any time. No sign-up needed.
          </p>

          {/* Credentials displayed visibly so anyone can log in manually too */}
          <dl className="mb-3 rounded-md bg-amber-100 px-3 py-2 font-mono text-xs text-amber-900 dark:bg-amber-900 dark:text-amber-200">
            <div className="flex gap-2">
              <dt className="font-semibold">Email</dt>
              <dd className="select-all">{DEMO_EMAIL}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold">Password</dt>
              <dd className="select-all">{DEMO_PASSWORD}</dd>
            </div>
          </dl>

          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-500 dark:hover:bg-amber-400"
          >
            {loading ? "Signing in…" : "Log In as Demo User"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

const inputClass =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500";

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
        {hint && (
          <span className="ml-1 font-normal text-zinc-400">({hint})</span>
        )}
      </label>
      {children}
    </div>
  );
}

function SubmitButton({
  loading,
  label,
  loadingLabel,
}: {
  loading: boolean;
  label: string;
  loadingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
    >
      {loading ? loadingLabel : label}
    </button>
  );
}
