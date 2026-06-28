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

### `public.interests`
| Column | Type |
|---|---|
| `id` | uuid |
| `listing_id` | uuid → `listings.id` |
| `user_id` | uuid → auth user |
| `message` | text (nullable; MVP uses `null`) |
| `created_at` | timestamptz |

## Authentication flow

- Cookie-based Supabase SSR via `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts`
- Middleware calls `getUser()` to refresh sessions and redirect:
  - unauthenticated `/profile`, `/my-listings`, `/my-collection` → `/login`
  - authenticated `/login` → `/profile`
- Server actions in `app/login/actions.ts`: `signIn`, `signUp`, `signOut`

## Completed features

- Email/password sign up, sign in, sign out
- Protected profile page (email, user ID, last sign in)
- Global navbar with auth-aware links
- Public events index (`/events`) with `EventCard` components
- Event detail page (`/events/[id]`) with dates, location, active listings, Create Listing flow, interest buttons
- My Listings page (`/my-listings`) — owner's listings with interested users and status updates
- My Collection page (`/my-collection`) — CRUD for personal `collection_items`
- Create listing from collection on `/events/[id]/new-listing` — picker prefills form; snapshot + optional `collection_item_id`
- Optional card/sealed **language** (dropdown) on collection items and listings; snapshotted on listing create
- Pokémon TCG API **Phase A**: migration + `lib/pokemon-tcg.ts` + authenticated `GET /api/card-search`
- Pokémon TCG API **Phase B**: My Collection add form — `CardSearchCombobox` with search/manual toggle for cards
- Pokémon TCG API **Phase C**: search selection saves `tcg_api_card_id`, `card_number`, `set_id` + prefilled name/set on create

## Existing routes

| Route | Access | Status |
|---|---|---|
| `/` | Public | Landing page |
| `/login` | Public | Auth forms |
| `/profile` | Protected | User profile |
| `/my-collection` | Protected | Personal collection CRUD |
| `/my-listings` | Protected | Owner listings, interested users, status updates |
| `/events` | Public | Event list |
| `/events/[id]` | Public | Event detail |
| `/events/[id]/new-listing` | Protected | Create listing form with collection picker |

## Remaining roadmap

1. **Pokémon TCG API Phase D** — propagate collection API fields to listings
2. **Join event** — use `join_code` to associate users with events
3. **Interest messages** — optional `message` field (not in MVP)

## Important implementation decisions

- **No `src/` directory** — `app/` and `lib/` at project root; import alias `@/*`
- **`@supabase/ssr` over legacy auth-helpers** — correct cookie handling for App Router
- **Session refresh in middleware** — required so Server Components can read auth cookies
- **Public events, protected profile** — events/listings browsable without login; auth needed for user-specific actions
- **Server Components + Server Actions** for data fetching and mutations (no client Supabase for auth forms yet)
- **Schema-driven UI** — events use `start_date`/`end_date` (not `date`/`description`); listings use enums for `type` and `status`; only `active` listings show on event pages; owners update status on `/my-listings`; `card_ref` is required in DB and derived from `card_name.trim().toLowerCase()` for listings and collection items; listing rows snapshot collection fields at create time (editing collection later does not change listings); optional `language` uses app dropdown values (English, Japanese, etc.) stored as text; interests are one per user per listing with `message: null` for MVP
