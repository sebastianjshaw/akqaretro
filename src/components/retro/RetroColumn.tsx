"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCenter,
  type CollisionDetection,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { RetroCard, ColumnConfigItem } from "@/types/retro";
import { RetroCardItem } from "./RetroCardItem";
import { RetroDraftCard } from "./RetroDraftCard";
import { LIMITS } from "@/lib/validation";
import { useAkqaretroDialog } from "./AkqaretroDialog";

/** Prefer merge drop zones over sortable card ids when the pointer is over a card body. */
const preferMergeCollision: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  const activeCardId = String(args.active.id);
  const mergeHit = pointerHits.find(
    (c) => String(c.id).startsWith("merge-") && String(c.id) !== `merge-${activeCardId}`
  );
  if (mergeHit) return [mergeHit];
  return closestCenter(args);
};

function mergeDropIdFromCollisions(
  collisions: DragEndEvent["collisions"],
  activeCardId: string
): string | null {
  const hit = collisions?.find(
    (c) => String(c.id).startsWith("merge-") && String(c.id) !== `merge-${activeCardId}`
  );
  return hit ? String(hit.id) : null;
}

interface RetroColumnProps {
  columnId: string;
  columnTitle: string;
  isFixed: boolean;
  isActionsColumn?: boolean;
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
  onEditingChange: (editing: boolean) => void;
}

function RetroColumnInner({
  columnId,
  columnTitle,
  isFixed,
  isActionsColumn,
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
  onEditingChange,
}: RetroColumnProps) {
  const { confirm, alert, dialog } = useAkqaretroDialog();
  const [hasDraft, setHasDraft] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(columnTitle);
  useEffect(() => {
    if (!editingTitle) setTitleValue(columnTitle);
  }, [columnTitle, editingTitle]);

  useEffect(() => {
    if (editingTitle) {
      onEditingChange(true);
      return () => onEditingChange(false);
    }
  }, [editingTitle, onEditingChange]);

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
      const res = await fetch(`/api/retros/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ columnConfig: newConfig }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        await alert(data.error ?? "Could not update columns.");
        return;
      }
      onRefetch();
    },
    [token, onRefetch, alert]
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

  const handleRemoveColumn = useCallback(async () => {
    const confirmed = await confirm(
      `Remove column “${columnTitle}”? All cards in this column will be deleted.`,
      { title: "Remove column", confirmLabel: "Remove", destructive: true }
    );
    if (!confirmed) return;
    const newConfig = columnConfig.filter((c) => c.id !== columnId);
    onColumnConfigChange(newConfig);
    saveColumnConfig(newConfig);
  }, [columnId, columnTitle, columnConfig, onColumnConfigChange, saveColumnConfig, confirm]);

  const handleReorder = useCallback(
    async (activeId: string, overId: string) => {
      const overIsMerge = String(overId).startsWith("merge-");
      if (overIsMerge) {
        const targetCardId = String(overId).replace(/^merge-/, "");
        if (targetCardId === activeId) return;
        const res = await fetch(`/api/cards/${targetCardId}/merge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceCardId: activeId, retroToken: token }),
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
        body: JSON.stringify({ newIndex, retroToken: token }),
      });
      if (!res.ok) return;
      onRefetch();
    },
    [cards, onRefetch, token]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over, collisions } = event;
      const activeId = String(active.id);
      const mergeDropId = mergeDropIdFromCollisions(collisions, activeId);
      const overId = mergeDropId ?? (over ? String(over.id) : null);
      if (!overId) return;
      handleReorder(activeId, overId);
    },
    [handleReorder]
  );

  return (
    <div className="akqaretro-column flex flex-col border border-[var(--akqa-border)] bg-[var(--surface-elevated)] min-h-[320px] min-w-0">
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
              className="akqaretro-column__sort-select akqaretro-sharp text-xs bg-[var(--background)] border border-[var(--akqa-border)] text-[var(--foreground)] px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)] cursor-pointer"
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
              className="akqaretro-column__remove akqaretro-sharp text-sm text-[var(--akqa-muted)] hover:text-[var(--akqa-error)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)] px-2 py-1 border-0 bg-transparent cursor-pointer"
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
        <DndContext sensors={sensors} collisionDetection={preferMergeCollision} onDragEnd={handleDragEnd}>
          <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {cards.map((card) => (
              <RetroCardItem
                key={card.id}
                card={card}
                token={token}
                voterId={voterId}
                votesRemaining={votesRemaining}
                voteCountsHidden={voteCountsHidden}
                isActionsColumn={isActionsColumn}
                onRefetch={onRefetch}
                onVoteAddOptimistic={onVoteAddOptimistic}
                onVoteRemoveOptimistic={onVoteRemoveOptimistic}
                onEditingChange={onEditingChange}
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
              onEditingChange={onEditingChange}
            />
          )}
        </DndContext>
      </div>
      {dialog}
    </div>
  );
}

export const RetroColumn = React.memo(RetroColumnInner);
