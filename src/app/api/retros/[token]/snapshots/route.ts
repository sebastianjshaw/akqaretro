import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateRetroToken } from "@/lib/token";
import { LIMITS, clampLength } from "@/lib/validation";
import {
  ACTIONS_COLUMN_ID,
  getDefaultColumnConfig,
  ensureActionsLast,
  normalizeColumnConfig,
  type ColumnConfigItem,
} from "@/types/retro";
import { nextOrderKey } from "@/lib/order";

export const dynamic = "force-dynamic";

function assertOwner(
  retro: { userId: string | null; creatorId: string | null },
  session: { user?: { id?: string } } | null,
  creatorId: string | null
): boolean {
  const byUser = session?.user?.id && retro.userId === session.user.id;
  const byCreator = !session?.user?.id && creatorId && retro.creatorId === creatorId;
  return !!(byUser || byCreator);
}

/** GET: list snapshots for this retro's lineage (owner only) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const session = await auth();
    const creatorIdRaw = request.nextUrl.searchParams.get("creatorId") ?? "";
    const creatorId = creatorIdRaw ? clampLength(creatorIdRaw, LIMITS.CREATOR_ID_MAX_LENGTH) : null;

    const retro = await prisma.retro.findUnique({ where: { token } });
    if (!retro) return NextResponse.json({ error: "Retro not found" }, { status: 404 });
    if (!assertOwner(retro, session, creatorId)) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const lineageId = (retro as { lineageId?: string | null }).lineageId ?? retro.id;
    const snapshots = await prisma.snapshot.findMany({
      where: { lineageId },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, sourceRetroId: true, resultRetroId: true },
    });

    return NextResponse.json(
      snapshots.map((s) => ({
        id: s.id,
        createdAt: s.createdAt.toISOString(),
        sourceRetroId: s.sourceRetroId,
        resultRetroId: s.resultRetroId,
      }))
    );
  } catch (e) {
    console.error("GET /api/retros/[token]/snapshots", e);
    return NextResponse.json({ error: "Failed to list snapshots" }, { status: 500 });
  }
}

/** POST: create snapshot of current board and a new empty retro (owner only) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const session = await auth();
    const creatorIdRaw = request.nextUrl.searchParams.get("creatorId") ?? "";
    const creatorId = creatorIdRaw ? clampLength(creatorIdRaw, LIMITS.CREATOR_ID_MAX_LENGTH) : null;

    const retro = await prisma.retro.findUnique({
      where: { token },
      include: {
        cards: { orderBy: { orderKey: "asc" }, include: { votes: true } },
      },
    });
    if (!retro) return NextResponse.json({ error: "Retro not found" }, { status: 404 });
    if (!assertOwner(retro, session, creatorId)) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const rawConfig =
      normalizeColumnConfig((retro as { columnConfig?: unknown }).columnConfig) ??
      getDefaultColumnConfig();
    const columnConfig = ensureActionsLast(rawConfig) as ColumnConfigItem[];

    const cardsPayload = retro.cards.map((c) => ({
      id: c.id,
      column: c.column,
      text: c.text,
      orderKey: c.orderKey,
      voteCount: c.votes.length,
      done: (c as { done?: boolean }).done ?? false,
    }));

    const lineageId = (retro as { lineageId?: string | null }).lineageId ?? retro.id;

    const snapshot = await prisma.snapshot.create({
      data: {
        lineageId,
        sourceRetroId: retro.id,
        columnConfig: columnConfig as object,
        cards: cardsPayload as object,
      },
    });

    const newToken = generateRetroToken();
    const newDate = new Date().toISOString().slice(0, 10);
    const newRetro = await prisma.retro.create({
      data: {
        token: newToken,
        title: retro.title,
        date: newDate,
        userId: retro.userId,
        creatorId: retro.creatorId,
        columnConfig: columnConfig as object,
        hideCardsFromNonOwners: (retro as { hideCardsFromNonOwners?: boolean }).hideCardsFromNonOwners ?? false,
        hideVoteCounts: (retro as { hideVoteCounts?: boolean }).hideVoteCounts ?? false,
        lineageId,
      },
    });

    const actionCards = retro.cards.filter((c) => c.column === ACTIONS_COLUMN_ID);
    for (let i = 0; i < actionCards.length; i++) {
      const c = actionCards[i];
      const orderKey = nextOrderKey(i === 0 ? null : actionCards[i - 1].orderKey);
      await prisma.card.create({
        data: {
          retroId: newRetro.id,
          column: ACTIONS_COLUMN_ID,
          text: c.text,
          orderKey,
          creatorId: c.creatorId,
          userId: c.userId,
          done: (c as { done?: boolean }).done ?? false,
        },
      });
    }

    await prisma.snapshot.update({
      where: { id: snapshot.id },
      data: { resultRetroId: newRetro.id },
    });

    return NextResponse.json({
      snapshotId: snapshot.id,
      newRetroToken: newRetro.token,
      newRetroId: newRetro.id,
    });
  } catch (e) {
    console.error("POST /api/retros/[token]/snapshots", e);
    return NextResponse.json({ error: "Failed to create snapshot" }, { status: 500 });
  }
}
