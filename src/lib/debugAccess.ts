import { NextResponse } from "next/server";

/** Debug/diagnostic API routes — disabled in production unless AUTH_DEBUG is set. */
export function isDebugApiEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.AUTH_DEBUG === "1" ||
    process.env.AUTH_DEBUG === "true"
  );
}

export function debugApiForbidden(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
