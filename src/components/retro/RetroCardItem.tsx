"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { RetroCard } from "@/types/retro";
import { CheckIcon, XIcon, PencilIcon, TrashIcon, ThumbsUpIcon } from "./icons";
import { useAkqaretroDialog } from "./AkqaretroDialog";

interface RetroCardItemProps {
  card: RetroCard;
  token: string;
  voterId: string;
  votesRemaining: number;
  voteCountsHidden?: boolean;
  isActionsColumn?: boolean;
  onRefetch: () => void;
  onVoteAddOptimistic: (cardId: string) => void;
  onVoteRemoveOptimistic: (cardId: string) => void;
  onEditingChange: (editing: boolean) => void;
}

function RetroCardItemInner({ card, token, voterId, votesRemaining, voteCountsHidden, isActionsColumn, onRefetch, onVoteAddOptimistic, onVoteRemoveOptimistic, onEditingChange }: RetroCardItemProps) {
  const { confirm, dialog } = useAkqaretroDialog();
  const [text, setText] = useState(card.text);
  // Always start in view mode so other viewers never see an open text box; only the user who clicks Edit does
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);
  const done = card.done ?? false;

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const { setNodeRef: setMergeRef, isOver: isMergeOver } = useDroppable({
    id: `merge-${card.id}`,
  });

  // Only sync server text when not editing, so others' refetch doesn't overwrite in-progress typing
  useEffect(() => {
    if (!isEditing) setText(card.text);
  }, [card.text, isEditing]);

  useEffect(() => {
    if (isEditing) {
      onEditingChange(true);
      return () => onEditingChange(false);
    }
  }, [isEditing, onEditingChange]);

  const handleSave = useCallback(async () => {
    const trimmed = text.trim();
    if (trimmed === card.text) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, retroToken: token }),
      });
      if (res.ok) {
        onRefetch();
        setIsEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }, [text, card.id, card.text, token, onRefetch]);

  const handleDelete = useCallback(async () => {
    if (deleting) return;
    const confirmed = await confirm("Delete this card?", {
      title: "Delete card",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!confirmed) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cards/${card.id}?retroToken=${encodeURIComponent(token)}`, { method: "DELETE" });
      if (res.ok) onRefetch();
    } finally {
      setDeleting(false);
    }
  }, [card.id, deleting, token, onRefetch, confirm]);

  const handleVoteAdd = useCallback(async () => {
    if (votesRemaining <= 0) return;
    onVoteAddOptimistic(card.id);
    try {
      const res = await fetch(`/api/cards/${card.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ retroToken: token }),
      });
      if (!res.ok) onRefetch();
    } catch {
      onRefetch();
    }
  }, [card.id, token, votesRemaining, onRefetch, onVoteAddOptimistic]);

  const handleVoteRemove = useCallback(async () => {
    if (card.userVotesOnCard <= 0) return;
    onVoteRemoveOptimistic(card.id);
    try {
      const res = await fetch(
        `/api/cards/${card.id}/vote?retroToken=${encodeURIComponent(token)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) onRefetch();
    } catch {
      onRefetch();
    }
  }, [card.id, card.userVotesOnCard, token, onRefetch, onVoteRemoveOptimistic]);

  const handleDone = useCallback(async () => {
    if (markingDone || done) return;
    setMarkingDone(true);
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: true, retroToken: token }),
      });
      if (res.ok) onRefetch();
    } finally {
      setMarkingDone(false);
    }
  }, [card.id, done, markingDone, token, onRefetch]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={`akqaretro-card group mb-1.5 border shadow-sm transition-all duration-150 ${
        isDragging ? "akqaretro-card--dragging opacity-80 shadow-md z-10" : ""
      } ${
        isMergeOver
          ? "akqaretro-card--merge-over ring-4 ring-[var(--retro-accent)] ring-offset-2 ring-offset-[var(--surface-input)] border-2 border-dashed border-[var(--retro-accent)] bg-[var(--retro-accent-subtle)] shadow-lg"
          : "bg-[var(--surface-elevated)] border-[var(--akqa-border)]"
      } ${done ? "akqaretro-card--done opacity-60" : ""}`}
    >
      <div ref={setMergeRef} className={`akqaretro-card__inner flex gap-1.5 p-1.5 ${isEditing ? "akqaretro-card__inner--editing" : ""}`}>
        {!isEditing && (
          <button
            type="button"
            className="akqaretro-card__handle flex shrink-0 cursor-grab active:cursor-grabbing touch-none p-0.5 text-[var(--akqa-dusty)] hover:text-[var(--akqa-dove)] dark:hover:text-[var(--akqa-white)] border-0 bg-transparent"
            aria-label="Drag to reorder or drop on another card to merge"
            {...attributes}
            {...listeners}
          >
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
              <path d="M7 2a2 2 0 012 2v12a2 2 0 01-2 2h6a2 2 0 01-2-2V4a2 2 0 012-2H7zm0 2v12h6V4H7z" />
            </svg>
          </button>
        )}
        <div className="akqaretro-card__body flex-1 min-w-0 flex flex-col gap-1">
          {isEditing ? (
            /* Data entry: full-width textarea (3 lines), then X and Tick below */
            <div className="akqaretro-card__edit-wrap flex flex-col gap-2 w-full">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type something…"
                rows={3}
                className="akqaretro-card__textarea w-full min-h-[4.5rem] resize-y border border-[var(--akqa-border)] bg-[var(--surface-input)] text-[var(--foreground)] px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--akqa-dove)] leading-tight"
                aria-label="Card content"
              />
              <div className="akqaretro-card__edit-actions flex items-center justify-end gap-1">
                <button type="button" onClick={() => { setIsEditing(false); setText(card.text); }} aria-label="Cancel" className="akqaretro-card__cancel akqaretro-touch-target border border-[var(--akqa-border)] text-[var(--akqa-dove)] dark:text-[var(--akqa-dusty)] hover:bg-[var(--akqa-border)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--akqa-dove)]">
                  <XIcon />
                </button>
                <button type="button" onClick={handleSave} disabled={saving} aria-label="Save" className="akqaretro-card__save akqaretro-touch-target retro-accent-bg focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--retro-accent)] disabled:opacity-50">
                  {saving ? <span className="text-[10px]">…</span> : <CheckIcon />}
                </button>
              </div>
            </div>
          ) : (
            /* Saved: show text, then actions + votes (votes only visible when saved) */
            <>
              <div className={`akqaretro-card__text text-xs text-[var(--foreground)] whitespace-pre-wrap break-words leading-tight ${done ? "line-through opacity-80" : ""}`}>
                {card.text || "\u00a0"}
              </div>
              <div className="akqaretro-card__row flex items-center justify-between gap-1 flex-wrap">
                <div className="akqaretro-card__actions flex items-center gap-0.5">
                  {isActionsColumn && !done && (
                    <button type="button" onClick={handleDone} disabled={markingDone} aria-label="Mark as done" className="akqaretro-card__done akqaretro-touch-target px-2 border border-[var(--retro-accent)] retro-accent-bg focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--retro-accent)] disabled:opacity-50 text-xs font-medium">
                      {markingDone ? "…" : "Done"}
                    </button>
                  )}
                  <button type="button" onClick={() => setIsEditing(true)} aria-label="Edit" className="akqaretro-card__edit akqaretro-touch-target border border-[var(--akqa-border)] text-[var(--akqa-dove)] dark:text-[var(--akqa-dusty)] hover:bg-[var(--akqa-border)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--akqa-dove)]">
                    <PencilIcon />
                  </button>
                  <button type="button" onClick={handleDelete} disabled={deleting} aria-label="Delete card (confirmation required)" className="akqaretro-card__delete akqaretro-touch-target border border-[var(--akqa-border)] text-[var(--akqa-dusty)] hover:text-[var(--akqa-error)] hover:border-[var(--akqa-error)]/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--akqa-error)] disabled:opacity-50">
                    <TrashIcon />
                  </button>
                </div>
                <div className="akqaretro-card__votes flex items-center gap-0.5" role="group" aria-label="Votes">
                  <button type="button" onClick={handleVoteRemove} disabled={card.userVotesOnCard <= 0} aria-label="Remove one vote" className="akqaretro-card__vote-minus akqaretro-touch-target border border-[var(--akqa-border)] text-[var(--akqa-dove)] dark:text-[var(--akqa-white)] hover:bg-[var(--akqa-border)] disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--akqa-dove)] text-sm leading-none">−</button>
                  <span className="akqaretro-card__vote-display flex items-center gap-0.5 min-w-[2.75rem] justify-center text-[10px] text-[var(--akqa-muted)]" aria-label={voteCountsHidden ? "Vote count hidden" : `${card.voteCount} votes`}>
                    <ThumbsUpIcon />
                    {voteCountsHidden ? "\u00a0" : card.voteCount}
                  </span>
                  <button type="button" onClick={handleVoteAdd} disabled={votesRemaining <= 0} aria-label="Add one vote" className="akqaretro-card__vote-plus akqaretro-touch-target border border-[var(--akqa-border)] text-[var(--akqa-dove)] dark:text-[var(--akqa-white)] hover:bg-[var(--akqa-border)] disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--akqa-dove)] text-sm leading-none">+</button>
                </div>
              </div>
              {isMergeOver && (
                <p
                  className="akqaretro-card__merge-hint mt-1.5 pt-1.5 border-t border-[var(--retro-accent)]/30 text-[10px] font-medium uppercase tracking-wide retro-accent-text"
                  role="status"
                  aria-live="polite"
                >
                  Drop here to merge
                </p>
              )}
            </>
          )}
        </div>
      </div>
      {dialog}
    </div>
  );
}

export const RetroCardItem = React.memo(RetroCardItemInner);
