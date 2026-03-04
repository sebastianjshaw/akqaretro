# Agile Retrospective Tool

Web-hosted retrospective board with three columns (Positive, Negative, Actions), cards, voting (max 6 votes per user), drag-to-reorder, and drag-onto-card to merge.

## Tech stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes (serverless)
- **Database:** PostgreSQL (Prisma + Neon). Migrations are Postgres-only; see `DEPLOY.md` for Vercel + Neon.
- **DnD:** @dnd-kit (core, sortable, utilities)
- **Multi-user sync:** Polling every 4s (MVP); WebSockets/SSE can be added later

## Quick start

```bash
npm install
npx prisma migrate deploy   # use with Neon; or migrate dev for local
npm run dev
```

Open http://localhost:3000 → create a retro → share `/r/{token}` with the team.

## Architecture

- **Create retro:** `POST /api/retros` → returns `{ token, title, date }`. Token is 192-bit random, base64url-encoded (unguessable).
- **Access:** Retro URL is `/r/{token}`. Token is the shared secret; no auth for MVP.
- **Board:** Three columns; each column has cards. Cards can be reordered (drag in list), merged (drag onto another card in same column), and voted on.

## Data model

- **Retro:** id, token (unique), title, date, createdAt, updatedAt
- **Card:** id, retroId, column (`positive` | `negative` | `actions`), text, orderKey (fractional), createdAt, updatedAt
- **Vote:** id, retroId, cardId, voterId (anonymous client UUID), createdAt. Unique (cardId, voterId). Per-retro cap: ≤6 votes per voterId.

## API contract

| Method | Route | Body / Query | Response |
|--------|--------|--------------|----------|
| POST | `/api/retros` | `{ title, date? }` | `{ token, title, date, id }` |
| GET | `/api/retros/{token}` | `?voterId=` | Retro + cards (with voteCount, userVoted) + userVoteCount, votesRemaining, votesPerUserCap |
| POST | `/api/retros/{token}/cards` | `{ column, text? }` | New card (id, column, text, orderKey, voteCount: 0, userVoted: false) |
| PATCH | `/api/cards/{cardId}` | `{ text? }` or `{ column? }` or `{ newIndex }` | Updated card |
| POST | `/api/cards/{cardId}/vote` | `{ voterId }` | `{ voteCount, votesRemaining, userVoted }` |
| DELETE | `/api/cards/{cardId}/vote` | `?voterId=` | `{ voteCount, votesRemaining, userVoted }` |
| POST | `/api/cards/{targetCardId}/merge` | `{ sourceCardId }` | `{ targetCard, sourceCardDeleted }` |

- **Ordering:** Fractional `orderKey` (base-36 midpoint). New cards get `nextOrderKey(lastInColumn)`. Reorder sends `newIndex`; server computes new orderKey between neighbours.
- **Merge:** Same retro + same column only. Target text becomes `targetText + "\n\n---\n\n" + sourceText`. Source votes migrated to target; if same voter on both, one record kept (no refund). Source card deleted. Atomic transaction.

## Key algorithms

- **Order key:** `midpoint(prev, next)` for insert-between; `nextOrderKey(last)` for append. See `src/lib/order.ts`.
- **Merge vote migration:** Target keeps its votes; for each source vote, if voterId not on target, create Vote on target; then delete all source votes and delete source card.

## Frontend structure

- **Pages:** `app/page.tsx` (create form), `app/r/[token]/page.tsx` (board + share link)
- **Components:** `RetroBoard` (fetch, poll, votes header, columns), `RetroColumn` (DndContext per column, Add, SortableContext), `RetroCardItem` (useSortable + useDroppable `merge-{id}`, textarea debounce, vote button), `RetroShareLink` (copy URL)
- **DnD:** Reorder = drop on list (over id = card id). Merge = drop on card body (over id = `merge-{cardId}`). Same column only.

## UX rules and edge cases

- **Voting:** UI shows total votes per card and “X / 6 left” for current user. Server enforces cap and one vote per card per user. Disable vote button when votesRemaining ≤ 0 and not already voted.
- **Card text:** Auto-save with 600ms debounce; “Saving…” indicator.
- **Merge:** Hover state on card (ring) when dragging over. Drop on card = merge; drop in gap = reorder. Cross-column drag = not supported (no move column in MVP).
- **Concurrency:** Optimistic UI where sensible; refetch after mutations. Polling every 4s reconciles state. Last-write-wins on order and text.

## Non-functional

- **Security:** Token-based access; add rate limiting on `POST /api/retros` and write endpoints in production.
- **Persistence:** Postgres (Neon); set `DATABASE_URL` and `DIRECT_URL` in Vercel and run `prisma migrate deploy` once (see `DEPLOY.md`).
- **Performance:** Fractional ordering avoids full reindex on move; 50+ cards per column should stay responsive.

## Environment

- `DATABASE_URL`: Neon pooled Postgres URL.
- `DIRECT_URL`: Neon direct Postgres URL (for migrations).
- Optional: `NEXT_PUBLIC_APP_URL` or `VERCEL_URL` for server-side fetch of retro (SSR).
