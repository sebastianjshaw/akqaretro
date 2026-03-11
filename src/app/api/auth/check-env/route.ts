import { NextResponse } from "next/server";

/**
 * GET /api/auth/check-env
 * Returns whether auth-related env vars are present at runtime (values never exposed).
 * Use in production to confirm Vercel is injecting AUTH_SECRET etc.
 */
export async function GET() {
  const secret =
    (typeof process.env.AUTH_SECRET === "string" && process.env.AUTH_SECRET.trim().length > 0) ||
    (typeof process.env.NEXTAUTH_SECRET === "string" && process.env.NEXTAUTH_SECRET.trim().length > 0);
  const googleId =
    typeof process.env.AUTH_GOOGLE_ID === "string" && process.env.AUTH_GOOGLE_ID.trim().length > 0;
  const googleSecret =
    typeof process.env.AUTH_GOOGLE_SECRET === "string" &&
    process.env.AUTH_GOOGLE_SECRET.trim().length > 0;

  return NextResponse.json({
    secret,
    googleId,
    googleSecret,
    hint: !secret
      ? "AUTH_SECRET or NEXTAUTH_SECRET must be set for Production in Vercel (exact names, no spaces)."
      : undefined,
  });
}
