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
import { appendOwnerCookie, isRetroOwner } from "@/lib/retroOwner";
import { appendDeviceCookie, getDeviceIdFromRequest } from "@/lib/deviceCookie";
import { computeRetroEtag, etagMatches } from "@/lib/retroEtag";

const VOTES_PER_USER = 6;
const TOKEN_MAX_LENGTH = 256;

export async function GET(
  request: NextRequest,
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
    const deviceId = getDeviceIdFromRequest(request);
    const voterIdRaw = request.nextUrl.searchParams.get("voterId") ?? "";
    const voterIdQuery = voterIdRaw.slice(0, LIMITS.VOTER_ID_MAX_LENGTH);
    const voterId = deviceId ?? (voterIdQuery || "");
    const shouldBootstrapDevice = !deviceId && !!voterIdQuery;
    const isOwner = isRetroOwner(retro, session, request, token);
    const shouldBootstrapOwner =
      !isOwner &&
      !!retro.creatorId &&
      !!voterId &&
      voterId === retro.creatorId;
    const effectiveIsOwner = isOwner || shouldBootstrapOwner;
    const hideCardsFromNonOwners = Boolean((retro as { hideCardsFromNonOwners?: boolean }).hideCardsFromNonOwners);
    const hideVoteCounts = Boolean((retro as { hideVoteCounts?: boolean }).hideVoteCounts);
    let cardsRaw = retro.cards;
    if (hideCardsFromNonOwners && !effectiveIsOwner) {
      cardsRaw = retro.cards.filter(
        (c) =>
          (session?.user?.id && (c as { userId?: string }).userId === session.user.id) ||
          (voterId && (c as { creatorId?: string }).creatorId === voterId)
      );
    }
    const sortedCardsRaw = [...cardsRaw].sort((a, b) => {
      if (a.column !== b.column) return 0;
      const aDone = (a as { done?: boolean }).done ? 1 : 0;
      const bDone = (b as { done?: boolean }).done ? 1 : 0;
      if (a.column === ACTIONS_COLUMN_ID && aDone !== bDone) return aDone - bDone;
      return a.orderKey.localeCompare(b.orderKey);
    });
    const rawConfig =
      normalizeColumnConfig((retro as { columnConfig?: unknown }).columnConfig) ??
      getDefaultColumnConfig();
    const columnConfig = ensureActionsLast(rawConfig);
    const etag = computeRetroEtag({
      retroUpdatedAt: retro.updatedAt,
      hideCardsFromNonOwners,
      hideVoteCounts,
      columnConfig,
      cards: sortedCardsRaw.map((c) => ({
        id: c.id,
        updatedAt: c.updatedAt,
        text: c.text,
        orderKey: c.orderKey,
        column: c.column,
        done: (c as { done?: boolean }).done ?? false,
        voteCount: c.votes.length,
      })),
    });
    const ifNoneMatch = request.headers.get("if-none-match");
    if (etagMatches(ifNoneMatch, etag)) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: etag, "Cache-Control": "private, no-cache" },
      });
    }
    const cards = sortedCardsRaw.map((c) => {
      const userVotesOnCard = voterId ? c.votes.filter((v) => v.voterId === voterId).length : 0;
      const voteCount = c.votes.length;
      const done = (c as { done?: boolean }).done ?? false;
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
        userVotesOnCard,
        done,
      };
    });
    const userVoteCount = voterId
      ? cardsRaw.reduce((sum, c) => sum + c.votes.filter((v) => v.voterId === voterId).length, 0)
      : 0;
    const votesRemaining = Math.max(0, VOTES_PER_USER - userVoteCount);
    const response = NextResponse.json({
      id: retro.id,
      token: retro.token,
      title: retro.title,
      date: retro.date,
      createdAt: retro.createdAt.toISOString(),
      updatedAt: retro.updatedAt.toISOString(),
      cards,
      columnConfig,
      isOwner: effectiveIsOwner,
      hideCardsFromNonOwners,
      voteCountsHidden: hideVoteCounts,
      userVoteCount,
      votesRemaining,
      votesPerUserCap: VOTES_PER_USER,
    });
    response.headers.set("ETag", etag);
    response.headers.set("Cache-Control", "private, no-cache");
    if (shouldBootstrapOwner && retro.creatorId) {
      appendOwnerCookie(response, token, retro.creatorId);
    }
    if (shouldBootstrapDevice) {
      appendDeviceCookie(response, voterIdQuery);
    }
    return response;
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

    const retro = await prisma.retro.findUnique({ where: { token: safeToken } });
    if (!retro) {
      return NextResponse.json({ error: "Retro not found" }, { status: 404 });
    }
    if (!isRetroOwner(retro, session, request, safeToken)) {
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
    let removedIds: string[] = [];
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
      removedIds = prevConfig
        .filter((c) => !newIds.has(c.id) && c.id !== ACTIONS_COLUMN_ID)
        .map((c) => c.id);
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
    if (removedIds.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.card.deleteMany({
          where: { retroId: retro.id, column: { in: removedIds } },
        });
        await tx.retro.update({
          where: { token: safeToken },
          data: updateData,
        });
      });
    } else {
      await prisma.retro.update({
        where: { token: safeToken },
        data: updateData,
      });
    }
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

    const retro = await prisma.retro.findUnique({ where: { token: safeToken } });
    if (!retro) {
      return NextResponse.json({ error: "Retro not found" }, { status: 404 });
    }

    if (!isRetroOwner(retro, session, request, safeToken)) {
      return NextResponse.json({ error: "Not allowed to delete this retro" }, { status: 403 });
    }

    await prisma.retro.delete({ where: { token: safeToken } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("DELETE /api/retros/[token]", e);
    return NextResponse.json({ error: "Failed to delete retro" }, { status: 500 });
  }
}
