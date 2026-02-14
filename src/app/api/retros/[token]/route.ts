import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const VOTES_PER_USER = 6;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const retro = await prisma.retro.findUnique({
      where: { token },
      include: {
        cards: {
          orderBy: { orderKey: "asc" },
          include: {
            votes: true,
          },
        },
      },
    });
    if (!retro) {
      return NextResponse.json({ error: "Retro not found" }, { status: 404 });
    }
    const voterId = _request.nextUrl.searchParams.get("voterId") ?? "";
    const cards = retro.cards.map((c) => {
      const userVotesOnCard = voterId ? c.votes.filter((v) => v.voterId === voterId).length : 0;
      return {
        id: c.id,
        retroId: c.retroId,
        column: c.column,
        text: c.text,
        orderKey: c.orderKey,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        voteCount: c.votes.length,
        userVoted: userVotesOnCard > 0,
        userVotesOnCard,
      };
    });
    const userVoteCount = voterId
      ? await prisma.vote.count({ where: { retroId: retro.id, voterId } })
      : 0;
    return NextResponse.json({
      id: retro.id,
      token: retro.token,
      title: retro.title,
      date: retro.date,
      createdAt: retro.createdAt.toISOString(),
      updatedAt: retro.updatedAt.toISOString(),
      cards,
      userVoteCount,
      votesRemaining: Math.max(0, VOTES_PER_USER - userVoteCount),
      votesPerUserCap: VOTES_PER_USER,
    });
  } catch (e) {
    console.error("GET /api/retros/[token]", e);
    return NextResponse.json({ error: "Failed to fetch retro" }, { status: 500 });
  }
}
