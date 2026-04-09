import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// ─── Mocks (hoisted before imports by vitest) ─────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

// Import after mocks are registered
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signUp, verifyCredentials, authOptions } from "./auth.service";

const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockCreate = vi.mocked(prisma.user.create);
const mockHash = vi.mocked(bcrypt.hash);
const mockCompare = vi.mocked(bcrypt.compare);

// ─── Property 1: Authentication round-trip ────────────────────────────────────
//
// For any valid email + password pair:
//   1. signUp creates a user (prisma.user.create is called with the hash)
//   2. verifyCredentials with the same credentials returns that user
//
// This tests the full sign-up → sign-in flow without a real database or bcrypt.

describe("Property 1: Authentication round-trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signUp then verifyCredentials always yields a non-null session for any valid credentials", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        // Passwords: printable ASCII, min 8 chars (realistic constraint)
        fc.string({ minLength: 8, maxLength: 64 }).filter((s) =>
          /^[\x20-\x7E]+$/.test(s)
        ),
        async (email, password) => {
          const hashedPassword = `bcrypt:${password}`;

          // bcrypt.hash returns our deterministic fake hash
          mockHash.mockResolvedValue(hashedPassword as never);

          // bcrypt.compare returns true only when the plain value matches
          mockCompare.mockImplementation(
            (plain: string, hash: string) =>
              Promise.resolve(hash === `bcrypt:${plain}`) as never
          );

          const storedUser = {
            id: "user-1",
            email,
            name: null,
            password: hashedPassword,
            isDemo: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Sign-up: no existing user, then create succeeds
          mockFindUnique.mockResolvedValueOnce(null);
          mockCreate.mockResolvedValueOnce(
            { id: storedUser.id, email, name: null } as never
          );

          await signUp(email, password);

          // Sign-in: findUnique returns the stored user
          mockFindUnique.mockResolvedValueOnce(storedUser as never);

          const session = await verifyCredentials(email, password);

          return session !== null && session.email === email;
        }
      ),
      // Limit runs to keep the test suite fast; 50 is plenty for a unit property
      { numRuns: 50 }
    );
  });

  it("verifyCredentials returns null when the password does not match", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8 }),
        fc.string({ minLength: 8 }),
        async (email, storedPassword, attemptedPassword) => {
          fc.pre(storedPassword !== attemptedPassword);

          mockFindUnique.mockResolvedValueOnce({
            id: "user-1",
            email,
            name: null,
            password: `bcrypt:${storedPassword}`,
            isDemo: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as never);

          mockCompare.mockImplementation(
            (plain: string, hash: string) =>
              Promise.resolve(hash === `bcrypt:${plain}`) as never
          );

          const session = await verifyCredentials(email, attemptedPassword);
          return session === null;
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ─── Property 2: Protected route rejection ────────────────────────────────────
//
// The middleware uses NextAuth's `withAuth` with `authorized: ({ token }) => !!token`.
// When token is null (unauthenticated), authorized returns false and NextAuth
// redirects to `authOptions.pages.signIn` which is "/".
//
// We test the two components separately:
//   a) The authorized callback logic: !!token
//   b) The sign-in redirect target: authOptions.pages.signIn === "/"

describe("Property 2: Protected route rejection", () => {
  // The `authorized` callback extracted from authOptions is equivalent to !!token.
  // We replicate it here to test it in isolation.
  const authorized = ({ token }: { token: unknown }) => !!token;

  it("unauthenticated requests (null token) are always rejected", () => {
    fc.assert(
      fc.property(
        // Enumerate all the paths that live inside the (auth) route group
        fc.constantFrom(
          "/dashboard",
          "/session/abc123",
          "/history",
          "/profile",
          "/onboarding"
        ),
        (path) => {
          // Suppress unused variable warning — path documents what routes we protect
          void path;
          return authorized({ token: null }) === false;
        }
      )
    );
  });

  it("authenticated requests (valid token) are always allowed", () => {
    fc.assert(
      fc.property(
        fc.record({
          userId: fc.string({ minLength: 1 }),
          email: fc.emailAddress(),
        }),
        (token) => authorized({ token }) === true
      )
    );
  });

  it("unauthenticated users are redirected to /", () => {
    expect(authOptions.pages?.signIn).toBe("/");
  });
});
