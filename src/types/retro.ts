export type ColumnType = "positive" | "negative" | "actions";

export interface RetroCard {
  id: string;
  retroId: string;
  column: ColumnType;
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
  userVoteCount: number;
  votesRemaining: number;
  votesPerUserCap: number;
}
