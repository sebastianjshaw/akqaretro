import crypto from "node:crypto";

const TOKEN_BYTES = 24; // 192-bit

/**
 * Generate a cryptographically strong, URL-safe token for retro access.
 * Encoded as base64url (no padding) so it is short and safe in URLs.
 */
export function generateRetroToken(): string {
  const bytes = crypto.randomBytes(TOKEN_BYTES);
  return bytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
