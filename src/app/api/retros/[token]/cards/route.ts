import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { nextOrderKey } from "@/lib/order";
import { LIMITS, clampLength } from "@/lib/validation";
import { safeParseJson } from "@/lib/safeJson";
import {
  getDefaultColumnConfig,
  normalizeColumnConfig,
} from "@/types/retro";

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
    const session = await auth();
    const body = await safeParseJson<{ column?: string; text?: string; creatorId?: string }>(request);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const columnRaw = String(body.column ?? "").trim();
    const column = clampLength(columnRaw, LIMITS.COLUMN_ID_MAX_LENGTH);
    const columnConfig =
      normalizeColumnConfig((retro as { columnConfig?: unknown }).columnConfig) ??
      getDefaultColumnConfig();
    const validIds = new Set(columnConfig.map((c) => c.id));
    if (!column || !validIds.has(column)) {
      return NextResponse.json({ error: "Invalid column" }, { status: 400 });
    }
    const text = clampLength(String(body.text ?? ""), LIMITS.CARD_TEXT_MAX_LENGTH);
    const creatorId = typeof body.creatorId === "string"
      ? clampLength(body.creatorId.trim(), LIMITS.VOTER_ID_MAX_LENGTH) || null
      : null;
    const userId = session?.user?.id ?? null;
    const lastInColumn = await prisma.card.findFirst({
      where: { retroId: retro.id, column },
      orderBy: { orderKey: "desc" },
      select: { orderKey: true },
    });
    const orderKey = nextOrderKey(lastInColumn?.orderKey ?? null);
    const card = await prisma.card.create({
      data: { retroId: retro.id, column, text, orderKey, creatorId, userId },
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
