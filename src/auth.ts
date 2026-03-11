import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

/**
 * Lazy config: built at request time so process.env is read in the same
 * runtime as the API route (avoids Configuration error when env differs at build vs runtime, e.g. Vercel).
 * Exported for /api/auth/assert-debug to diagnose Configuration errors.
 */
export function getConfig(): NextAuthConfig {
  const secret =
    (process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)?.trim() || undefined;
  const googleId = process.env.AUTH_GOOGLE_ID?.trim() ?? "";
  const googleSecret = process.env.AUTH_GOOGLE_SECRET?.trim() ?? "";

  const debug =
    process.env.AUTH_DEBUG === "1" || process.env.AUTH_DEBUG === "true";

  return {
    secret,
    trustHost: true,
    debug,
    // Do not set url: host is inferred from the request (v5). Avoids callback issues when AUTH_URL differs from request.
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
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth((req) => getConfig());
