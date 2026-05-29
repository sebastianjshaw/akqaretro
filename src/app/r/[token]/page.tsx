import type { Metadata } from "next";
import { cookies } from "next/headers";
import { RetroBoard } from "@/components/retro/RetroBoard";
import { RetroShareLink } from "@/components/retro/RetroShareLink";

interface PageProps {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: "Retrospective | AKQA",
  description: "Agile retrospective board",
  openGraph: {
    title: "Retrospective | AKQA",
    description: "Agile retrospective board",
  },
  robots: { index: false, follow: false },
};

export default async function RetroPage({ params }: PageProps) {
  const { token } = await params;
  let initial = null;
  try {
    const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
    const cookieStore = await cookies();
    const res = await fetch(`${base}/api/retros/${token}`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieStore.toString(),
      },
    });
    if (res.ok) initial = await res.json();
  } catch {
    // Client will fetch with voterId
  }
  return (
    <div className="akqaretro-page min-h-screen bg-[var(--background)] p-4 md:p-6">
      <div className="akqaretro-page__wrap max-w-7xl mx-auto">
        <p className="akqaretro-prime-directive akqaretro-subtitle text-center text-sm leading-snug text-[var(--akqa-muted)] px-4 pt-2 pb-4 max-w-2xl mx-auto">
          Regardless of what we discover, we understand and truly believe that everyone did the best job they could, given what they knew at the time, their skills and abilities, the resources available, and the situation at hand.
        </p>
        <a href="/" className="akqaretro-page__home akqaretro-caption mb-4 inline-block text-[var(--akqa-muted)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)]">
          ← Back
        </a>
        <RetroBoard token={token} initial={initial} />
        <RetroShareLink token={token} />
      </div>
    </div>
  );
}
