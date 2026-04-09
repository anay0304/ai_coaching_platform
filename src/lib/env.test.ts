import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateEnv } from "./env";

const mockExit = vi
  .spyOn(process, "exit")
  .mockImplementation(() => undefined as never);

const mockError = vi.spyOn(console, "error").mockImplementation(() => {});

const VALID_ENV = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  NEXTAUTH_SECRET: "a-very-long-secret-value",
  NEXTAUTH_URL: "http://localhost:3000",
  OPENAI_API_KEY: "sk-test-key",
} satisfies NodeJS.ProcessEnv;

describe("validateEnv", () => {
  beforeEach(() => {
    mockExit.mockClear();
    mockError.mockClear();
  });

  it("returns all vars when the env is complete", () => {
    const result = validateEnv(VALID_ENV);
    expect(result).toEqual(VALID_ENV);
    expect(mockExit).not.toHaveBeenCalled();
  });

  it.each([
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "OPENAI_API_KEY",
  ] as const)(
    "calls process.exit(1) and logs the var name when %s is missing",
    (missingVar) => {
      const env = { ...VALID_ENV, [missingVar]: undefined };
      validateEnv(env as NodeJS.ProcessEnv);

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining(missingVar)
      );
    }
  );

  it("lists all missing vars in a single error message", () => {
    validateEnv({} as NodeJS.ProcessEnv);

    expect(mockExit).toHaveBeenCalledWith(1);
    const errorMessage: string = mockError.mock.calls[0][0];
    expect(errorMessage).toContain("DATABASE_URL");
    expect(errorMessage).toContain("NEXTAUTH_SECRET");
    expect(errorMessage).toContain("NEXTAUTH_URL");
    expect(errorMessage).toContain("OPENAI_API_KEY");
  });
});
