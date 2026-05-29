import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { publicMessageForPrismaError } from "@/lib/prismaErrors";
import { generateRetroToken } from "@/lib/token";
import { LIMITS, clampLength } from "@/lib/validation";
import { safeParseJson } from "@/lib/safeJson";
import { appendOwnerCookie } from "@/lib/retroOwner";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const creatorIdRaw = request.nextUrl.searchParams.get("creatorId") ?? "";
    const creatorId = clampLength(creatorIdRaw, LIMITS.CREATOR_ID_MAX_LENGTH);
    const previousUserIdRaw = request.nextUrl.searchParams.get("previousUserId") ?? "";
    const previousUserId = clampLength(previousUserIdRaw, LIMITS.USER_ID_MAX_LENGTH);

    if (session?.user?.id) {
      const userId = session.user.id;
      // One-time merge: retros created with an old per-device userId get reassigned to this account (Google sub)
      if (previousUserId && previousUserId !== userId) {
        await prisma.retro.updateMany({
          where: { userId: previousUserId },
          data: { userId },
        });
      }
      // Claim device-only retros (creatorId set, userId null or different) to this account
      if (creatorId) {
        await prisma.retro.updateMany({
          where: { creatorId, OR: [{ userId: null }, { userId: { not: userId } }] },
          data: { userId },
        });
      }
      const retros = await prisma.retro.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: LIMITS.MY_RETROS_MAX,
        select: { id: true, token: true, title: true, date: true, createdAt: true },
      });
      const body = retros.map((r) => ({
        id: r.id,
        token: r.token,
        title: r.title,
        date: r.date,
        createdAt: r.createdAt.toISOString(),
      }));
      return NextResponse.json(body, {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      });
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
      })),
      {
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      }
    );
  } catch (e) {
    console.error("GET /api/retros", e);
    return NextResponse.json(
      { error: publicMessageForPrismaError(e) },
      { status: 500 }
    );
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
    const response = NextResponse.json({
      token: retro.token,
      title: retro.title,
      date: retro.date,
      id: retro.id,
    });
    if (retro.creatorId) {
      appendOwnerCookie(response, retro.token, retro.creatorId);
    }
    return response;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("POST /api/retros", err.message, err.stack);
    if ("code" in err) console.error("POST /api/retros code", (err as { code?: string }).code);
    const publicMsg = publicMessageForPrismaError(e);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? `${publicMsg} (${err.message})`
            : publicMsg,
      },
      { status: 500 }
    );
  }
}
