import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateRetroToken } from "@/lib/token";
import { LIMITS, clampLength } from "@/lib/validation";
import { safeParseJson } from "@/lib/safeJson";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const creatorIdRaw = request.nextUrl.searchParams.get("creatorId") ?? "";
    const creatorId = clampLength(creatorIdRaw, LIMITS.CREATOR_ID_MAX_LENGTH);

    if (session?.user?.id) {
      const retros = await prisma.retro.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: LIMITS.MY_RETROS_MAX,
        select: { id: true, token: true, title: true, date: true, createdAt: true },
      });
      return NextResponse.json(
        retros.map((r) => ({
          id: r.id,
          token: r.token,
          title: r.title,
          date: r.date,
          createdAt: r.createdAt.toISOString(),
        }))
      );
    }

    if (!creatorId) {
      return NextResponse.json({ error: "creatorId is required when not signed in" }, { status: 400 });
    }
    const retros = await prisma.retro.findMany({
      where: { creatorId },
      orderBy: { createdAt: "desc" },
      take: LIMITS.MY_RETROS_MAX,
      select: { id: true, token: true, title: true, date: true, createdAt: true },
    });
    return NextResponse.json(
      retros.map((r) => ({
        id: r.id,
        token: r.token,
        title: r.title,
        date: r.date,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    console.error("GET /api/retros", e);
    return NextResponse.json({ error: "Failed to list retros" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await safeParseJson<{ title?: string; date?: string; creatorId?: string }>(request);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const title = clampLength(String(body.title ?? ""), LIMITS.TITLE_MAX_LENGTH);
    const date = String(body.date ?? new Date().toISOString().slice(0, 10)).trim().slice(0, 10);
    const creatorIdRaw = typeof body.creatorId === "string" ? body.creatorId : "";
    const creatorId = creatorIdRaw ? clampLength(creatorIdRaw, LIMITS.CREATOR_ID_MAX_LENGTH) : null;
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const token = generateRetroToken();
    const retro = await prisma.retro.create({
      data: {
        token,
        title,
        date,
        ...(session?.user?.id && { userId: session.user.id }),
        ...(creatorId && { creatorId }),
      },
    });
    return NextResponse.json({
      token: retro.token,
      title: retro.title,
      date: retro.date,
      id: retro.id,
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    // Log full error for Vercel (Functions → Logs); safe for prod (not sent to client)
    console.error("POST /api/retros", err.message, err.stack);
    if ("code" in err) console.error("POST /api/retros code", (err as { code?: string }).code);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? err.message : "Failed to create retro" },
      { status: 500 }
    );
  }
}
