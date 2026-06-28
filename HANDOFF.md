# Handoff — Pokémon Event Trade

## Start here

Read `PROJECT_CONTEXT.md` first. Use the **actual Supabase schema** below — do not invent columns like `date`, `description`, or `title`.

## Already built

- **Auth:** email sign up/in/out; `lib/supabase/client.ts`, `server.ts`, `middleware.ts`; protected `/profile`
- **Events:** public `/events` list + `/events/[id]` detail (name, location, start/end dates)
- **Listings:** create at `/events/[id]/new-listing` with collection picker; **only `active` listings** on event detail
- **Interests:** express interest on listings; duplicate prevention; count + “Interested” state
- **My Listings:** protected `/my-listings` — owner’s listings, interested users, status updates
- **My Collection:** protected `/my-collection` — CRUD for `collection_items`
- **Listing from collection:** searchable picker prefills form; snapshot on insert + optional `collection_item_id`
- **Language:** optional dropdown on collection + listings (13 values); snapshotted when creating listings
- **Pokémon TCG API (Phase A):** `lib/pokemon-tcg.ts`, `GET /api/card-search?q=...` (auth required); optional `POKEMON_TCG_API_KEY`; DB columns `tcg_api_card_id`, `card_number`, `set_id`; no images stored in DB
- **Pokémon TCG API (Phase B):** `CardSearchCombobox` + `AddCollectionItemForm` on `/my-collection` — search/manual toggle for cards; sealed stays manual
- **Pokémon TCG API (Phase C):** selected official card saved on create with API metadata; list shows badges
- **UI:** `Navbar`, `EventCard`, `ListingInterest`, `NewListingForm`, `LanguageSelect`, `CardSearchCombobox`, `AddCollectionItemForm`
- **Stack:** Next.js 16 App Router, React 19, Tailwind v4, Supabase SSR

## Build next (priority order)

1. **Pokémon TCG API Phase D** — propagate collection API fields to listings
2. **Join event** — use `events.join_code`

## Supabase schema

**`events`:** `id`, `name`, `location`, `start_date`, `end_date`, `join_code`, `created_by`, `created_at`

**`listings`:** `id`, `event_id`, `user_id`, `type` (`want`|`trade`|`sale`), `card_name`, `card_ref` (required), `trade_for`, `target_price`, `status` (`active`|`reserved`|`completed`|`removed`), `condition`, `set_name`, `notes`, `language`, `tcg_api_card_id`, `card_number`, `set_id`, `collection_item_id` (optional), `created_at`, `updated_at`

**`collection_items`:** `id`, `user_id`, `item_kind` (`card`|`sealed`), `card_name`, `card_ref`, `set_name`, `condition`, `notes`, `language`, `tcg_api_card_id`, `card_number`, `set_id`, `quantity`, `created_at`, `updated_at`

**`interests`:** `id`, `listing_id`, `user_id`, `message`, `created_at`

**`users`:** `id`, `email`, `display_name`, `created_at`

**Links:** `event_id` → event; `user_id` → auth user; `listing_id` → listing; `collection_item_id` → collection item (provenance only); interests embed `users` via `user_id`

## Current status

| Area | Status |
|---|---|
| Auth | Done |
| Events list/detail | Done |
| Create listing | Done |
| Listings display | Done |
| Interests | Done |
| My Listings | Done |
| Listing status management | Done |
| My Collection | Done |
| Listing from collection | Done |
| Language support | Done |
| Pokémon TCG API Phase A | Done |
| Pokémon TCG API Phase B | Done |
| Pokémon TCG API Phase C | Done |
| Pokémon TCG API Phase D | Not started |
| Join event | Not started |

## Tips for the next chat

- Run `npm run dev` (Turbopack). Env in `.env.local`.
- Optional server env: `POKEMON_TCG_API_KEY` (Pokémon TCG Developer Portal; higher rate limits than unauthenticated).
- Card search: `GET /api/card-search?q=char` while logged in → `{ results: [...] }` with `images.small` for display only (not stored in DB). Future images: `getCardById` / `getCardImagesById` in `lib/pokemon-tcg.ts`.
- Create listing: form values are snapshotted; `card_ref` recomputed from submitted `card_name`; `collection_item_id` validated server-side.
- Migrations (run in Supabase SQL editor if not applied):
  - `supabase/migrations/20260613120000_create_collection_items.sql`
  - `supabase/migrations/20260628120000_add_language_columns.sql`
  - `supabase/migrations/20260628130000_add_tcg_api_card_fields.sql`
- Language values live in `lib/languages.ts` (dropdown only; DB stores plain text).
- After changes: `npm run build`.
