# Pokémon Event Trade — Project Context

## Project goal

Web app for Pokémon collectors to browse in-person trading events and post listings of cards they want to trade at each event.

## Tech stack

- **Next.js 16** (App Router, Turbopack dev)
- **React 19**, **TypeScript**
- **Tailwind CSS v4**
- **Supabase** — Postgres, Auth, RLS (`@supabase/ssr`, `@supabase/supabase-js`)
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`.env.local`)
- Optional: `POKEMON_TCG_API_KEY` (server-only, for Pokémon TCG API rate limits)

## Current Supabase schema

### `public.users`
| Column | Type |
|---|---|
| `id` | uuid |
| `email`, `display_name` | text |
| `bio`, `location`, `favorite_pokemon`, `avatar_url` | text (optional) |
| `created_at` | timestamptz |

### `public.events`
| Column | Type |
|---|---|
| `id` | uuid |
| `name`, `location` | text |
| `start_date`, `end_date` | date/timestamptz |
| `join_code` | text |
| `created_by` | uuid → auth user |
| `created_at` | timestamptz |

### `public.listings`
| Column | Type |
|---|---|
| `id` | uuid |
| `event_id` | uuid → `events.id` |
| `user_id` | uuid → auth user |
| `type` | enum `listing_type`: `want`, `trade`, `sale` |
| `card_name`, `card_ref`, `trade_for` | text (`card_ref` required; MVP derives from `card_name`) |
| `status` | enum `listing_status`: `active`, `completed`, `removed`, `reserved` |
| `condition`, `set_name`, `notes`, `target_price`, `language` | text (optional) |
| `tcg_api_card_id`, `card_number`, `set_id` | text (optional; Pokémon TCG API metadata, snapshotted) |
| `collection_item_id` | uuid → `collection_items.id` (optional) |
| `wishlist_item_id` | uuid → `wishlist_items.id` (optional; want listings from wishlist activation) |
| `created_at`, `updated_at` | timestamptz |

### `public.wishlist_items`
| Column | Type |
|---|---|
| `id` | uuid |
| `user_id` | uuid → `users.id` |
| `card_name`, `card_ref` | text (`card_ref` derived from `card_name`) |
| `set_name`, `language`, `notes` | text (optional) |
| `tcg_api_card_id`, `card_number`, `set_id` | text (optional; Pokémon TCG API metadata) |
| `priority` | integer (1–5, default 3) |
| Unique per user | `(user_id, tcg_api_card_id)` when official; `(user_id, card_ref)` when manual |
| `created_at`, `updated_at` | timestamptz |

### `public.collection_items`
| Column | Type |
|---|---|
| `id` | uuid |
| `user_id` | uuid → `users.id` |
| `item_kind` | enum `collection_item_kind`: `card`, `sealed` |
| `card_name`, `card_ref` | text (`card_ref` derived from `card_name`) |
| `set_name`, `condition`, `notes`, `language` | text (optional) |
| `tcg_api_card_id`, `card_number`, `set_id` | text (optional; Pokémon TCG API metadata) |
| `quantity` | integer (default 1) |
| `created_at`, `updated_at` | timestamptz |

### `public.listing_interests`
| Column | Type |
|---|---|
| `id` | uuid |
| `listing_id` | uuid → `listings.id` (ON DELETE CASCADE) |
| `user_id` | uuid → `users.id` (ON DELETE CASCADE) |
| `created_at` | timestamptz |

Unique constraint on `(listing_id, user_id)`. Replaces legacy `interests` table.

### `public.messages`
| Column | Type |
|---|---|
| `id` | uuid |
| `sender_id` | uuid → `users.id` (ON DELETE CASCADE) |
| `recipient_id` | uuid → `users.id` (ON DELETE CASCADE) |
| `listing_id` | uuid → `listings.id` (ON DELETE SET NULL, optional) |
| `parent_message_id` | uuid → `messages.id` (ON DELETE SET NULL, optional) |
| `body` | text |
| `read_at` | timestamptz (optional; null = unread for recipient) |
| `created_at` | timestamptz |

## Authentication flow

- Cookie-based Supabase SSR via `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts`
- Middleware calls `getUser()` to refresh sessions and redirect:
  - unauthenticated `/profile`, `/my-listings`, `/my-interests`, `/my-matches`, `/messages`, `/my-collection`, `/my-wishlist`, `/sets` → `/login`
  - authenticated `/login` → `/profile`
- Server actions in `app/login/actions.ts`: `signIn`, `signUp`, `signOut`

## Completed features

- Email/password sign up, sign in, sign out
- Protected profile page (email, user ID, last sign in)
- Global navbar with auth-aware links
- Public events index (`/events`) with `EventCard` components
- Event detail page (`/events/[id]`) with dates, location, active listings, search/filters, Create Listing flow, interest buttons
- **Listing interests (MVP):** `listing_interests` table; `addInterest` / `removeInterest` server actions; ❤️/✓ UI on listing cards; `/my-interests` page
- My Listings page (`/my-listings`) — owner's listings with interested users and status updates
- My Collection page (`/my-collection`) — CRUD for personal `collection_items`
- Create listing from collection on `/events/[id]/new-listing` — sale/trade only; collection picker prefills form; snapshot + optional `collection_item_id`; want listings via Activate Wishlist only
- Optional card/sealed **language** (dropdown) on collection items and listings; snapshotted on listing create
- Pokémon TCG API **Phase A**: migration + `lib/pokemon-tcg.ts` + authenticated `GET /api/card-search`
- Pokémon TCG API **Phase B**: My Collection add form — `CardSearchCombobox` with search/manual toggle for cards
- Pokémon TCG API **Phase C**: search selection saves `tcg_api_card_id`, `card_number`, `set_id` + prefilled name/set on create
- Pokémon TCG API **Phase D**: official card metadata snapshotted on listing create; thumbnails/badges on event + My Listings pages
- **Event listing search & filters** on `/events/[id]` — URL query params (`q`, `type`, `language`, `condition`, `official`, `sort`); Supabase-side filtering
- **Matching engine (V2):** protected `/my-matches` — user-centric groups by event + other user; want↔offer card sets with priority categories; computed in memory
- **Contact flow (MVP):** `messages` table; `sendMessage` server action; inline contact forms on matches/listings/interests; protected `/messages` inbox
- **Message replies + unread:** `replyToMessage`, `markMessageRead`; `read_at` + `parent_message_id`; unread badge in navbar
- **User profiles (MVP):** optional `bio`, `location`, `favorite_pokemon`, `avatar_url` on `users`; protected `/profile` edit form; public `/users/[id]` profile pages; profile links from listings, matches, interests, and messages
- **My Wishlist (Phase 1):** `wishlist_items` table; protected `/my-wishlist` CRUD; TCG search + manual entry; priority 1–5
- **Activate wishlist for event (Phase 2):** `listings.wishlist_item_id`; protected `/events/[id]/activate-wishlist`; `activateWishlistForEvent` creates snapshotted `want` listings; partial unique index prevents duplicate active wants per event
- **My Wishlist UX:** duplicate prevention (unique per user + official/manual card); bulk manage on `/my-wishlist`; bulk activation filters on activate page (priority, language, select all/none, selected count)
- **Create listing cleanup:** `/events/[id]/new-listing` accepts sale/trade only; want listings created via Activate Wishlist; legacy want listings unchanged
- **Set Browser (Phase 1):** protected `/sets` + `/sets/[setId]` — search sets via Pokémon TCG API; browse all cards in a set; status badges (Owned / Wanted / Owned + Wanted / Missing); single-card Add to Collection / Add to Wishlist via existing server actions with `return_path`
- **Set Browser (Phase 2 — bulk):** checkbox selection, range picker, sticky bulk toolbar; `bulkAddCardsToCollection` / `bulkAddCardsToWishlist` in `app/sets/actions.ts`; batch insert with duplicate skip; summary banner after redirect

## Existing routes

| Route | Access | Status |
|---|---|---|
| `/` | Public | Landing page |
| `/login` | Public | Auth forms |
| `/profile` | Protected | Edit your profile |
| `/users/[id]` | Public | Collector public profile |
| `/my-collection` | Protected | Personal collection CRUD |
| `/my-wishlist` | Protected | Permanent wanted cards CRUD |
| `/sets` | Protected | Set Browser — search Pokémon TCG sets |
| `/sets/[setId]` | Protected | Set detail — card grid with collection/wishlist status |
| `/my-listings` | Protected | Owner listings, interested users, status updates |
| `/my-interests` | Protected | Listings the user has marked as interested |
| `/my-matches` | Protected | User-centric trade matches grouped by event + collector |
| `/messages` | Protected | Sent and received messages inbox |
| `/events` | Public | Event list |
| `/events/[id]` | Public | Event detail |
| `/events/[id]/new-listing` | Protected | Create sale/trade listing from collection or manual entry |
| `/events/[id]/activate-wishlist` | Protected | Activate wishlist items as want listings for event |

## Remaining roadmap

1. **Set Browser (Phase 3+)** — completion statistics, binder mode, “Add all missing to Wishlist”, filters
2. **Join event** — use `join_code` to associate users with events
3. **Real-time chat / threaded conversations / notifications** — future enhancements (not in MVP)

## Important implementation decisions

- **No `src/` directory** — `app/` and `lib/` at project root; import alias `@/*`
- **`@supabase/ssr` over legacy auth-helpers** — correct cookie handling for App Router
- **Session refresh in middleware** — required so Server Components can read auth cookies
- **Public events, protected profile** — events/listings browsable without login; auth needed for user-specific actions
- **Server Components + Server Actions** for data fetching and mutations (no client Supabase for auth forms yet)
- **Schema-driven UI** — events use `start_date`/`end_date` (not `date`/`description`); listings use enums for `type` and `status`; only `active` listings show on event pages; owners update status on `/my-listings`; `card_ref` is required in DB and derived from `card_name.trim().toLowerCase()` for listings and collection items; listing rows snapshot collection fields at create time (editing collection later does not change listings); optional `language` uses app dropdown values (English, Japanese, etc.) stored as text; one interest per user per listing via `listing_interests`; event listing filters use GET forms and URL search params with Supabase `ilike`/`eq` queries (no in-memory filtering)
- **Matching engine (V2):** `/my-matches` groups by event + other user; dedupes cards by `tcg_api_card_id` or `card_ref`; categories: perfect trade, strong want, direct, reverse; absolute counts only (no percentages); computed on page load (no matches table)
- **Contact flow (MVP):** one-way `messages` rows; `sendMessage(recipientId, listingId, formData)` in `app/messages/actions.ts`; RLS limits read to sender/recipient; no real-time chat
- **Message replies + unread:** `replyToMessage(messageId, formData)` links via `parent_message_id`; inbox marks received messages read on open; navbar shows `Messages (N)` for unread count
