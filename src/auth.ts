import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const googleId = process.env.AUTH_GOOGLE_ID?.trim() ?? "";
const googleSecret = process.env.AUTH_GOOGLE_SECRET?.trim() ?? "";

export const { handlers, signIn, signOut, auth } = NextAuth({
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
