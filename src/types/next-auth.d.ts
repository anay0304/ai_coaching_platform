import "next-auth";
import "next-auth/jwt";

// Extend the Session type so that session.user.id is available everywhere
// without casting. This is needed because NextAuth's default Session type
// only has name, email, and image.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
    };
  }
}

// Extend the JWT type so the userId claim we add in the jwt callback is typed.
declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
  }
}
