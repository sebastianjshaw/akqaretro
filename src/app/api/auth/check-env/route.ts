import { NextResponse } from "next/server";

/**
 * GET /api/auth/check-env
 * Dev only: returns which auth env vars are set (names only). 404 in production.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }
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
  });
}
