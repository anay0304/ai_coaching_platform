import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession as nextAuthGetServerSession } from "next-auth/next";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

// ─── Sign-up ──────────────────────────────────────────────────────────────────

/**
 * Creates a new user with a bcrypt-hashed password.
 * Throws if the email is already taken.
 */
export async function signUp(
  email: string,
  password: string,
  name?: string
): Promise<{ id: string; email: string; name: string | null }> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("An account with that email already exists.");

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, name: name ?? null, password: hashedPassword },
    select: { id: true, email: true, name: true },
  });
  return user;
}

// ─── Credentials verification ─────────────────────────────────────────────────

/**
 * Looks up a user by email and verifies their password with bcrypt.
 * Returns the user object on success, or null on failure.
 * Exported so it can be tested in isolation without the full NextAuth stack.
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<{ id: string; email: string; name: string | null } | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.password) return null;

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;

  return { id: user.id, email: user.email, name: user.name };
}

// ─── NextAuth configuration ───────────────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  secret: env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
  },

  pages: {
    // Both the login form and the redirect target for unauthenticated users
    // live at the root. There is no separate /login page.
    signIn: "/",
  },

  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        return verifyCredentials(credentials.email, credentials.password);
      },
    }),
  ],

  callbacks: {
    // Store the database user id inside the JWT token on sign-in.
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },

    // Expose the user id on the session object that client components receive.
    async session({ session, token }) {
      session.user.id = token.userId;
      return session;
    },
  },
};

// ─── isDemoUser ───────────────────────────────────────────────────────────────

/**
 * Returns true when the signed-in user has isDemo: true in the database.
 * Use this to block credential-update requests for shared demo accounts.
 *
 * Accepts the narrow shape we actually need rather than importing the full
 * next-auth Session type, so it works with any session-like object.
 */
export async function isDemoUser(
  session: { user: { id: string } } | null
): Promise<boolean> {
  if (!session) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isDemo: true },
  });
  return user?.isDemo ?? false;
}

// ─── Server-side session helper ───────────────────────────────────────────────

/**
 * Call this in Server Components, Route Handlers, and Server Actions to get the
 * current session. Returns null when the user is not signed in.
 *
 * @example
 * const session = await getServerSession();
 * if (!session) redirect('/');
 */
export function getServerSession() {
  return nextAuthGetServerSession(authOptions);
}
