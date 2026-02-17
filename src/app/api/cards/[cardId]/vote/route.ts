import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { LIMITS } from "@/lib/validation";
import { safeParseJson } from "@/lib/safeJson";

const VOTES_PER_USER = 6;

function validateVoterId(v: string): string | null {
  const s = v.trim().slice(0, LIMITS.VOTER_ID_MAX_LENGTH);
  return s || null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params;
    const body = await safeParseJson<{ voterId?: string }>(request);
    const voterId = body ? validateVoterId(String(body.voterId ?? "")) : null;
    if (!voterId) {
      return NextResponse.json({ error: "voterId is required" }, { status: 400 });
    }
    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    const userVoteCount = await prisma.vote.count({
      where: { retroId: card.retroId, voterId },
    });
    if (userVoteCount >= VOTES_PER_USER) {
      return NextResponse.json(
        { error: "Maximum votes per retro reached", votesRemaining: 0 },
        { status: 400 }
      );
    }
    await prisma.vote.create({
      data: { retroId: card.retroId, cardId, voterId },
    });
    const voteCount = await prisma.vote.count({ where: { cardId } });
    const userVotesOnCard = await prisma.vote.count({
      where: { cardId, voterId },
    });
    const votesRemaining = Math.max(0, VOTES_PER_USER - userVoteCount - 1);
    return NextResponse.json({
      voteCount,
      votesRemaining,
      userVotesOnCard,
    });
  } catch (e) {
    console.error("POST /api/cards/[cardId]/vote", e);
    return NextResponse.json({ error: "Failed to add vote" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params;
    const voterIdRaw = request.nextUrl.searchParams.get("voterId") ?? "";
    const voterId = voterIdRaw.slice(0, LIMITS.VOTER_ID_MAX_LENGTH).trim();
    if (!voterId) {
      return NextResponse.json({ error: "voterId is required" }, { status: 400 });
    }
    const voteToRemove = await prisma.vote.findFirst({
      where: { cardId, voterId },
      orderBy: { createdAt: "desc" },
      include: { card: true },
    });
    if (!voteToRemove) {
      return NextResponse.json({ error: "No vote to remove" }, { status: 404 });
    }
    await prisma.vote.delete({ where: { id: voteToRemove.id } });
    const voteCount = await prisma.vote.count({ where: { cardId } });
    const userVotesOnCard = await prisma.vote.count({ where: { cardId, voterId } });
    const userVoteCount = await prisma.vote.count({
      where: { retroId: voteToRemove.card.retroId, voterId },
    });
    const votesRemaining = Math.max(0, VOTES_PER_USER - userVoteCount);
    return NextResponse.json({
      voteCount,
      votesRemaining,
      userVotesOnCard,
    });
  } catch (e) {
    console.error("DELETE /api/cards/[cardId]/vote", e);
    return NextResponse.json({ error: "Failed to remove vote" }, { status: 500 });
  }
}
