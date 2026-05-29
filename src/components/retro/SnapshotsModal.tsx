"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SnapshotListItem, SnapshotDetail, ColumnConfigItem } from "@/types/retro";

interface SnapshotsModalProps {
  token: string;
  isOpen: boolean;
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function SnapshotsModal({ token, isOpen, onClose, returnFocusRef }: SnapshotsModalProps) {
  const [list, setList] = useState<SnapshotListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<SnapshotDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const fetchList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/retros/${token}/snapshots`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setList(json);
      } else setList([]);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isOpen) {
      fetchList();
      setDetail(null);
    }
  }, [isOpen, fetchList]);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    requestAnimationFrame(() => {
      const panel = panelRef.current;
      const first = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      first?.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const returnTo = returnFocusRef?.current ?? previouslyFocusedRef.current;
      returnTo?.focus();
    };
  }, [isOpen, onClose, returnFocusRef]);

  const openSnapshot = useCallback(
    async (snapshotId: string) => {
      setDetailLoading(true);
      setDetail(null);
      try {
        const res = await fetch(`/api/retros/${token}/snapshots/${snapshotId}`, {
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          setDetail(json);
        }
      } finally {
        setDetailLoading(false);
      }
    },
    [token]
  );

  if (!isOpen) return null;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const dateStr = d.toLocaleDateString(undefined, { dateStyle: "medium" });
    const timeStr = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    return `${dateStr}, ${timeStr}`;
  };

  return (
    <div
      className="akqaretro-snapshots-modal fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="akqaretro-snapshots-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        className="akqaretro-snapshots-modal__panel flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden border border-[var(--akqa-border)] bg-[var(--surface-elevated)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="akqaretro-snapshots-modal__header flex items-center justify-between border-b border-[var(--akqa-border)] px-4 py-3">
          <h2 id="akqaretro-snapshots-modal-title" className="akqaretro-headline text-lg font-normal text-[var(--foreground)]">
            Snapshots
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="akqaretro-snapshots-modal__close akqaretro-touch-target border border-[var(--akqa-border)] text-[var(--akqa-muted)] hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)]"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="akqaretro-snapshots-modal__body flex min-h-0 flex-1 flex-col overflow-auto p-4">
          {detail ? (
            <div className="akqaretro-snapshots-modal__detail">
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="akqaretro-snapshots-modal__back akqaretro-touch-target mb-3 text-sm text-[var(--akqa-dove)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)]"
              >
                ← Back to list
              </button>
              <p className="akqaretro-caption text-[var(--akqa-muted)] mb-3">
                Snapshot from {formatDate(detail.createdAt)} (read-only)
              </p>
              <SnapshotDetailView columnConfig={detail.columnConfig} cards={detail.cards} />
            </div>
          ) : detailLoading ? (
            <p className="akqaretro-caption text-[var(--akqa-muted)]">Loading…</p>
          ) : list.length === 0 && !loading ? (
            <p className="akqaretro-caption text-[var(--akqa-muted)]">No snapshots yet. Use Snapshot to save the board and start a fresh one.</p>
          ) : loading ? (
            <p className="akqaretro-caption text-[var(--akqa-muted)]">Loading…</p>
          ) : (
            <ul className="akqaretro-snapshots-modal__list flex flex-col gap-1">
              {list.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => openSnapshot(s.id)}
                    className="akqaretro-snapshots-modal__item akqaretro-sharp akqaretro-touch-target w-full border border-[var(--akqa-border)] bg-[var(--surface-input)] px-4 py-3 text-left text-sm text-[var(--foreground)] hover:bg-[var(--akqa-border)]/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)]"
                  >
                    {formatDate(s.createdAt)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SnapshotDetailView({
  columnConfig,
  cards,
}: {
  columnConfig: ColumnConfigItem[];
  cards: SnapshotDetail["cards"];
}) {
  const byColumn = columnConfig.reduce(
    (acc, col) => {
      acc[col.id] = cards.filter((c) => c.column === col.id).sort((a, b) => a.orderKey.localeCompare(b.orderKey));
      return acc;
    },
    {} as Record<string, SnapshotDetail["cards"]>
  );

  return (
    <div
      className="akqaretro-snapshots-detail"
      style={{ "--akqaretro-col-count": columnConfig.length } as React.CSSProperties}
    >
      {columnConfig.map((col) => (
        <div key={col.id} className="akqaretro-snapshots-detail__column flex flex-col gap-2">
          <h3 className="akqaretro-snapshots-detail__col-title akqaretro-headline text-xs font-normal text-[var(--akqa-muted)] uppercase tracking-wide">
            {col.title}
          </h3>
          <div className="akqaretro-snapshots-detail__cards flex flex-col gap-1.5">
            {(byColumn[col.id] ?? []).map((c) => (
              <div
                key={c.id}
                className={`akqaretro-snapshots-detail__card border border-[var(--akqa-border)] bg-[var(--surface-input)] px-3 py-2 text-xs text-[var(--foreground)] ${c.done ? "opacity-60 line-through" : ""}`}
              >
                {c.text || "\u00a0"}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
