import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { publicMessageForPrismaError } from "@/lib/prismaErrors";
import { generateRetroToken } from "@/lib/token";
import { LIMITS, clampLength } from "@/lib/validation";
import { safeParseJson } from "@/lib/safeJson";
import { appendOwnerCookie } from "@/lib/retroOwner";
import { appendDeviceCookie, getDeviceIdFromRequest } from "@/lib/deviceCookie";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const deviceId = getDeviceIdFromRequest(request);
    const previousUserIdRaw = request.nextUrl.searchParams.get("previousUserId") ?? "";
    const previousUserId = clampLength(previousUserIdRaw, LIMITS.USER_ID_MAX_LENGTH);

    if (session?.user?.id) {
      const userId = session.user.id;
      if (previousUserId && previousUserId !== userId) {
        await prisma.retro.updateMany({
          where: { userId: previousUserId },
          data: { userId },
        });
      }
      // Claim device-only retros only when device cookie matches stored creatorId
      if (deviceId) {
        await prisma.retro.updateMany({
          where: { creatorId: deviceId, OR: [{ userId: null }, { userId: { not: userId } }] },
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

    if (!deviceId) {
      return NextResponse.json(
        { error: "Device session required. Bind device via POST /api/device/bind." },
        { status: 401 }
      );
    }
    const retros = await prisma.retro.findMany({
      where: { creatorId: deviceId },
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
    let creatorId = creatorIdRaw ? clampLength(creatorIdRaw, LIMITS.CREATOR_ID_MAX_LENGTH) : null;
    const cookieDeviceId = getDeviceIdFromRequest(request);
    if (!session?.user?.id) {
      if (cookieDeviceId) {
        creatorId = cookieDeviceId;
      } else if (!creatorId) {
        return NextResponse.json({ error: "creatorId or device cookie required" }, { status: 400 });
      }
    }
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
    if (creatorId) {
      appendDeviceCookie(response, creatorId);
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
