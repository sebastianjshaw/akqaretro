import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { nextOrderKey } from "@/lib/order";
import { LIMITS, clampLength } from "@/lib/validation";
import { safeParseJson } from "@/lib/safeJson";

const COLUMNS = ["positive", "negative", "actions"] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const retro = await prisma.retro.findUnique({ where: { token } });
    if (!retro) {
      return NextResponse.json({ error: "Retro not found" }, { status: 404 });
    }
    const body = await safeParseJson<{ column?: string; text?: string }>(request);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const column = String(body.column ?? "").toLowerCase();
    if (!COLUMNS.includes(column as (typeof COLUMNS)[number])) {
      return NextResponse.json({ error: "Invalid column" }, { status: 400 });
    }
    const text = clampLength(String(body.text ?? ""), LIMITS.CARD_TEXT_MAX_LENGTH);
    const lastInColumn = await prisma.card.findFirst({
      where: { retroId: retro.id, column },
      orderBy: { orderKey: "desc" },
      select: { orderKey: true },
    });
    const orderKey = nextOrderKey(lastInColumn?.orderKey ?? null);
    const card = await prisma.card.create({
      data: { retroId: retro.id, column, text, orderKey },
    });
    return NextResponse.json({
      id: card.id,
      retroId: card.retroId,
      column: card.column,
      text: card.text,
      orderKey: card.orderKey,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
      voteCount: 0,
      userVoted: false,
      userVotesOnCard: 0,
    });
  } catch (e) {
    console.error("POST /api/retros/[token]/cards", e);
    return NextResponse.json({ error: "Failed to create card" }, { status: 500 });
  }
}
