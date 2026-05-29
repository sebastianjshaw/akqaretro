import { createHmac, createHash, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

const COOKIE_PREFIX = "akqaretro_owner_";
/** One year — anonymous owners keep access on the same browser/device. */
const MAX_AGE_SEC = 365 * 24 * 60 * 60;

function ownerSecret(): string | null {
  const s = (process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)?.trim();
  return s || null;
}

/** Stable cookie name per retro token (avoids special characters in names). */
export function ownerCookieName(token: string): string {
  const key = createHash("sha256").update(token).digest("hex").slice(0, 16);
  return `${COOKIE_PREFIX}${key}`;
}

function signOwnerCookie(token: string, creatorId: string): string | null {
  const secret = ownerSecret();
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = `${token}.${creatorId}.${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${creatorId}.${exp}.${sig}`;
}

function verifyOwnerCookieValue(token: string, cookieValue: string): string | null {
  const secret = ownerSecret();
  if (!secret) return null;
  const parts = cookieValue.split(".");
  if (parts.length !== 3) return null;
  const [creatorId, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!creatorId || !Number.isFinite(exp) || Math.floor(Date.now() / 1000) > exp) {
    return null;
  }
  const payload = `${token}.${creatorId}.${exp}`;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return creatorId;
}

/** True when the request carries a valid signed owner cookie for this retro. */
export function verifyRetroOwnerCookie(
  request: NextRequest,
  token: string,
  retroCreatorId: string | null
): boolean {
  if (!retroCreatorId) return false;
  const raw = request.cookies.get(ownerCookieName(token))?.value;
  if (!raw) return false;
  const creatorId = verifyOwnerCookieValue(token, raw);
  return creatorId === retroCreatorId;
}

export interface RetroOwnerRecord {
  userId: string | null;
  creatorId: string | null;
}

/**
 * Unified owner check: signed-in account owner OR valid HttpOnly owner cookie.
 * Matches PATCH/DELETE authorization semantics for GET isOwner.
 */
export function isRetroOwner(
  retro: RetroOwnerRecord,
  session: { user?: { id?: string } } | null,
  request: NextRequest,
  token: string
): boolean {
  if (session?.user?.id && retro.userId === session.user.id) return true;
  return verifyRetroOwnerCookie(request, token, retro.creatorId);
}

/** Set HttpOnly signed owner cookie on a response (after retro create / snapshot). */
export function appendOwnerCookie(
  response: NextResponse,
  token: string,
  creatorId: string
): void {
  const value = signOwnerCookie(token, creatorId);
  if (!value) return;
  response.cookies.set({
    name: ownerCookieName(token),
    value,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
    secure: process.env.NODE_ENV === "production",
  });
}
