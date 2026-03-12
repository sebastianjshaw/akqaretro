import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { LIMITS, clampLength } from "@/lib/validation";
import { safeParseJson } from "@/lib/safeJson";
import {
  ACTIONS_COLUMN_ID,
  getDefaultColumnConfig,
  ensureActionsLast,
  normalizeColumnConfig,
  type ColumnConfigItem,
} from "@/types/retro";

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
    const session = await auth();
    const voterIdRaw = _request.nextUrl.searchParams.get("voterId") ?? "";
    const voterId = voterIdRaw.slice(0, LIMITS.VOTER_ID_MAX_LENGTH);
    const isOwner = !!(session?.user?.id && retro.userId === session.user.id);
    const hideCardsFromNonOwners = Boolean((retro as { hideCardsFromNonOwners?: boolean }).hideCardsFromNonOwners);
    const hideVoteCounts = Boolean((retro as { hideVoteCounts?: boolean }).hideVoteCounts);
    let cardsRaw = retro.cards;
    if (hideCardsFromNonOwners && !isOwner) {
      cardsRaw = retro.cards.filter(
        (c) =>
          (session?.user?.id && (c as { userId?: string }).userId === session.user.id) ||
          (voterId && (c as { creatorId?: string }).creatorId === voterId)
      );
    }
    const cards = cardsRaw.map((c) => {
      const userVotesOnCard = voterId ? c.votes.filter((v) => v.voterId === voterId).length : 0;
      const voteCount = c.votes.length;
      return {
        id: c.id,
        retroId: c.retroId,
        column: c.column,
        text: c.text,
        orderKey: c.orderKey,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        voteCount: hideVoteCounts ? 0 : voteCount,
        userVoted: userVotesOnCard > 0,
        userVotesOnCard, // real value so +/- buttons work when counts are hidden
      };
    });
    const userVoteCount = voterId
      ? cardsRaw.reduce((sum, c) => sum + c.votes.filter((v) => v.voterId === voterId).length, 0)
      : 0;
    const votesRemaining = Math.max(0, VOTES_PER_USER - userVoteCount);
    const rawConfig =
      normalizeColumnConfig((retro as { columnConfig?: unknown }).columnConfig) ??
      getDefaultColumnConfig();
    const columnConfig = ensureActionsLast(rawConfig);
    return NextResponse.json({
      id: retro.id,
      token: retro.token,
      title: retro.title,
      date: retro.date,
      createdAt: retro.createdAt.toISOString(),
      updatedAt: retro.updatedAt.toISOString(),
      cards,
      columnConfig,
      isOwner,
      hideCardsFromNonOwners,
      voteCountsHidden: hideVoteCounts,
      userVoteCount,
      votesRemaining,
      votesPerUserCap: VOTES_PER_USER,
    });
  } catch (e) {
    console.error("GET /api/retros/[token]", e);
    return NextResponse.json({ error: "Failed to fetch retro" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

function parseAndValidateColumnConfig(
  raw: unknown
): { ok: true; config: ColumnConfigItem[] } | { ok: false; error: string } {
  const normalized = normalizeColumnConfig(raw);
  if (!normalized || normalized.length === 0) {
    return { ok: false, error: "columnConfig must be a non-empty array" };
  }
  const actionsCol = normalized.find((c) => c.id === ACTIONS_COLUMN_ID);
  if (!actionsCol) {
    return { ok: false, error: "Actions column is required" };
  }
  if (!actionsCol.fixed) {
    return { ok: false, error: "Actions column must be fixed" };
  }
  const ids = new Set<string>();
  for (const c of normalized) {
    if (!c.id.trim()) return { ok: false, error: "Column id is required" };
    if (ids.has(c.id)) return { ok: false, error: "Duplicate column id" };
    ids.add(c.id);
    if (c.id.length > LIMITS.COLUMN_ID_MAX_LENGTH) {
      return { ok: false, error: "Column id too long" };
    }
    const title = String(c.title ?? "").trim();
    if (title.length > LIMITS.COLUMN_TITLE_MAX_LENGTH) {
      return { ok: false, error: "Column title too long" };
    }
  }
  if (normalized.length > LIMITS.COLUMNS_MAX) {
    return { ok: false, error: "Too many columns" };
  }
  return { ok: true, config: ensureActionsLast(normalized) };
}

export async function PATCH(
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
      return NextResponse.json({ error: "Not allowed to edit this retro" }, { status: 403 });
    }

    const body = await safeParseJson<{
      columnConfig?: unknown;
      hideCardsFromNonOwners?: boolean;
      hideVoteCounts?: boolean;
    }>(request);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const updateData: { columnConfig?: object; hideCardsFromNonOwners?: boolean; hideVoteCounts?: boolean } = {};
    if (body.columnConfig !== undefined) {
      const parsed = parseAndValidateColumnConfig(body.columnConfig);
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      updateData.columnConfig = parsed.config as object;
      const newIds = new Set(parsed.config.map((c) => c.id));
      const prevConfig = normalizeColumnConfig(
        (retro as { columnConfig?: unknown }).columnConfig
      ) ?? getDefaultColumnConfig();
      const removedIds = prevConfig
        .filter((c) => !newIds.has(c.id) && c.id !== ACTIONS_COLUMN_ID)
        .map((c) => c.id);
      if (removedIds.length > 0) {
        await prisma.card.deleteMany({
          where: { retroId: retro.id, column: { in: removedIds } },
        });
      }
    }
    if (typeof body.hideCardsFromNonOwners === "boolean") {
      updateData.hideCardsFromNonOwners = body.hideCardsFromNonOwners;
    }
    if (typeof body.hideVoteCounts === "boolean") {
      updateData.hideVoteCounts = body.hideVoteCounts;
    }
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }
    await prisma.retro.update({
      where: { token: safeToken },
      data: updateData,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/retros/[token]", e);
    return NextResponse.json({ error: "Failed to update retro" }, { status: 500 });
  }
}

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
