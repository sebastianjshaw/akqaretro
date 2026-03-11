import { Auth, skipCSRFCheck, raw } from "@auth/core";
import { NextResponse } from "next/server";
import { getConfig } from "@/auth";

type CookieFromAuth = {
  name: string;
  value: string;
  options?: { maxAge?: number; expires?: Date; httpOnly?: boolean; secure?: boolean; sameSite?: string; path?: string };
};

/**
 * GET /api/auth/start-google?callbackUrl=/
 *
 * Starts Google sign-in from a Route Handler so the redirect to Google
 * includes Set-Cookie in the response (avoids server-action/form redirect cookie loss).
 * The browser follows the redirect and stores cookies; when Google redirects
 * back to the callback, those cookies are sent.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const config = getConfig();
  const url = new URL(request.url);
  const origin = url.origin;
  const signInUrl = `${origin}/api/auth/signin/google`;

  const body = new URLSearchParams({ callbackUrl });
  const req = new Request(signInUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      cookie: request.headers.get("cookie") ?? "",
    },
    body: body.toString(),
  });

  // Auth() is called directly so setEnvDefaults never runs; basePath must match the URL path.
  const res = await Auth(req, {
    ...config,
    basePath: "/api/auth",
    raw,
    skipCSRFCheck,
  });

  // Auth() with raw returns ResponseInternal { redirect, cookies }; if assertConfig fails it returns Response
  const internal = res as { redirect?: string; cookies?: CookieFromAuth[] };
  const redirectUrl =
    internal.redirect ??
    (res instanceof Response ? res.headers.get("Location") : null);
  if (!redirectUrl) {
    return NextResponse.json(
      { error: "No redirect URL from auth" },
      { status: 500 }
    );
  }

  const response = NextResponse.redirect(redirectUrl, { status: 302 });

  // Copy cookies: from raw internal response, or from Response headers (when raw didn’t match)
  const cookies = internal.cookies;
  if (Array.isArray(cookies)) {
    for (const c of cookies) {
      const opt = c.options ?? {};
      response.cookies.set(c.name, c.value, {
        maxAge: opt.maxAge,
        expires: opt.expires,
        httpOnly: opt.httpOnly ?? true,
        secure: opt.secure,
        sameSite: (opt.sameSite as "lax" | "strict" | "none") ?? "lax",
        path: opt.path ?? "/",
      });
    }
  } else if (res instanceof Response) {
    const setCookies = res.headers.getSetCookie?.() ?? [];
    for (const cookie of setCookies) {
      response.headers.append("Set-Cookie", cookie);
    }
  }
  return response;
}
