# Handoff — Pokémon Event Trade

## Start here

Read `PROJECT_CONTEXT.md` first. Use the **actual Supabase schema** below — do not invent columns like `date`, `description`, or `title`.

## Already built

- **Auth:** email sign up/in/out; `lib/supabase/client.ts`, `server.ts`, `middleware.ts`; protected `/profile`
- **Events:** public `/events` list + `/events/[id]` detail (name, location, start/end dates)
- **Listings:** create at `/events/[id]/new-listing` with collection picker; **only `active` listings** on event detail
- **Listing interests (MVP):** `listing_interests` table; `addInterest` / `removeInterest` in `app/listing-interests/actions.ts`; ❤️ I'm interested / ✓ Interested on cards; owners see `Interested (N)`; protected `/my-interests`
- **My Listings:** protected `/my-listings` — owner’s listings, interested users, status updates
- **My Collection:** protected `/my-collection` — CRUD for `collection_items`
- **Listing from collection:** searchable picker prefills form; snapshot on insert + optional `collection_item_id`
- **Language:** optional dropdown on collection + listings (13 values); snapshotted when creating listings
- **Pokémon TCG API (Phase A):** `lib/pokemon-tcg.ts`, `GET /api/card-search?q=...` (auth required); optional `POKEMON_TCG_API_KEY`; DB columns `tcg_api_card_id`, `card_number`, `set_id`; no images stored in DB
- **Pokémon TCG API (Phase B):** `CardSearchCombobox` + `AddCollectionItemForm` on `/my-collection` — search/manual toggle for cards; sealed stays manual
- **Pokémon TCG API (Phase C):** selected official card saved on create with API metadata; list shows badges
- **Pokémon TCG API (Phase D):** collection API fields snapshotted on listing create; thumbnails + badges on event + My Listings pages via `getCardImagesByIds`
- **Event listing search & filters:** `/events/[id]` GET form → URL params; Supabase query filtering in `lib/listing-filters.ts` + `EventListingFilters`
- **Matching engine (V2):** `/my-matches` — `findUserTradeMatches()` in `lib/listing-matches.ts`; grouped by event + user; perfect/strong/direct/reverse categories; no DB table
- **UI:** `Navbar`, `EventCard`, `ListingInterest`, `NewListingForm`, `LanguageSelect`, `CardSearchCombobox`, `AddCollectionItemForm`, `EventListingFilters`, `ListingOfficialCard`, `UserTradeMatchCard`
- **Stack:** Next.js 16 App Router, React 19, Tailwind v4, Supabase SSR

## Build next (priority order)

1. **Join event** — use `events.join_code`

## Supabase schema

**`events`:** `id`, `name`, `location`, `start_date`, `end_date`, `join_code`, `created_by`, `created_at`

**`listings`:** `id`, `event_id`, `user_id`, `type` (`want`|`trade`|`sale`), `card_name`, `card_ref` (required), `trade_for`, `target_price`, `status` (`active`|`reserved`|`completed`|`removed`), `condition`, `set_name`, `notes`, `language`, `tcg_api_card_id`, `card_number`, `set_id`, `collection_item_id` (optional), `created_at`, `updated_at`

**`collection_items`:** `id`, `user_id`, `item_kind` (`card`|`sealed`), `card_name`, `card_ref`, `set_name`, `condition`, `notes`, `language`, `tcg_api_card_id`, `card_number`, `set_id`, `quantity`, `created_at`, `updated_at`

**`listing_interests`:** `id`, `listing_id`, `user_id`, `created_at` — unique `(listing_id, user_id)`

**`users`:** `id`, `email`, `display_name`, `created_at`

**Links:** `event_id` → event; `user_id` → auth user; `listing_id` → listing; `collection_item_id` → collection item (provenance only); `listing_interests` embed `users` via `user_id`

## Current status

| Area | Status |
|---|---|
| Auth | Done |
| Events list/detail | Done |
| Create listing | Done |
| Listings display | Done |
| Listing interests (MVP) | Done |
| My Interests | Done |
| My Listings | Done |
| Listing status management | Done |
| My Collection | Done |
| Listing from collection | Done |
| Language support | Done |
| Pokémon TCG API Phase A | Done |
| Pokémon TCG API Phase B | Done |
| Pokémon TCG API Phase C | Done |
| Pokémon TCG API Phase D | Done |
| Event listing search & filters | Done |
| Matching engine (V2) | Done |
| Join event | Not started |

## Tips for the next chat

- Run `npm run dev` (Turbopack). Env in `.env.local`.
- Optional server env: `POKEMON_TCG_API_KEY` (Pokémon TCG Developer Portal; higher rate limits than unauthenticated).
- Card search: `GET /api/card-search?q=char` while logged in → `{ results: [...] }` with `images.small` for display only (not stored in DB). Future images: `getCardById` / `getCardImagesById` in `lib/pokemon-tcg.ts`.
- Create listing: form values are snapshotted; `card_ref` recomputed from submitted `card_name`; `collection_item_id` validated server-side; TCG API fields copied from collection row on insert.
- Listing interests: `addInterest(listingId)` / `removeInterest(listingId)` in `app/listing-interests/actions.ts`; table `listing_interests`.
- Event listing filters: `/events/[id]?q=charizard&type=sale&language=English&condition=Near+Mint&official=1&sort=name` — parsed in `lib/listing-filters.ts`, applied in Supabase query on event page.
- Matches: `/my-matches` — `findUserTradeMatches()` in `lib/listing-matches.ts`; groups by event + other user; dedupes cards; categories perfect/strong/direct/reverse; absolute counts only.
- Migrations (run in Supabase SQL editor if not applied):
  - `supabase/migrations/20260613120000_create_collection_items.sql`
  - `supabase/migrations/20260628120000_add_language_columns.sql`
  - `supabase/migrations/20260628130000_add_tcg_api_card_fields.sql`
  - `supabase/migrations/20260628140000_create_listing_interests.sql`
- Language values live in `lib/languages.ts` (dropdown only; DB stores plain text).
- After changes: `npm run build`.
