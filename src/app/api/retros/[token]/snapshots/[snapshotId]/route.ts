import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { LIMITS, clampLength } from "@/lib/validation";
import { ensureActionsLast, normalizeColumnConfig, getDefaultColumnConfig, type ColumnConfigItem } from "@/types/retro";

export const dynamic = "force-dynamic";

/** GET: single snapshot data for modal (read-only). Must be in same lineage as retro. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; snapshotId: string }> }
) {
  try {
    const { token, snapshotId } = await params;
    const session = await auth();
    const creatorIdRaw = request.nextUrl.searchParams.get("creatorId") ?? "";
    const creatorId = creatorIdRaw ? clampLength(creatorIdRaw, LIMITS.CREATOR_ID_MAX_LENGTH) : null;

    const retro = await prisma.retro.findUnique({ where: { token } });
    if (!retro) return NextResponse.json({ error: "Retro not found" }, { status: 404 });

    const isOwner =
      (session?.user?.id && retro.userId === session.user.id) ||
      (!session?.user?.id && creatorId && retro.creatorId === creatorId);
    if (!isOwner) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const lineageId = (retro as { lineageId?: string | null }).lineageId ?? retro.id;
    const snapshot = await prisma.snapshot.findFirst({
      where: { id: snapshotId, lineageId },
    });
    if (!snapshot) return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });

    const rawConfig = normalizeColumnConfig(snapshot.columnConfig as unknown) ?? getDefaultColumnConfig();
    const columnConfig = ensureActionsLast(rawConfig) as ColumnConfigItem[];
    const cards = Array.isArray(snapshot.cards) ? (snapshot.cards as { id: string; column: string; text: string; orderKey: string; voteCount?: number; done?: boolean }[]) : [];

    return NextResponse.json({
      id: snapshot.id,
      createdAt: snapshot.createdAt.toISOString(),
      columnConfig,
      cards: cards.map((c) => ({
        id: c.id,
        column: c.column,
        text: c.text,
        orderKey: c.orderKey,
        voteCount: c.voteCount ?? 0,
        done: c.done ?? false,
      })),
    });
  } catch (e) {
    console.error("GET /api/retros/[token]/snapshots/[snapshotId]", e);
    return NextResponse.json({ error: "Failed to load snapshot" }, { status: 500 });
  }
}
