"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { ColumnType } from "@/types/retro";
import type { RetroCard } from "@/types/retro";
import { RetroCardItem } from "./RetroCardItem";

const COLUMN_LABELS: Record<ColumnType, string> = {
  positive: "Positive",
  negative: "Negative",
  actions: "Actions",
};

interface RetroColumnProps {
  column: ColumnType;
  cards: RetroCard[];
  voterId: string;
  votesRemaining: number;
  token: string;
  onRefetch: () => void;
}

export function RetroColumn({ column, cards, voterId, votesRemaining, token, onRefetch }: RetroColumnProps) {
  const [adding, setAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  async function handleAddCard() {
    setAdding(true);
    try {
      const res = await fetch(`/api/retros/${token}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column, text: "" }),
      });
      if (!res.ok) throw new Error("Failed to add card");
      onRefetch();
    } catch {
      setAdding(false);
    }
  }

  async function handleReorder(activeId: string, overId: string) {
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
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    handleReorder(String(active.id), String(over.id));
  }

  return (
    <div className="akqaretro-column flex flex-col border border-[var(--akqa-border)] bg-[var(--akqa-white)] dark:bg-[#2a2a2a] min-h-[320px] min-w-0">
      <div className="akqaretro-column__header flex items-center justify-between p-4 border-b border-[var(--akqa-border)]">
        <h2 className="akqaretro-column__title text-lg font-semibold text-[var(--foreground)]">
          {COLUMN_LABELS[column]}
        </h2>
        <button
          type="button"
          onClick={handleAddCard}
          disabled={adding}
          className="akqaretro-column__add bg-[var(--akqa-dove)] text-[var(--akqa-white)] px-4 py-2 text-sm font-medium hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)] focus-visible:ring-offset-2 disabled:opacity-50"
          aria-label={`Add card to ${COLUMN_LABELS[column]}`}
        >
          {adding ? "Adding…" : "Add"}
        </button>
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
                onRefetch={onRefetch}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
