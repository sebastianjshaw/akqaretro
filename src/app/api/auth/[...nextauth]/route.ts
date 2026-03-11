import { handlers } from "@/auth";

const AUTH_DEBUG = process.env.AUTH_DEBUG === "1" || process.env.AUTH_DEBUG === "true";

async function wrappedGET(req: Request) {
  try {
    return await handlers.GET(req);
  } catch (e) {
    const url = req.url ?? "";
    const isCallback = url.includes("/api/auth/callback/");
    if (isCallback && e && typeof e === "object" && AUTH_DEBUG) {
      const err = e as { type?: string; code?: string; message?: string };
      const code = err.type ?? err.code ?? "Unknown";
      const rawMessage = typeof err.message === "string" ? err.message : "";
      const safeMessage = rawMessage
        .slice(0, 300)
        .replace(/\b(secret|token|password|key)\b/gi, "[redacted]");
      console.error("[auth callback]", code, rawMessage);
      const redirectUrl = new URL("/auth-error", url);
      redirectUrl.searchParams.set("error", "Configuration");
      redirectUrl.searchParams.set("code", code);
      if (safeMessage) redirectUrl.searchParams.set("detail", safeMessage);
      return Response.redirect(redirectUrl.toString(), 302);
    }
    throw e;
  }
}

export const GET = wrappedGET;
export const POST = handlers.POST;
