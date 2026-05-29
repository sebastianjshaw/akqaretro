import { NextRequest, NextResponse } from "next/server";
import { appendDeviceCookie, getDeviceIdFromRequest, normalizeDeviceId } from "@/lib/deviceCookie";
import { safeParseJson } from "@/lib/safeJson";

export const dynamic = "force-dynamic";

/**
 * POST /api/device/bind — mint HttpOnly device cookie from client localStorage id.
 * Only sets cookie when absent or when matching existing cookie (refresh expiry).
 */
export async function POST(request: NextRequest) {
  const body = await safeParseJson<{ deviceId?: string }>(request);
  const requested = body ? normalizeDeviceId(String(body.deviceId ?? "")) : null;
  if (!requested) {
    return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
  }

  const existing = getDeviceIdFromRequest(request);
  if (existing && existing !== requested) {
    return NextResponse.json({ error: "Device already bound to another id" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  appendDeviceCookie(response, requested);
  return response;
}
