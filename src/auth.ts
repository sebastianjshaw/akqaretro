import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const googleId = process.env.AUTH_GOOGLE_ID?.trim() ?? "";
const googleSecret = process.env.AUTH_GOOGLE_SECRET?.trim() ?? "";
const secret =
  (process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_AUTH_SECRET)?.trim() || undefined;

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: secret || undefined,
  trustHost: true,
  ...(process.env.AUTH_URL && { url: process.env.AUTH_URL }),
  providers:
    googleId && googleSecret
      ? [Google({ clientId: googleId, clientSecret: googleSecret })]
      : [],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = token.id as string;
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/auth-error",
  },
});
