"use client";

import React, { useState, useCallback } from "react";
import type { ColumnType } from "@/types/retro";
import { CheckIcon, XIcon } from "./icons";

interface RetroDraftCardProps {
  token: string;
  column: ColumnType;
  onSaved: () => void;
  onCancel: () => void;
}

/**
 * Local-only draft card. Only the current user sees it until they save (submit).
 * Saving creates the card on the server; then it becomes visible to everyone.
 */
export function RetroDraftCard({ token, column, onSaved, onCancel }: RetroDraftCardProps) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/retros/${token}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column, text: trimmed }),
      });
      if (res.ok) {
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  }, [token, column, text, onSaved]);

  return (
    <div className="akqaretro-draft-card mb-1.5 border border-[var(--akqa-border)] bg-[var(--akqa-white)] dark:bg-[#2a2a2a] shadow-sm">
      <div className="akqaretro-draft-card__inner flex gap-1.5 p-1.5">
        <div className="akqaretro-draft-card__body flex-1 min-w-0 flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type something…"
            rows={3}
            className="akqaretro-draft-card__textarea w-full min-h-[4.5rem] resize-y border border-[var(--akqa-border)] bg-[var(--akqa-white)] dark:bg-[#1a1a1a] text-[var(--foreground)] px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--akqa-dove)] leading-tight"
            aria-label="Card content"
          />
          <div className="akqaretro-draft-card__actions flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel"
              className="akqaretro-draft-card__cancel flex items-center justify-center w-6 h-6 border border-[var(--akqa-border)] text-[var(--akqa-dove)] dark:text-[var(--akqa-dusty)] hover:bg-[var(--akqa-border)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--akqa-dove)]"
            >
              <XIcon />
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !text.trim()}
              aria-label="Submit card"
              className="akqaretro-draft-card__save flex items-center justify-center w-6 h-6 bg-[var(--akqa-dove)] text-[var(--akqa-white)] hover:opacity-90 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--akqa-dove)] disabled:opacity-50"
            >
              {saving ? <span className="text-[10px]">…</span> : <CheckIcon />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
