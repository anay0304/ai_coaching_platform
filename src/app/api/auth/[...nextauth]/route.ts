import NextAuth from "next-auth";
import { authOptions } from "@/services/auth.service";

// NextAuth handles both GET (session check, OAuth redirects) and
// POST (sign-in, sign-out, CSRF) on this catch-all route.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
