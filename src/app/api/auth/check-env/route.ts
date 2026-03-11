import { NextResponse } from "next/server";

/**
 * GET /api/auth/check-env
 * Returns which auth-related env vars are set (names only). Use to debug Configuration errors on Vercel.
 */
export async function GET() {
  const vars = ["AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"] as const;
  const present = vars.filter((name) => {
    const v = process.env[name];
    return typeof v === "string" && v.trim().length > 0;
  });
  const missing = vars.filter((n) => !present.includes(n));
  return NextResponse.json({
    ok: missing.length === 0,
    set: present,
    missing,
    hint: missing.length > 0 ? "Add the missing variables in Vercel → Settings → Environment Variables (Production), then redeploy." : null,
  });
}
