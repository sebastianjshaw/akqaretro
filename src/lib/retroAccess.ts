import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { clampLength } from "@/lib/validation";

export const RETRO_TOKEN_MAX_LENGTH = 256;

export function parseRetroToken(
  request: NextRequest,
  body?: { retroToken?: unknown } | null
): string | null {
  const fromQuery = request.nextUrl.searchParams.get("retroToken") ?? "";
  if (fromQuery.trim()) {
    return clampLength(fromQuery.trim(), RETRO_TOKEN_MAX_LENGTH) || null;
  }
  if (body && typeof body.retroToken === "string" && body.retroToken.trim()) {
    return clampLength(body.retroToken.trim(), RETRO_TOKEN_MAX_LENGTH) || null;
  }
  return null;
}

export type CardRetroAccessResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

/** Ensures the card belongs to the retro identified by retroToken (link-sharing boundary). */
export async function assertCardRetroAccess(
  card: { retroId: string },
  retroToken: string | null
): Promise<CardRetroAccessResult> {
  if (!retroToken) {
    return { ok: false, error: "retroToken is required", status: 400 };
  }
  const retro = await prisma.retro.findUnique({
    where: { token: retroToken },
    select: { id: true },
  });
  if (!retro || retro.id !== card.retroId) {
    return { ok: false, error: "Invalid retro token for this card", status: 403 };
  }
  return { ok: true };
}
