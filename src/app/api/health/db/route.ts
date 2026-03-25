import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/health/db — verifies DATABASE_URL works at runtime (no secrets returned).
 * Open in browser after deploy: https://your-app.vercel.app/api/health/db
 */
export async function GET() {
  const hasDatabaseUrl =
    typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.length > 0;
  const hasDirectUrl =
    typeof process.env.DIRECT_URL === "string" && process.env.DIRECT_URL.length > 0;

  if (!hasDatabaseUrl) {
    return NextResponse.json(
      {
        ok: false,
        databaseUrlSet: false,
        directUrlSet: hasDirectUrl,
        error: "DATABASE_URL is not set in this environment.",
      },
      { status: 503 }
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      databaseUrlSet: true,
      directUrlSet: hasDirectUrl,
      query: "ok",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("GET /api/health/db", message);
    return NextResponse.json(
      {
        ok: false,
        databaseUrlSet: true,
        directUrlSet: hasDirectUrl,
        error: "Query failed",
        code: e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : undefined,
      },
      { status: 503 }
    );
  }
}
