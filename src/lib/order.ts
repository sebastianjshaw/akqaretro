/**
 * Fractional ordering: insert between two keys without reindexing.
 * Keys are base-36 strings; midpoint returns a string between a and b.
 * If a >= b we append "0" to a (new key after a).
 */
export function midpoint(a: string, b: string): string {
  const maxLen = Math.max(a.length, b.length);
  let aNum = parseInt(a, 36) || 0;
  let bNum = parseInt(b, 36) || 0;
  const range = 36 ** maxLen;
  if (aNum >= bNum) {
    bNum = aNum + range;
  }
  const mid = Math.floor((aNum + bNum) / 2);
  let s = mid.toString(36);
  if (s.length < maxLen) s = s.padStart(maxLen, "0");
  return s;
}

/** Initial order key for first card in a column. */
export const FIRST_ORDER_KEY = "n"; // middle of 0-z in base36

/** Next key after the current last (for appending). */
export function nextOrderKey(currentLast: string | null): string {
  if (!currentLast) return FIRST_ORDER_KEY;
  return midpoint(currentLast, "zzzzzz");
}
