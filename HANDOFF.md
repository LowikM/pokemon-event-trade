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
- **UI:** `Navbar`, `EventCard`, `ListingInterest`, `NewListingForm`
- **Stack:** Next.js 16 App Router, React 19, Tailwind v4, Supabase SSR

## Build next (priority order)

1. **Join event** — use `events.join_code`

## Supabase schema

**`events`:** `id`, `name`, `location`, `start_date`, `end_date`, `join_code`, `created_by`, `created_at`

**`listings`:** `id`, `event_id`, `user_id`, `type` (`want`|`trade`|`sale`), `card_name`, `card_ref` (required), `trade_for`, `target_price`, `status` (`active`|`reserved`|`completed`|`removed`), `condition`, `set_name`, `notes`, `collection_item_id` (optional), `created_at`, `updated_at`

**`collection_items`:** `id`, `user_id`, `item_kind` (`card`|`sealed`), `card_name`, `card_ref`, `set_name`, `condition`, `notes`, `quantity`, `created_at`, `updated_at`

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
| Join event | Not started |

## Tips for the next chat

- Run `npm run dev` (Turbopack). Env in `.env.local`.
- Create listing: form values are snapshotted; `card_ref` recomputed from submitted `card_name`; `collection_item_id` validated server-side.
- Migration: `supabase/migrations/20260613120000_create_collection_items.sql` (run in Supabase if not applied).
- After changes: `npm run build`.
