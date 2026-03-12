/** Column id: "positive" | "negative" | "actions" or custom id (uuid). */
export type ColumnType = string;

export interface ColumnConfigItem {
  id: string;
  title: string;
  order: number;
  fixed?: boolean;
}

export const ACTIONS_COLUMN_ID = "actions";

export const DEFAULT_COLUMN_CONFIG: ColumnConfigItem[] = [
  { id: "positive", title: "Positive", order: 0 },
  { id: "negative", title: "Negative", order: 1 },
  { id: ACTIONS_COLUMN_ID, title: "Actions", order: 2, fixed: true },
];

/** Legacy: ordered column ids for retros without columnConfig. */
export const COLUMNS: readonly string[] = ["positive", "negative", "actions"];

export const COLUMN_LABELS: Record<string, string> = {
  positive: "Positive",
  negative: "Negative",
  actions: "Actions",
};

export function getDefaultColumnConfig(): ColumnConfigItem[] {
  return DEFAULT_COLUMN_CONFIG.map((c) => ({ ...c }));
}

/** Ensures Actions is always the rightmost column; renumbers order. */
export function ensureActionsLast(config: ColumnConfigItem[]): ColumnConfigItem[] {
  const actions = config.find((c) => c.id === ACTIONS_COLUMN_ID);
  const rest = config
    .filter((c) => c.id !== ACTIONS_COLUMN_ID)
    .sort((a, b) => a.order - b.order);
  const reordered = rest.map((c, i) => ({ ...c, order: i }));
  if (actions) reordered.push({ ...actions, order: reordered.length });
  return reordered;
}

export function normalizeColumnConfig(
  raw: unknown
): ColumnConfigItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const hasActions = raw.some(
    (c: unknown) => c && typeof c === "object" && (c as { id?: string }).id === ACTIONS_COLUMN_ID
  );
  if (!hasActions) return null;
  const sorted = [...raw].sort(
    (a: unknown, b: unknown) =>
      (Number((a as { order?: number }).order) ?? 0) -
      (Number((b as { order?: number }).order) ?? 0)
  );
  return sorted.map((c: unknown) => {
    const o = c as { id?: string; title?: string; order?: number; fixed?: boolean };
    return {
      id: String(o.id ?? ""),
      title: String(o.title ?? ""),
      order: Number(o.order) ?? 0,
      fixed: Boolean(o.fixed),
    };
  });
}

export interface RetroCard {
  id: string;
  retroId: string;
  column: string;
  text: string;
  orderKey: string;
  createdAt: string;
  updatedAt: string;
  voteCount: number;
  userVoted: boolean;
  userVotesOnCard: number;
}

export interface RetroState {
  id: string;
  token: string;
  title: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  cards: RetroCard[];
  columnConfig: ColumnConfigItem[];
  userVoteCount: number;
  votesRemaining: number;
  votesPerUserCap: number;
}
