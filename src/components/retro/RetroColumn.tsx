"use client";

import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { RetroCard, ColumnConfigItem } from "@/types/retro";
import { RetroCardItem } from "./RetroCardItem";
import { RetroDraftCard } from "./RetroDraftCard";
import { LIMITS } from "@/lib/validation";

interface RetroColumnProps {
  columnId: string;
  columnTitle: string;
  isFixed: boolean;
  cards: RetroCard[];
  sortMode: "votes" | "order";
  onSortModeChange: (columnId: string, mode: "votes" | "order") => void;
  voterId: string;
  creatorId?: string;
  votesRemaining: number;
  voteCountsHidden?: boolean;
  token: string;
  columnConfig: ColumnConfigItem[];
  onColumnConfigChange: (newConfig: ColumnConfigItem[]) => void;
  onRefetch: () => void;
  onVoteAddOptimistic: (cardId: string) => void;
  onVoteRemoveOptimistic: (cardId: string) => void;
}

export function RetroColumn({
  columnId,
  columnTitle,
  isFixed,
  cards,
  sortMode,
  onSortModeChange,
  voterId,
  creatorId,
  votesRemaining,
  voteCountsHidden,
  token,
  columnConfig,
  onColumnConfigChange,
  onRefetch,
  onVoteAddOptimistic,
  onVoteRemoveOptimistic,
}: RetroColumnProps) {
  const [hasDraft, setHasDraft] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(columnTitle);
  useEffect(() => {
    if (!editingTitle) setTitleValue(columnTitle);
  }, [columnTitle, editingTitle]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleAddCard = useCallback(() => {
    setHasDraft(true);
  }, []);

  const handleDraftSaved = useCallback(() => {
    setHasDraft(false);
    onRefetch();
  }, [onRefetch]);

  const handleDraftCancel = useCallback(() => {
    setHasDraft(false);
  }, []);

  const saveColumnConfig = useCallback(
    async (newConfig: ColumnConfigItem[]) => {
      const url = creatorId
        ? `/api/retros/${token}?creatorId=${encodeURIComponent(creatorId)}`
        : `/api/retros/${token}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ columnConfig: newConfig }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(data.error ?? "Could not update columns.");
        return;
      }
      onRefetch();
    },
    [token, creatorId, onRefetch]
  );

  const handleTitleBlur = useCallback(() => {
    setEditingTitle(false);
    const trimmed = titleValue.trim().slice(0, LIMITS.COLUMN_TITLE_MAX_LENGTH);
    if (trimmed === columnTitle) return;
    if (!trimmed) {
      setTitleValue(columnTitle);
      return;
    }
    const newConfig = columnConfig.map((c) =>
      c.id === columnId ? { ...c, title: trimmed } : c
    );
    onColumnConfigChange(newConfig);
    saveColumnConfig(newConfig);
    setTitleValue(trimmed);
  }, [columnId, columnTitle, columnConfig, titleValue, onColumnConfigChange, saveColumnConfig]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
    },
    []
  );

  const handleRemoveColumn = useCallback(() => {
    const confirmed = window.confirm(
      `Remove column “${columnTitle}”? All cards in this column will be deleted.`
    );
    if (!confirmed) return;
    const newConfig = columnConfig.filter((c) => c.id !== columnId);
    onColumnConfigChange(newConfig);
    saveColumnConfig(newConfig);
  }, [columnId, columnTitle, columnConfig, onColumnConfigChange, saveColumnConfig]);

  const handleReorder = useCallback(
    async (activeId: string, overId: string) => {
      const overIsMerge = String(overId).startsWith("merge-");
      if (overIsMerge) {
        const targetCardId = String(overId).replace(/^merge-/, "");
        if (targetCardId === activeId) return;
        const res = await fetch(`/api/cards/${targetCardId}/merge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceCardId: activeId }),
        });
        if (!res.ok) return;
        onRefetch();
        return;
      }
      const sortedIds = cards.map((c) => c.id);
      const oldIndex = sortedIds.indexOf(activeId);
      const newIndex = sortedIds.indexOf(overId as string);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const res = await fetch(`/api/cards/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newIndex }),
      });
      if (!res.ok) return;
      onRefetch();
    },
    [cards, onRefetch]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      handleReorder(String(active.id), String(over.id));
    },
    [handleReorder]
  );

  return (
    <div className="akqaretro-column flex flex-col border border-[var(--akqa-border)] bg-[var(--akqa-white)] dark:bg-[#2a2a2a] min-h-[320px] min-w-0">
      <div className="akqaretro-column__header flex items-center justify-between gap-2 p-4 border-b border-[var(--akqa-border)]">
        <div className="akqaretro-column__title-wrap flex-1 min-w-0 flex items-center gap-2">
          {isFixed ? (
            <h2 className="akqaretro-column__title akqaretro-headline text-lg font-normal text-[var(--foreground)] truncate">
              {columnTitle}
            </h2>
          ) : editingTitle ? (
            <input
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              className="akqaretro-column__title-input flex-1 min-w-0 text-lg font-normal text-[var(--foreground)] bg-[var(--background)] border border-[var(--akqa-border)] px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--akqa-dove)]"
              aria-label="Column title"
              maxLength={LIMITS.COLUMN_TITLE_MAX_LENGTH}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="akqaretro-column__title-btn akqaretro-headline text-lg font-normal text-[var(--foreground)] truncate text-left hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)]"
            >
              {columnTitle}
            </button>
          )}
        </div>
        <div className="akqaretro-column__header-actions flex flex-wrap items-center gap-2 shrink-0">
          <label className="akqaretro-column__sort-label flex items-center gap-1.5 text-[var(--akqa-muted)]">
            <span className="akqaretro-column__sort-text text-xs whitespace-nowrap">Sort:</span>
            <select
              value={sortMode}
              onChange={(e) => onSortModeChange(columnId, e.target.value as "votes" | "order")}
              aria-label={`Sort ${columnTitle} by`}
              className="akqaretro-column__sort-select text-xs bg-[var(--background)] border border-[var(--akqa-border)] text-[var(--foreground)] px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)] cursor-pointer"
            >
              <option value="votes">By Votes</option>
              <option value="order">by Added</option>
            </select>
          </label>
          {!isFixed && (
            <button
              type="button"
              onClick={handleRemoveColumn}
              aria-label={`Remove column ${columnTitle}`}
              className="akqaretro-column__remove text-sm text-[var(--akqa-muted)] hover:text-red-600 dark:hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)] px-2 py-1 rounded border-0 bg-transparent cursor-pointer"
            >
              Remove
            </button>
          )}
          <button
            type="button"
            onClick={handleAddCard}
            disabled={hasDraft}
            className="akqaretro-column__add bg-[var(--akqa-dove)] text-[var(--akqa-white)] px-4 py-2 text-sm font-medium hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)] focus-visible:ring-offset-2 disabled:opacity-50"
            aria-label={`Add card to ${columnTitle}`}
          >
            Add
          </button>
        </div>
      </div>
      <div className="akqaretro-column__list flex-1 p-4 overflow-auto min-h-0">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {cards.map((card) => (
              <RetroCardItem
                key={card.id}
                card={card}
                voterId={voterId}
                votesRemaining={votesRemaining}
                voteCountsHidden={voteCountsHidden}
                onRefetch={onRefetch}
                onVoteAddOptimistic={onVoteAddOptimistic}
                onVoteRemoveOptimistic={onVoteRemoveOptimistic}
              />
            ))}
          </SortableContext>
          {hasDraft && (
            <RetroDraftCard
              token={token}
              column={columnId}
              creatorId={creatorId}
              onSaved={handleDraftSaved}
              onCancel={handleDraftCancel}
            />
          )}
        </DndContext>
      </div>
    </div>
  );
}
