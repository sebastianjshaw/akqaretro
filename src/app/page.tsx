"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getVoterId } from "@/lib/voterId";

interface RetroSummary {
  id: string;
  token: string;
  title: string;
  date: string;
  createdAt: string;
}

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [myRetros, setMyRetros] = useState<RetroSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const creatorId = getVoterId();

  const fetchMyRetros = useCallback(async () => {
    if (!creatorId) {
      setLoadingList(false);
      return;
    }
    try {
      const res = await fetch(`/api/retros?creatorId=${encodeURIComponent(creatorId)}`);
      if (res.ok) {
        const data = await res.json();
        setMyRetros(data);
      }
    } catch {
      setMyRetros([]);
    } finally {
      setLoadingList(false);
    }
  }, [creatorId]);

  useEffect(() => {
    fetchMyRetros();
  }, [fetchMyRetros]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/retros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, date, creatorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      router.push(`/r/${data.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso.slice(0, 10);
    }
  }

  return (
    <div className="akqaretro-landing min-h-screen bg-[var(--background)] flex flex-col items-center p-6">
      <main className="akqaretro-landing__main w-full max-w-lg flex flex-col gap-8">
        <section className="akqaretro-landing__create border border-[var(--akqa-border)] bg-[var(--akqa-white)] dark:bg-[#2a2a2a] shadow-lg p-8">
          <h1 className="akqaretro-landing__title text-2xl font-bold text-[var(--foreground)] mb-2">
            New retrospective
          </h1>
          <p className="akqaretro-landing__subtitle text-[var(--akqa-muted)] mb-6">
            Create a board and share the link with your team.
          </p>
          <form onSubmit={handleSubmit} className="akqaretro-landing__form flex flex-col gap-4">
            <label htmlFor="akqaretro-title" className="akqaretro-landing__label text-sm font-medium text-[var(--foreground)]">
              Title
            </label>
            <input
              id="akqaretro-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sprint 42 Retro"
              className="akqaretro-landing__input w-full border border-[var(--akqa-border)] bg-[var(--akqa-white)] dark:bg-[#1a1a1a] text-[var(--foreground)] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--akqa-dove)]"
              required
            />
            <label htmlFor="akqaretro-date" className="akqaretro-landing__label text-sm font-medium text-[var(--foreground)]">
              Date
            </label>
            <input
              id="akqaretro-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="akqaretro-landing__input w-full border border-[var(--akqa-border)] bg-[var(--akqa-white)] dark:bg-[#1a1a1a] text-[var(--foreground)] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--akqa-dove)]"
            />
            {error && (
              <p className="akqaretro-landing__error text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="akqaretro-landing__submit mt-2 bg-[var(--akqa-dove)] text-[var(--akqa-white)] font-medium px-4 py-3 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)] focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create retrospective"}
            </button>
          </form>
        </section>

        <section className="akqaretro-landing__my-retros border border-[var(--akqa-border)] bg-[var(--akqa-white)] dark:bg-[#2a2a2a] p-6" aria-labelledby="akqaretro-my-retros-heading">
          <h2 id="akqaretro-my-retros-heading" className="akqaretro-landing__my-retros-title text-lg font-semibold text-[var(--foreground)] mb-3">
            My retros
          </h2>
          {loadingList ? (
            <p className="akqaretro-landing__my-retros-loading text-sm text-[var(--akqa-muted)]">Loading…</p>
          ) : myRetros.length === 0 ? (
            <p className="akqaretro-landing__my-retros-empty text-sm text-[var(--akqa-muted)]">
              Retros you create on this device will appear here.
            </p>
          ) : (
            <ul className="akqaretro-landing__my-retros-list flex flex-col gap-2 list-none p-0 m-0">
              {myRetros.map((retro) => (
                <li key={retro.id} className="akqaretro-landing__my-retros-item">
                  <a
                    href={`/r/${retro.token}`}
                    className="akqaretro-landing__my-retros-link flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2 px-0 border-b border-[var(--akqa-border)] last:border-0 text-[var(--foreground)] no-underline hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)]"
                  >
                    <span className="font-medium">{retro.title}</span>
                    <span className="text-xs text-[var(--akqa-muted)]">{formatDate(retro.date)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
