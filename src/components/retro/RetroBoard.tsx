"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getVoterId } from "@/lib/voterId";
import type { RetroState, RetroCard, ColumnConfigItem } from "@/types/retro";
import { RetroColumn } from "./RetroColumn";

const POLL_INTERVAL_MS = 1500;

interface RetroBoardProps {
  token: string;
  initial?: RetroState | null;
}

export function RetroBoard({ token, initial }: RetroBoardProps) {
  const [data, setData] = useState<RetroState | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState("");
  const voterIdRef = useRef<string | undefined>(undefined);
  if (voterIdRef.current === undefined) voterIdRef.current = getVoterId();
  const voterId = voterIdRef.current;

  const fetchRetro = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetch(
          `/api/retros/${token}?voterId=${encodeURIComponent(voterId)}`,
          { signal: signal ?? null }
        );
        if (!res.ok) {
          if (res.status === 404) setError("Retro not found");
          return;
        }
        const json = await res.json();
        setData(json);
        setError("");
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("Failed to load retro");
      } finally {
        setLoading(false);
      }
    },
    [token, voterId]
  );

  useEffect(() => {
    const ac = new AbortController();
    fetchRetro(ac.signal);
    return () => ac.abort();
  }, [fetchRetro]);

  useEffect(() => {
    if (!token) return;
    const ac = new AbortController();
    const t = setInterval(() => fetchRetro(ac.signal), POLL_INTERVAL_MS);
    return () => {
      clearInterval(t);
      ac.abort();
    };
  }, [token, fetchRetro]);

  useEffect(() => {
    if (!token) return;
    let ac: AbortController | null = null;
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        ac = new AbortController();
        fetchRetro(ac.signal);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      ac?.abort();
    };
  }, [token, fetchRetro]);

  const refetch = useCallback(() => {
    fetchRetro();
  }, [fetchRetro]);

  const handleColumnConfigChange = useCallback(
    (newConfig: ColumnConfigItem[]) => {
      setData((prev) => (prev ? { ...prev, columnConfig: newConfig } : null));
    },
    []
  );

  const handleAddColumn = useCallback(async () => {
    if (!data) return;
    const newId = crypto.randomUUID();
    const newConfig = [
      ...data.columnConfig,
      { id: newId, title: "New column", order: data.columnConfig.length },
    ];
    const url = voterId
      ? `/api/retros/${token}?creatorId=${encodeURIComponent(voterId)}`
      : `/api/retros/${token}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ columnConfig: newConfig }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      window.alert(json.error ?? "Could not add column.");
      return;
    }
    fetchRetro();
  }, [data, token, voterId, fetchRetro]);

  const onVoteAddOptimistic = useCallback((cardId: string) => {
    setData((prev) => {
      if (!prev || prev.votesRemaining <= 0) return prev;
      return {
        ...prev,
        votesRemaining: prev.votesRemaining - 1,
        cards: prev.cards.map((c) =>
          c.id === cardId ? { ...c, voteCount: c.voteCount + 1, userVotesOnCard: c.userVotesOnCard + 1 } : c
        ),
      };
    });
  }, []);

  const onVoteRemoveOptimistic = useCallback((cardId: string) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        votesRemaining: prev.votesRemaining + 1,
        cards: prev.cards.map((c) =>
          c.id === cardId && c.userVotesOnCard > 0
            ? { ...c, voteCount: c.voteCount - 1, userVotesOnCard: c.userVotesOnCard - 1 }
            : c
        ),
      };
    });
  }, []);

  const columnConfig = data?.columnConfig ?? [];
  const cards = data?.cards;
  const cardsByColumn = useMemo(
    () => {
      if (!cards) return {} as Record<string, RetroCard[]>;
      return columnConfig.reduce(
        (acc, col) => {
          acc[col.id] = cards
            .filter((c) => c.column === col.id)
            .sort((a, b) => (a.orderKey < b.orderKey ? -1 : 1));
          return acc;
        },
        {} as Record<string, RetroCard[]>
      );
    },
    [cards, columnConfig]
  );

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

  return (
    <div className="akqaretro-board flex flex-col gap-6">
      <header className="akqaretro-board__header flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="akqaretro-board__title akqaretro-headline text-xl font-normal text-[var(--foreground)]">
            {data.title}
          </h1>
          <p className="akqaretro-board__date akqaretro-caption text-[var(--akqa-muted)]">{data.date}</p>
        </div>
        <div className="akqaretro-board__header-right flex items-center gap-4">
          <button
            type="button"
            onClick={handleAddColumn}
            className="akqaretro-board__add-column text-sm text-[var(--akqa-muted)] hover:text-[var(--foreground)] border border-[var(--akqa-border)] bg-transparent px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)]"
            aria-label="Add column"
          >
            Add column
          </button>
          <div className="akqaretro-board__votes flex items-center gap-2 border border-[var(--akqa-border)] bg-[var(--akqa-white)] dark:bg-[#2a2a2a] px-4 py-2 akqaretro-caption" role="status" aria-live="polite">
            <span className="akqaretro-board__votes-label text-[var(--akqa-muted)]">
              Your votes:
            </span>
            <span className="akqaretro-board__votes-remaining text-[var(--foreground)]">
              {data.votesRemaining} / {data.votesPerUserCap} left
            </span>
          </div>
        </div>
      </header>
      <div className="akqaretro-board__columns grid grid-cols-1 md:grid-cols-3 gap-6 min-w-0" style={{ gridTemplateColumns: `repeat(${columnConfig.length}, minmax(0, 1fr))` }}>
        {columnConfig.map((col) => (
          <RetroColumn
            key={col.id}
            columnId={col.id}
            columnTitle={col.title}
            isFixed={Boolean(col.fixed)}
            cards={cardsByColumn[col.id] ?? []}
            voterId={voterId}
            creatorId={voterId}
            votesRemaining={data.votesRemaining}
            token={token}
            columnConfig={columnConfig}
            onColumnConfigChange={handleColumnConfigChange}
            onRefetch={refetch}
            onVoteAddOptimistic={onVoteAddOptimistic}
            onVoteRemoveOptimistic={onVoteRemoveOptimistic}
          />
        ))}
      </div>
    </div>
  );
}
