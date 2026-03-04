const MAX_ORDER_KEY_LEN = 12;

function safeParseBase36(s: string): number {
  const truncated = s.slice(0, MAX_ORDER_KEY_LEN);
  const n = parseInt(truncated, 36);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Fractional ordering: insert between two keys without reindexing.
 * Keys are base-36 strings; midpoint returns a string between a and b.
 * Long keys are truncated to avoid parseInt precision issues.
 */
export function midpoint(a: string, b: string): string {
  const aSafe = a.slice(0, MAX_ORDER_KEY_LEN);
  const bSafe = b.slice(0, MAX_ORDER_KEY_LEN);
  const maxLen = Math.min(MAX_ORDER_KEY_LEN, Math.max(aSafe.length, bSafe.length));
  let aNum = safeParseBase36(aSafe);
  let bNum = safeParseBase36(bSafe);
  const range = 36 ** maxLen;
  if (aNum >= bNum) {
    bNum = aNum + range;
  }
  const mid = Math.floor((aNum + bNum) / 2);
  let s = mid.toString(36);
  if (s.length < maxLen) s = s.padStart(maxLen, "0");
  return s.slice(0, MAX_ORDER_KEY_LEN);
}

/** Initial order key for first card in a column. */
export const FIRST_ORDER_KEY = "n"; // middle of 0-z in base36

/** Next key after the current last (for appending). */
export function nextOrderKey(currentLast: string | null): string {
  if (!currentLast) return FIRST_ORDER_KEY;
  return midpoint(currentLast, "zzzzzz");
}
