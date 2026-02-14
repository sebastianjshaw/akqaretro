import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateRetroToken } from "@/lib/token";

export async function GET(request: NextRequest) {
  try {
    const creatorId = request.nextUrl.searchParams.get("creatorId") ?? "";
    if (!creatorId) {
      return NextResponse.json({ error: "creatorId is required" }, { status: 400 });
    }
    const retros = await prisma.retro.findMany({
      where: { creatorId },
      orderBy: { createdAt: "desc" },
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
    const body = await request.json().catch(() => ({}));
    const title = String(body.title ?? "").trim();
    const date = String(body.date ?? new Date().toISOString().slice(0, 10)).trim();
    const creatorIdRaw = typeof body.creatorId === "string" ? body.creatorId.trim() : "";
    const creatorId = creatorIdRaw || null;
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const token = generateRetroToken();
    const retro = await prisma.retro.create({
      data: { token, title, date, ...(creatorId && { creatorId }) },
    });
    return NextResponse.json({
      token: retro.token,
      title: retro.title,
      date: retro.date,
      id: retro.id,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create retro";
    console.error("POST /api/retros", e);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? message : "Failed to create retro" },
      { status: 500 }
    );
  }
}
