import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { midpoint } from "@/lib/order";
import { LIMITS, clampLength } from "@/lib/validation";
import { safeParseJson } from "@/lib/safeJson";
import { COLUMNS, type ColumnType } from "@/types/retro";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params;
    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    await prisma.card.delete({ where: { id: cardId } });
    return NextResponse.json({ deleted: cardId });
  } catch (e) {
    console.error("DELETE /api/cards/[cardId]", e);
    return NextResponse.json({ error: "Failed to delete card" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params;
    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    const body = await safeParseJson<{ text?: string; column?: string; orderKey?: string; newIndex?: number }>(request);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const updates: { text?: string; column?: string; orderKey?: string } = {};
    if (typeof body.text === "string") updates.text = clampLength(body.text, LIMITS.CARD_TEXT_MAX_LENGTH);
    if (typeof body.column === "string" && COLUMNS.includes(body.column as ColumnType)) {
      updates.column = body.column;
    }
    if (typeof body.orderKey === "string") updates.orderKey = body.orderKey;
    if (typeof body.newIndex === "number") {
      const siblings = await prisma.card.findMany({
        where: { retroId: card.retroId, column: card.column },
        orderBy: { orderKey: "asc" },
        select: { id: true, orderKey: true },
      });
      const idx = siblings.findIndex((s) => s.id === cardId);
      if (idx === -1) return NextResponse.json({ error: "Card not in list" }, { status: 400 });
      const newIdx = Math.max(0, Math.min(body.newIndex, siblings.length - 1));
      if (newIdx === idx) {
        return NextResponse.json({ id: card.id, column: card.column, text: card.text, orderKey: card.orderKey });
      }
      const prev = siblings[newIdx - 1]?.orderKey ?? null;
      const next = siblings[newIdx]?.orderKey ?? siblings[newIdx - 1]?.orderKey ?? null;
      const newOrderKey = prev && next ? midpoint(prev, next) : next ?? prev ?? "n";
      updates.orderKey = newOrderKey;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        id: card.id,
        column: card.column,
        text: card.text,
        orderKey: card.orderKey,
      });
    }
    const updated = await prisma.card.update({
      where: { id: cardId },
      data: updates,
      include: { votes: true },
    });
    return NextResponse.json({
      id: updated.id,
      retroId: updated.retroId,
      column: updated.column,
      text: updated.text,
      orderKey: updated.orderKey,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      voteCount: updated.votes.length,
    });
  } catch (e) {
    console.error("PATCH /api/cards/[cardId]", e);
    return NextResponse.json({ error: "Failed to update card" }, { status: 500 });
  }
}
