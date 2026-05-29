import type { RetroState } from "@/types/retro";

/** Stable fingerprint for poll diff — skip re-render when board data unchanged. */
export function retroStateFingerprint(state: RetroState): string {
  const cardsKey = state.cards
    .map(
      (c) =>
        `${c.id}:${c.voteCount}:${c.userVotesOnCard}:${c.text}:${c.orderKey}:${c.column}:${c.done ? 1 : 0}`
    )
    .join("|");
  const colsKey = state.columnConfig.map((c) => `${c.id}:${c.title}:${c.order}`).join("|");
  return [
    state.updatedAt,
    state.votesRemaining,
    state.isOwner ? 1 : 0,
    state.hideCardsFromNonOwners ? 1 : 0,
    state.voteCountsHidden ? 1 : 0,
    colsKey,
    cardsKey,
  ].join(";");
}
