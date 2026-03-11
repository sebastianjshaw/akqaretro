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
    providers:
      googleId && googleSecret
        ? [
            Google({
              clientId: googleId,
              clientSecret: googleSecret,
              // Use email as the stable user id: same account = same id on all devices (no per-device random id).
              profile(profile: { sub?: string; name?: string; email?: string; picture?: string }) {
                const email = profile.email?.trim().toLowerCase() || "";
                return {
                  id: email || profile.sub || "",
                  name: profile.name,
                  email: profile.email,
                  image: profile.picture,
                };
              },
            }),
          ]
        : [],
    callbacks: {
      jwt({ token, user }) {
        const t = token as { id?: string; sub?: string; email?: string };
        const u = user as { id?: string; email?: string } | undefined;
        const stableId =
          (u?.email?.trim().toLowerCase()) ?? u?.id ?? t.id ?? t.email ?? t.sub;
        if (stableId) t.id = typeof stableId === "string" ? stableId : String(stableId);
        return token;
      },
      session({ session, token }) {
        const t = token as { id?: string; sub?: string; email?: string };
        const id = t.id ?? t.email ?? t.sub;
        if (session.user && id) (session.user as { id?: string }).id = typeof id === "string" ? id : String(id);
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
