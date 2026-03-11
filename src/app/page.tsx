import { auth } from "@/auth";
import { HomeClient } from "@/components/landing/HomeClient";

/** Always run auth() per request so "My retros" uses the current session (no cached page with stale session). */
export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  return <HomeClient session={session} />;
}
