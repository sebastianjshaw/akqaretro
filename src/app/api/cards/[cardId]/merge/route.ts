import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { LIMITS } from "@/lib/validation";
import { safeParseJson } from "@/lib/safeJson";

const MERGE_SEPARATOR = "\n\n---\n\n";

/**
 * Merge source card into target card (same column).
 * [cardId] = target. Body: { sourceCardId }.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const targetCardId = (await params).cardId;
    const body = await safeParseJson<{ sourceCardId?: string }>(request);
    const sourceCardId = body ? String(body.sourceCardId ?? "").trim().slice(0, 64) : "";
    if (!sourceCardId || sourceCardId === targetCardId) {
      return NextResponse.json(
        { error: "sourceCardId is required and must differ from target" },
        { status: 400 }
      );
    }
    const [target, source] = await Promise.all([
      prisma.card.findUnique({
        where: { id: targetCardId },
        include: { votes: true },
      }),
      prisma.card.findUnique({
        where: { id: sourceCardId },
        include: { votes: true },
      }),
    ]);
    if (!target || !source) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    if (target.retroId !== source.retroId || target.column !== source.column) {
      return NextResponse.json(
        { error: "Cards must be in the same retro and column" },
        { status: 400 }
      );
    }
    const combined = target.text + MERGE_SEPARATOR + source.text;
    const newText = combined.length > LIMITS.CARD_TEXT_MAX_LENGTH
      ? combined.slice(0, LIMITS.CARD_TEXT_MAX_LENGTH)
      : combined;

    await prisma.$transaction(async (tx) => {
      await tx.card.update({
        where: { id: targetCardId },
        data: { text: newText },
      });
      await tx.vote.updateMany({
        where: { cardId: sourceCardId },
        data: { cardId: targetCardId },
      });
      await tx.card.delete({ where: { id: sourceCardId } });
    });

    const updatedTarget = await prisma.card.findUnique({
      where: { id: targetCardId },
      include: { votes: true },
    });
    return NextResponse.json({
      targetCard: {
        id: updatedTarget!.id,
        text: updatedTarget!.text,
        voteCount: updatedTarget!.votes.length,
      },
      sourceCardDeleted: sourceCardId,
    });
  } catch (e) {
    console.error("POST /api/cards/[cardId]/merge", e);
    return NextResponse.json({ error: "Failed to merge cards" }, { status: 500 });
  }
}
