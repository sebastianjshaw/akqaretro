"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getVoterId } from "@/lib/voterId";
import type { RetroState, RetroCard, ColumnConfigItem } from "@/types/retro";
import { ACTIONS_COLUMN_ID, ensureActionsLast } from "@/types/retro";
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
  const [columnSortMode, setColumnSortMode] = useState<Record<string, "votes" | "order">>({});
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
    const withoutActions = data.columnConfig.filter((c) => c.id !== ACTIONS_COLUMN_ID);
    const actionsCol = data.columnConfig.find((c) => c.id === ACTIONS_COLUMN_ID);
    const newConfig = ensureActionsLast([
      { id: newId, title: "New column", order: 0 },
      ...withoutActions.map((c, i) => ({ ...c, order: i + 1 })),
      ...(actionsCol ? [actionsCol] : []),
    ]);
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
          const columnCards = cards.filter((c) => c.column === col.id);
          const mode = columnSortMode[col.id] ?? "votes";
          acc[col.id] =
            mode === "order"
              ? [...columnCards].sort((a, b) => (a.orderKey < b.orderKey ? -1 : 1))
              : [...columnCards].sort((a, b) => {
                  if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
                  return a.orderKey < b.orderKey ? -1 : 1;
                });
          return acc;
        },
        {} as Record<string, RetroCard[]>
      );
    },
    [cards, columnConfig, columnSortMode]
  );

  const handleColumnSortModeChange = useCallback((columnId: string, mode: "votes" | "order") => {
    setColumnSortMode((prev) => ({ ...prev, [columnId]: mode }));
  }, []);

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
        <div className="akqaretro-board__header-right flex flex-wrap items-center gap-4">
          {data.isOwner && (
            <div className="akqaretro-board__owner-toggles flex items-center gap-4 border border-[var(--akqa-border)] bg-[var(--akqa-white)] dark:bg-[#2a2a2a] px-4 py-2 akqaretro-caption">
              <label className="akqaretro-board__toggle-hide-posts flex items-center gap-2 cursor-pointer text-[var(--akqa-muted)] hover:text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={Boolean(data.hideCardsFromNonOwners)}
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    setData((prev) => (prev ? { ...prev, hideCardsFromNonOwners: checked } : null));
                    const url = voterId ? `/api/retros/${token}?creatorId=${encodeURIComponent(voterId)}` : `/api/retros/${token}`;
                    const res = await fetch(url, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ hideCardsFromNonOwners: checked }),
                    });
                    if (!res.ok) fetchRetro();
                  }}
                  className="akqaretro-board__toggle-hide-posts-input"
                  aria-label="Hide posts from others until disabled"
                />
                <span className="akqaretro-board__toggle-hide-posts-label">Hide posts from others</span>
              </label>
              <label className="akqaretro-board__toggle-hide-votes flex items-center gap-2 cursor-pointer text-[var(--akqa-muted)] hover:text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={Boolean(data.voteCountsHidden)}
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    setData((prev) => (prev ? { ...prev, voteCountsHidden: checked } : null));
                    const url = voterId ? `/api/retros/${token}?creatorId=${encodeURIComponent(voterId)}` : `/api/retros/${token}`;
                    const res = await fetch(url, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ hideVoteCounts: checked }),
                    });
                    if (!res.ok) fetchRetro();
                  }}
                  className="akqaretro-board__toggle-hide-votes-input"
                  aria-label="Hide vote counts for everyone"
                />
                <span className="akqaretro-board__toggle-hide-votes-label">Hide vote counts</span>
              </label>
            </div>
          )}
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
            sortMode={columnSortMode[col.id] ?? "votes"}
            onSortModeChange={handleColumnSortModeChange}
            voterId={voterId}
            creatorId={voterId}
            votesRemaining={data.votesRemaining}
            voteCountsHidden={Boolean(data.voteCountsHidden)}
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
