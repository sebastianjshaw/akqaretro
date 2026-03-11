import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { LIMITS, clampLength } from "@/lib/validation";

const VOTES_PER_USER = 6;
const TOKEN_MAX_LENGTH = 256;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token || token.length > 256) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
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
    const voterIdRaw = _request.nextUrl.searchParams.get("voterId") ?? "";
    const voterId = voterIdRaw.slice(0, LIMITS.VOTER_ID_MAX_LENGTH);
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
    const userVoteCount = voterId ? cards.reduce((sum, c) => sum + c.userVotesOnCard, 0) : 0;
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

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const safeToken = clampLength(token ?? "", TOKEN_MAX_LENGTH);
    if (!safeToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
    const session = await auth();
    const creatorIdRaw = request.nextUrl.searchParams.get("creatorId") ?? "";
    const creatorId = creatorIdRaw ? clampLength(creatorIdRaw, LIMITS.CREATOR_ID_MAX_LENGTH) : null;

    const retro = await prisma.retro.findUnique({ where: { token: safeToken } });
    if (!retro) {
      return NextResponse.json({ error: "Retro not found" }, { status: 404 });
    }

    const isOwnerByUser = session?.user?.id && retro.userId === session.user.id;
    const isOwnerByCreator =
      !session?.user?.id && creatorId && retro.creatorId === creatorId;
    if (!isOwnerByUser && !isOwnerByCreator) {
      return NextResponse.json({ error: "Not allowed to delete this retro" }, { status: 403 });
    }

    await prisma.retro.delete({ where: { token: safeToken } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("DELETE /api/retros/[token]", e);
    return NextResponse.json({ error: "Failed to delete retro" }, { status: 500 });
  }
}
