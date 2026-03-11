/**
 * Shared validation limits for API inputs (security & DoS prevention).
 */

export const LIMITS = {
  TITLE_MAX_LENGTH: 200,
  CARD_TEXT_MAX_LENGTH: 10_000,
  CREATOR_ID_MAX_LENGTH: 64,
  VOTER_ID_MAX_LENGTH: 64,
  USER_ID_MAX_LENGTH: 256,
  MY_RETROS_MAX: 100,
} as const;

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

export function clampLength(s: string, max: number): string {
  return truncate(s.trim(), max);
}
