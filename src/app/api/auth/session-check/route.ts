import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/auth/session-check
 * Returns whether the server sees a session and how many retros it finds for that user.
 * Use on mobile and desktop (same tab as the app, while signed in): if hasSession is false on mobile, the auth cookie isn't being sent.
 * Remove or restrict this route in production once debugging is done.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const hasSession = !!session;
  const hasUserId = !!(session?.user as { id?: string } | undefined)?.id;
  const userId = hasUserId ? (session!.user as { id: string }).id : null;
  const userIdPrefix = userId ? userId.slice(0, 8) : null;

  let retrosCount: number | null = null;
  if (userId) {
    try {
      retrosCount = await prisma.retro.count({ where: { userId } });
    } catch {
      retrosCount = -1;
    }
  }

  return NextResponse.json(
    {
      hasSession,
      hasUserId,
      userIdPrefix,
      retrosCount,
      hint: !hasSession
        ? "No session: auth cookie may not be sent (open this URL in the same browser where you signed in, not an in-app browser)."
        : !hasUserId
          ? "Session exists but user.id is missing: check auth JWT/session callbacks."
          : retrosCount === 0
            ? "Session OK but no retros for this user.id in DB (retros may have been created before sign-in or with a different account)."
            : "Session and retros found; list should work.",
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
