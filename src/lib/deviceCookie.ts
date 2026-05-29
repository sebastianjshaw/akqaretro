import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { LIMITS, clampLength } from "@/lib/validation";

const COOKIE_NAME = "akqaretro_device";
const MAX_AGE_SEC = 365 * 24 * 60 * 60;

function deviceSecret(): string | null {
  const s = (process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)?.trim();
  return s || null;
}

function signDeviceCookie(deviceId: string): string | null {
  const secret = deviceSecret();
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = `device.${deviceId}.${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${deviceId}.${exp}.${sig}`;
}

function verifyDeviceCookieValue(cookieValue: string): string | null {
  const secret = deviceSecret();
  if (!secret) return null;
  const parts = cookieValue.split(".");
  if (parts.length !== 3) return null;
  const [deviceId, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!deviceId || !Number.isFinite(exp) || Math.floor(Date.now() / 1000) > exp) {
    return null;
  }
  const payload = `device.${deviceId}.${exp}`;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return clampLength(deviceId, LIMITS.VOTER_ID_MAX_LENGTH) || null;
}

/** Validated device / voter id from HttpOnly cookie (not spoofable from query/body). */
export function getDeviceIdFromRequest(request: NextRequest): string | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return verifyDeviceCookieValue(raw);
}

export function normalizeDeviceId(raw: string): string | null {
  const id = clampLength(raw.trim(), LIMITS.VOTER_ID_MAX_LENGTH);
  return id || null;
}

/** Bind this browser to a device id (voter / anonymous creator). */
export function appendDeviceCookie(response: NextResponse, deviceId: string): void {
  const value = signDeviceCookie(deviceId);
  if (!value) return;
  response.cookies.set({
    name: COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
    secure: process.env.NODE_ENV === "production",
  });
}
