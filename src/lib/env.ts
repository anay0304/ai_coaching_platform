const REQUIRED_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "OPENAI_API_KEY",
] as const;

type RequiredVar = (typeof REQUIRED_VARS)[number];

export type Env = Record<RequiredVar, string>;

export function validateEnv(env: Record<string, string | undefined> = process.env): Env {
  const missing = REQUIRED_VARS.filter((key) => !env[key]);

  if (missing.length > 0) {
    console.error(
      `[env] Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join("\n")}\n` +
        `Copy .env.example to .env.local and fill in the missing values.`
    );
    process.exit(1);
  }

  return {
    DATABASE_URL: env.DATABASE_URL!,
    NEXTAUTH_SECRET: env.NEXTAUTH_SECRET!,
    NEXTAUTH_URL: env.NEXTAUTH_URL!,
    OPENAI_API_KEY: env.OPENAI_API_KEY!,
  };
}

export const env = validateEnv();
