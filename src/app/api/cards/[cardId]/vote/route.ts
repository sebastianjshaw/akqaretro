import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { safeParseJson } from "@/lib/safeJson";
import { assertCardRetroAccess, parseRetroToken } from "@/lib/retroAccess";
import { getDeviceIdFromRequest } from "@/lib/deviceCookie";

const VOTES_PER_USER = 6;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params;
    const voterId = getDeviceIdFromRequest(request);
    if (!voterId) {
      return NextResponse.json({ error: "Device session required" }, { status: 401 });
    }
    const body = await safeParseJson<{ retroToken?: string }>(request);
    const retroToken = parseRetroToken(request, body);
    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    const access = await assertCardRetroAccess(card, retroToken);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const userVoteCount = await tx.vote.count({
          where: { retroId: card.retroId, voterId },
        });
        if (userVoteCount >= VOTES_PER_USER) {
          return { capped: true as const, userVoteCount };
        }
        await tx.vote.create({
          data: { retroId: card.retroId, cardId, voterId },
        });
        const voteCount = await tx.vote.count({ where: { cardId } });
        const userVotesOnCard = await tx.vote.count({ where: { cardId, voterId } });
        const votesRemaining = Math.max(0, VOTES_PER_USER - userVoteCount - 1);
        return { capped: false as const, voteCount, userVotesOnCard, votesRemaining };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if (result.capped) {
      return NextResponse.json(
        { error: "Maximum votes per retro reached", votesRemaining: 0 },
        { status: 400 }
      );
    }

    return NextResponse.json({
      voteCount: result.voteCount,
      votesRemaining: result.votesRemaining,
      userVotesOnCard: result.userVotesOnCard,
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
    const voterId = getDeviceIdFromRequest(request);
    if (!voterId) {
      return NextResponse.json({ error: "Device session required" }, { status: 401 });
    }
    const retroToken = parseRetroToken(request);
    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    const access = await assertCardRetroAccess(card, retroToken);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
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
