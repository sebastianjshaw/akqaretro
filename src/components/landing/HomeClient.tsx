"use client";

import type { Session } from "next-auth";
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

interface HomeClientProps {
  session: Session | null;
}

export function HomeClient({ session }: HomeClientProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [myRetros, setMyRetros] = useState<RetroSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");
  const [deletingToken, setDeletingToken] = useState<string | null>(null);
  const creatorId = getVoterId();

  const fetchMyRetros = useCallback(async () => {
    setLoadingList(true);
    setListError("");
    try {
      const params = new URLSearchParams();
      if (creatorId) params.set("creatorId", creatorId);
      const previousUserId =
        typeof window !== "undefined" ? localStorage.getItem("akqaretro_last_user_id") : null;
      if (previousUserId) params.set("previousUserId", previousUserId);
      const url = params.toString() ? `/api/retros?${params}` : "/api/retros";
      const res = await fetch(url, {
        credentials: "include",
        cache: "no-store",
        headers: { Pragma: "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        setMyRetros(Array.isArray(data) ? data : []);
        if (session?.user && typeof window !== "undefined") {
          const id = (session.user as { id?: string }).id;
          if (id) localStorage.setItem("akqaretro_last_user_id", id);
        }
        return;
      }
      const errJson = await res.json().catch(() => ({}));
      const msg = typeof errJson.error === "string" ? errJson.error : "";
      // 400 = no session and no creatorId; fall back to device-only list when not signed in
      if (res.status === 400 && creatorId) {
        const resDevice = await fetch(
          `/api/retros?creatorId=${encodeURIComponent(creatorId)}`,
          { credentials: "include", cache: "no-store" }
        );
        if (resDevice.ok) {
          const data = await resDevice.json();
          setMyRetros(Array.isArray(data) ? data : []);
          return;
        }
        const devErr = await resDevice.json().catch(() => ({}));
        setListError(typeof devErr.error === "string" ? devErr.error : msg || "Could not load your retros.");
        setMyRetros([]);
        return;
      }
      setListError(msg || "Could not load your retros.");
      setMyRetros([]);
    } catch {
      setListError("Network error loading retros.");
      setMyRetros([]);
    } finally {
      setLoadingList(false);
    }
  }, [creatorId, session]);

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
        credentials: "include",
        body: JSON.stringify({ title, date, creatorId: session ? undefined : creatorId }),
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

  async function handleDeleteRetro(e: React.MouseEvent, retro: RetroSummary) {
    e.preventDefault();
    e.stopPropagation();
    const confirmed = window.confirm(
      `Delete “${retro.title}”? This cannot be undone.`
    );
    if (!confirmed) return;
    setDeletingToken(retro.token);
    try {
      const res = await fetch(`/api/retros/${retro.token}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 204) {
        setMyRetros((prev) => prev.filter((r) => r.token !== retro.token));
      } else {
        const data = await res.json().catch(() => ({}));
        window.alert(data.error ?? "Could not delete retro.");
      }
    } catch {
      window.alert("Could not delete retro.");
    } finally {
      setDeletingToken(null);
    }
  }

  /** Use GET start-google so the redirect to Google is returned by a Route Handler with Set-Cookie (reliable cookie delivery). */
  function handleSignInWithGoogle() {
    window.location.href = "/api/auth/start-google?callbackUrl=/";
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
      <div className="akqaretro-landing__main w-full max-w-lg flex flex-col gap-8">
        <div className="akqaretro-landing__auth flex justify-end w-full">
          {session ? (
            <div className="akqaretro-landing__user flex items-center gap-3">
              <span className="akqaretro-caption text-[var(--akqa-muted)] truncate max-w-[180px]" title={session.user.email ?? undefined}>
                {session.user.email ?? session.user.name ?? "Signed in"}
              </span>
              <a
                href="/api/auth/signout?callbackUrl=/"
                className="akqaretro-landing__signout text-sm text-[var(--akqa-muted)] hover:text-[var(--foreground)] underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)]"
              >
                Sign out
              </a>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSignInWithGoogle}
              className="akqaretro-landing__signin text-sm text-[var(--akqa-dove)] dark:text-[var(--akqa-dusty)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)] bg-transparent border-none cursor-pointer p-0 font-inherit"
            >
              Sign in with Google
            </button>
          )}
        </div>

        <section className="akqaretro-landing__create border border-[var(--akqa-border)] bg-[var(--surface-elevated)] shadow-lg p-8" aria-labelledby="akqaretro-create-heading">
          <h1 id="akqaretro-create-heading" className="akqaretro-landing__title akqaretro-headline text-2xl font-normal text-[var(--foreground)] mb-2 tracking-wide">
            New retrospective
          </h1>
          <p className="akqaretro-landing__subtitle akqaretro-subtitle text-sm leading-snug text-[var(--akqa-muted)] mb-6">
            Create a board and share the link with your team.
          </p>
          <form onSubmit={handleSubmit} className="akqaretro-landing__form flex flex-col gap-4">
            <label htmlFor="akqaretro-title" className="akqaretro-landing__label text-sm text-[var(--foreground)]">
              Title
            </label>
            <input
              id="akqaretro-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sprint 42 Retro"
              className="akqaretro-landing__input w-full border border-[var(--akqa-border)] bg-[var(--surface-input)] text-[var(--foreground)] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--akqa-dove)]"
              required
            />
            <label htmlFor="akqaretro-date" className="akqaretro-landing__label text-sm text-[var(--foreground)]">
              Date
            </label>
            <input
              id="akqaretro-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="akqaretro-landing__input w-full border border-[var(--akqa-border)] bg-[var(--surface-input)] text-[var(--foreground)] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--akqa-dove)]"
            />
            {error && (
              <p className="akqaretro-landing__error text-sm akqaretro-text-error" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              aria-disabled={loading}
              className="akqaretro-landing__submit mt-2 bg-[var(--akqa-dove)] text-[var(--akqa-white)] font-medium px-4 py-3 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)] focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create retrospective"}
            </button>
          </form>
        </section>

        <section className="akqaretro-landing__my-retros border border-[var(--akqa-border)] bg-[var(--surface-elevated)] p-6" aria-labelledby="akqaretro-my-retros-heading">
          <div className="akqaretro-landing__my-retros-header flex items-center justify-between gap-2 mb-3">
            <h2 id="akqaretro-my-retros-heading" className="akqaretro-landing__my-retros-title akqaretro-headline text-lg font-normal text-[var(--foreground)] tracking-wide">
              My retros
            </h2>
            <button
              type="button"
              onClick={() => fetchMyRetros()}
              disabled={loadingList}
              aria-label="Refresh list"
              className="akqaretro-landing__my-retros-refresh akqaretro-sharp text-sm text-[var(--akqa-muted)] hover:text-[var(--foreground)] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)] px-2 py-1 border-0 bg-transparent cursor-pointer"
            >
              {loadingList ? "…" : "Refresh"}
            </button>
          </div>
          {loadingList ? (
            <p className="akqaretro-landing__my-retros-loading akqaretro-caption text-[var(--akqa-muted)]">Loading…</p>
          ) : listError ? (
            <div className="akqaretro-landing__my-retros-error flex flex-col gap-2">
              <p className="akqaretro-landing__my-retros-error-text text-sm akqaretro-text-error" role="alert">
                {listError}
              </p>
              <p className="akqaretro-landing__my-retros-error-hint akqaretro-caption text-[var(--akqa-muted)]">
                Data is stored on the server (Neon). This usually means the database is unreachable from production — check Vercel env vars{" "}
                <code className="text-xs">DATABASE_URL</code> / <code className="text-xs">DIRECT_URL</code> and open{" "}
                <a href="/api/health/db" className="underline text-[var(--akqa-dove)]">
                  /api/health/db
                </a>{" "}
                to test the connection.
              </p>
            </div>
          ) : myRetros.length === 0 ? (
            <p className="akqaretro-landing__my-retros-empty akqaretro-caption text-[var(--akqa-muted)]">
              {session ? "Retros you create while signed in will appear here." : "Retros you create on this device will appear here."}
            </p>
          ) : (
            <ul className="akqaretro-landing__my-retros-list flex flex-col gap-2 list-none p-0 m-0">
              {myRetros.map((retro) => (
                <li key={retro.id} className="akqaretro-landing__my-retros-item flex items-center gap-2 py-2 border-b border-[var(--akqa-border)] last:border-0">
                  <a
                    href={`/r/${retro.token}`}
                    className="akqaretro-landing__my-retros-link flex flex-1 flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-0 min-w-0 text-[var(--foreground)] no-underline hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)]"
                  >
                    <span className="font-medium truncate">{retro.title}</span>
                    <span className="akqaretro-caption text-[var(--akqa-muted)] shrink-0">{formatDate(retro.date)}</span>
                  </a>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteRetro(e, retro)}
                    disabled={deletingToken === retro.token}
                    aria-label={`Delete ${retro.title}`}
                    className="akqaretro-landing__my-retros-delete akqaretro-sharp shrink-0 text-sm text-[var(--akqa-muted)] hover:text-[var(--akqa-error)] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)] px-2 py-1 border-0 bg-transparent cursor-pointer"
                  >
                    {deletingToken === retro.token ? "…" : "Delete"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <PrivacyNotice />
      </div>
    </div>
  );
}

function PrivacyNotice() {
  return (
    <p className="akqaretro-landing__privacy akqaretro-caption text-[var(--akqa-muted)] max-w-lg" role="note">
      This app stores an anonymous identifier in your browser for voting. Sign in with Google to attach retros you create to your account.
    </p>
  );
}
