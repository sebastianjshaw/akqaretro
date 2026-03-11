import { NextResponse } from "next/server";
import { getConfig } from "@/auth";

function isValidHttpUrl(url: string, baseUrl: string): boolean {
  try {
    return /^https?:/.test(
      new URL(url, url.startsWith("/") ? baseUrl : undefined).protocol
    );
  } catch {
    return false;
  }
}

/**
 * GET /api/auth/assert-debug
 * Runs the same checks as Auth.js assertConfig and returns which one fails.
 * Call with the same host as sign-in (e.g. https://akqaretro.vercel.app/api/auth/assert-debug).
 * Remove or restrict in production once fixed.
 */
export async function GET(request: Request) {
  const config = getConfig();
  const url = new URL(request.url);
  const origin = url.origin;
  const diagnostic = {
    secretLength: config.secret?.length ?? 0,
    providersCount: config.providers?.length ?? 0,
    trustHost: config.trustHost,
    authUrlSet: !!process.env.AUTH_URL,
    requestOrigin: origin,
  };
  const cookies = Object.fromEntries(
    (request.headers.get("cookie") ?? "")
      .split(";")
      .map((s) => {
        const i = s.indexOf("=");
        return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
      })
      .filter(([k]) => k)
  );

  if (!config.trustHost) {
    return NextResponse.json({
      fail: "UntrustedHost",
      message: "trustHost is false",
      diagnostic,
    });
  }

  if (!config.secret?.length) {
    return NextResponse.json({
      fail: "MissingSecret",
      message: "config.secret is empty or missing",
      hint: "AUTH_SECRET / NEXTAUTH_SECRET must be set and non-empty in this runtime.",
      diagnostic,
    });
  }

  const callbackUrlParam = url.searchParams.get("callbackUrl") ?? "/";
  if (callbackUrlParam && !isValidHttpUrl(callbackUrlParam, origin)) {
    return NextResponse.json({
      fail: "InvalidCallbackUrl",
      message: `callbackUrl param invalid: ${callbackUrlParam}`,
      origin,
      diagnostic,
    });
  }

  const callbackCookieNames = [
    "__Secure-authjs.callback-url",
    "authjs.callback-url",
  ];
  for (const name of callbackCookieNames) {
    const value = cookies[name] ?? cookies[decodeURIComponent(name)];
    if (value && !isValidHttpUrl(decodeURIComponent(value), origin)) {
      return NextResponse.json({
        fail: "InvalidCallbackUrl",
        message: `callbackUrl cookie invalid`,
        cookieName: name,
        origin,
        diagnostic,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    message:
      "These assert checks passed. If sign-in still fails, the error may be from provider endpoints (InvalidEndpoints) or another check inside Auth.js.",
    diagnostic,
  });
}
