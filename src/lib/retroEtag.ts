import { createHash } from "crypto";

interface RetroEtagInput {
  retroUpdatedAt: Date;
  hideCardsFromNonOwners: boolean;
  hideVoteCounts: boolean;
  columnConfig: unknown;
  cards: {
    id: string;
    updatedAt: Date;
    text: string;
    orderKey: string;
    column: string;
    done: boolean;
    voteCount: number;
  }[];
}

/** Weak ETag for poll short-circuit (304 when board unchanged). */
export function computeRetroEtag(input: RetroEtagInput): string {
  const cardFingerprint = input.cards
    .map(
      (c) =>
        `${c.id}:${c.updatedAt.toISOString()}:${c.voteCount}:${c.text.length}:${c.orderKey}:${c.column}:${c.done ? 1 : 0}`
    )
    .sort()
    .join("|");
  const payload = [
    input.retroUpdatedAt.toISOString(),
    input.hideCardsFromNonOwners ? 1 : 0,
    input.hideVoteCounts ? 1 : 0,
    JSON.stringify(input.columnConfig ?? null),
    cardFingerprint,
  ].join(";");
  const hash = createHash("sha256").update(payload).digest("hex").slice(0, 16);
  return `"${hash}"`;
}

export function etagMatches(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;
  return ifNoneMatch.split(",").some((part) => part.trim() === etag);
}
