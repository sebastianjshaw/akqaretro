"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { RetroCard } from "@/types/retro";

function CheckIcon() {
  return <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="square" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>;
}
function XIcon() {
  return <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="square" strokeWidth={2.5} d="M6 6l12 12M6 18L18 6" /></svg>;
}
function PencilIcon() {
  return <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="square" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;
}
function TrashIcon() {
  return <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="square" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
}
function ThumbsUpIcon() {
  return <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="square" strokeWidth={2} d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 11H4a2 2 0 00-2 2v6a2 2 0 002 2h3" /></svg>;
}

interface RetroCardItemProps {
  card: RetroCard;
  voterId: string;
  votesRemaining: number;
  onRefetch: () => void;
}

function RetroCardItemInner({ card, voterId, votesRemaining, onRefetch }: RetroCardItemProps) {
  const [text, setText] = useState(card.text);
  // Always start in view mode so other viewers never see an open text box; only the user who clicks Edit does
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        body: JSON.stringify({ text: trimmed }),
      });
      if (res.ok) {
        onRefetch();
        setIsEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }, [text, card.id, card.text, onRefetch]);

  const handleDelete = useCallback(async () => {
    if (deleting || !confirm("Delete this card?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
      if (res.ok) onRefetch();
    } finally {
      setDeleting(false);
    }
  }, [card.id, deleting, onRefetch]);

  const handleVoteAdd = useCallback(async () => {
    if (votesRemaining <= 0) return;
    const res = await fetch(`/api/cards/${card.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterId }),
    });
    if (res.ok) onRefetch();
  }, [card.id, voterId, votesRemaining, onRefetch]);

  const handleVoteRemove = useCallback(async () => {
    if (card.userVotesOnCard <= 0) return;
    const res = await fetch(
      `/api/cards/${card.id}/vote?voterId=${encodeURIComponent(voterId)}`,
      { method: "DELETE" }
    );
    if (res.ok) onRefetch();
  }, [card.id, card.userVotesOnCard, voterId, onRefetch]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={`akqaretro-card group mb-1.5 border bg-[var(--akqa-white)] dark:bg-[#2a2a2a] shadow-sm transition-shadow ${
        isDragging ? "akqaretro-card--dragging opacity-80 shadow-md z-10" : ""
      } ${isMergeOver ? "akqaretro-card--merge-over ring-2 ring-[var(--akqa-dove)] ring-offset-2 dark:ring-offset-[#1a1a1a]" : ""} border-[var(--akqa-border)]`}
    >
      <div ref={setMergeRef} className={`akqaretro-card__inner flex gap-1.5 p-1.5 ${isEditing ? "akqaretro-card__inner--editing" : ""}`}>
        {!isEditing && (
          <div
            className="akqaretro-card__handle flex shrink-0 cursor-grab active:cursor-grabbing touch-none p-0.5 text-[var(--akqa-dusty)] hover:text-[var(--akqa-dove)] dark:hover:text-[var(--akqa-white)]"
            aria-label="Drag to reorder or drop on another card to merge"
            {...attributes}
            {...listeners}
          >
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
              <path d="M7 2a2 2 0 012 2v12a2 2 0 01-2 2h6a2 2 0 01-2-2V4a2 2 0 012-2H7zm0 2v12h6V4H7z" />
            </svg>
          </div>
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
                className="akqaretro-card__textarea w-full min-h-[4.5rem] resize-y border border-[var(--akqa-border)] bg-[var(--akqa-white)] dark:bg-[#1a1a1a] text-[var(--foreground)] px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--akqa-dove)] leading-tight"
                aria-label="Card content"
              />
              <div className="akqaretro-card__edit-actions flex items-center justify-end gap-1">
                <button type="button" onClick={() => { setIsEditing(false); setText(card.text); }} aria-label="Cancel" className="akqaretro-card__cancel flex items-center justify-center w-6 h-6 border border-[var(--akqa-border)] text-[var(--akqa-dove)] dark:text-[var(--akqa-dusty)] hover:bg-[var(--akqa-border)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--akqa-dove)]">
                  <XIcon />
                </button>
                <button type="button" onClick={handleSave} disabled={saving} aria-label="Save" className="akqaretro-card__save flex items-center justify-center w-6 h-6 bg-[var(--akqa-dove)] text-[var(--akqa-white)] hover:opacity-90 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--akqa-dove)] disabled:opacity-50">
                  {saving ? <span className="text-[10px]">…</span> : <CheckIcon />}
                </button>
              </div>
            </div>
          ) : (
            /* Saved: show text, then actions + votes (votes only visible when saved) */
            <>
              <div className="akqaretro-card__text text-xs text-[var(--foreground)] whitespace-pre-wrap break-words leading-tight">
                {card.text || "\u00a0"}
              </div>
              <div className="akqaretro-card__row flex items-center justify-between gap-1 flex-wrap">
                <div className="akqaretro-card__actions flex items-center gap-0.5">
                  <button type="button" onClick={() => setIsEditing(true)} aria-label="Edit" className="akqaretro-card__edit flex items-center justify-center w-6 h-6 border border-[var(--akqa-border)] text-[var(--akqa-dove)] dark:text-[var(--akqa-dusty)] hover:bg-[var(--akqa-border)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--akqa-dove)]">
                    <PencilIcon />
                  </button>
                  <button type="button" onClick={handleDelete} disabled={deleting} aria-label="Delete card (confirmation required)" className="akqaretro-card__delete flex items-center justify-center w-6 h-6 border border-[var(--akqa-border)] text-[var(--akqa-dusty)] hover:text-red-600 hover:border-red-600/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 disabled:opacity-50">
                    <TrashIcon />
                  </button>
                </div>
                <div className="akqaretro-card__votes flex items-center gap-0.5" role="group" aria-label="Votes">
                  <button type="button" onClick={handleVoteRemove} disabled={card.userVotesOnCard <= 0} aria-label="Remove one vote" className="akqaretro-card__vote-minus flex items-center justify-center w-5 h-5 border border-[var(--akqa-border)] text-[var(--akqa-dove)] dark:text-[var(--akqa-white)] hover:bg-[var(--akqa-border)] disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--akqa-dove)] text-xs leading-none">−</button>
                  <span className="akqaretro-card__vote-display flex items-center gap-0.5 w-7 justify-center text-[10px] text-[var(--akqa-muted)]" aria-label={`${card.voteCount} votes`}>
                    <ThumbsUpIcon />
                    {card.voteCount}
                  </span>
                  <button type="button" onClick={handleVoteAdd} disabled={votesRemaining <= 0} aria-label="Add one vote" className="akqaretro-card__vote-plus flex items-center justify-center w-5 h-5 border border-[var(--akqa-border)] text-[var(--akqa-dove)] dark:text-[var(--akqa-white)] hover:bg-[var(--akqa-border)] disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--akqa-dove)] text-xs leading-none">+</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export const RetroCardItem = React.memo(RetroCardItemInner);
