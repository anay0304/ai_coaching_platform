import { withAuth } from "next-auth/middleware";

// withAuth wraps the middleware and checks for a valid NextAuth JWT token.
// When `authorized` returns false the request is redirected to `pages.signIn`.
export default withAuth({
  callbacks: {
    // A valid token means the user is signed in. No token = redirect to /.
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: "/",
  },
});

export const config = {
  // Protect every route EXCEPT:
  //   /          – the landing / login page
  //   /api/*     – API routes handle auth themselves
  //   /_next/*   – Next.js static assets and image optimisation
  //   /favicon.ico
  //
  // Using .+ (one-or-more) instead of .* means the empty string after the
  // leading slash (i.e. the root path /) never matches, keeping it public.
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico).+)"],
};
