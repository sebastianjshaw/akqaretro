"use client";

import { useCallback, useEffect, useState } from "react";
import { getVoterId } from "@/lib/voterId";
import type { RetroState, RetroCard, ColumnType } from "@/types/retro";
import { RetroColumn } from "./RetroColumn";

const COLUMNS: ColumnType[] = ["positive", "negative", "actions"];
const POLL_INTERVAL_MS = 4000;

interface RetroBoardProps {
  token: string;
  initial?: RetroState | null;
}

export function RetroBoard({ token, initial }: RetroBoardProps) {
  const [data, setData] = useState<RetroState | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState("");
  const voterId = getVoterId();

  const fetchRetro = useCallback(async () => {
    try {
      const res = await fetch(`/api/retros/${token}?voterId=${encodeURIComponent(voterId)}`);
      if (!res.ok) {
        if (res.status === 404) setError("Retro not found");
        return;
      }
      const json = await res.json();
      setData(json);
      setError("");
    } catch {
      setError("Failed to load retro");
    } finally {
      setLoading(false);
    }
  }, [token, voterId]);

  useEffect(() => {
    fetchRetro();
  }, [fetchRetro]);

  useEffect(() => {
    if (!token) return;
    const t = setInterval(fetchRetro, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [token, fetchRetro]);

  const refetch = useCallback(() => {
    fetchRetro();
  }, [fetchRetro]);

  if (loading && !data) {
    return (
      <div className="akqaretro-board akqaretro-board--loading flex min-h-[40vh] items-center justify-center text-[var(--akqa-muted)]" role="status" aria-live="polite">
        Loading…
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="akqaretro-board akqaretro-board--error flex min-h-[40vh] items-center justify-center text-red-600" role="alert">
        {error}
      </div>
    );
  }
  if (!data) return null;

  const cardsByColumn = COLUMNS.reduce(
    (acc, col) => {
      acc[col] = data.cards.filter((c) => c.column === col).sort((a, b) => (a.orderKey < b.orderKey ? -1 : 1));
      return acc;
    },
    {} as Record<ColumnType, RetroCard[]>
  );

  return (
    <div className="akqaretro-board flex flex-col gap-6">
      <header className="akqaretro-board__header flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="akqaretro-board__title text-xl font-bold text-[var(--foreground)]">
            {data.title}
          </h1>
          <p className="akqaretro-board__date text-sm text-[var(--akqa-muted)]">{data.date}</p>
        </div>
        <div className="akqaretro-board__votes flex items-center gap-2 border border-[var(--akqa-border)] bg-[var(--akqa-white)] dark:bg-[#2a2a2a] px-4 py-2 text-sm" role="status" aria-live="polite">
          <span className="akqaretro-board__votes-label text-[var(--akqa-muted)]">
            Your votes:
          </span>
          <span className="akqaretro-board__votes-remaining font-medium text-[var(--foreground)]">
            {data.votesRemaining} / {data.votesPerUserCap} left
          </span>
        </div>
      </header>
      <div className="akqaretro-board__columns grid grid-cols-1 md:grid-cols-3 gap-6 min-w-0">
        {COLUMNS.map((column) => (
          <RetroColumn
            key={column}
            column={column}
            cards={cardsByColumn[column]}
            voterId={voterId}
            votesRemaining={data.votesRemaining}
            token={token}
            onRefetch={refetch}
          />
        ))}
      </div>
    </div>
  );
}
