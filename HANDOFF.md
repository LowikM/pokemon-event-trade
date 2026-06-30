# Handoff — Pokémon Event Trade

## Start here

Read `PROJECT_CONTEXT.md` first. Use the **actual Supabase schema** below — do not invent columns like `date`, `description`, or `title`.

## Already built

- **Auth:** email sign up/in/out; `lib/supabase/client.ts`, `server.ts`, `middleware.ts`; protected `/profile`
- **Events:** public `/events` list + `/events/[id]` detail (name, location, start/end dates)
- **Listings:** create at `/events/[id]/new-listing` — **sale/trade only** with collection picker; want listings via `/events/[id]/activate-wishlist`; **only `active` listings** on event detail
- **Listing interests (MVP):** `listing_interests` table; `addInterest` / `removeInterest` in `app/listing-interests/actions.ts`; ❤️ I'm interested / ✓ Interested on cards; owners see `Interested (N)`; protected `/my-interests`
- **Contact flow (MVP):** `messages` table; `sendMessage` in `app/messages/actions.ts`; inline `SendMessageForm` on matches, event listings, and interests; protected `/messages` inbox
- **Message replies + unread:** `replyToMessage`, `markMessageRead`, `ReplyMessageForm`; unread badge on navbar; inbox marks all received read on open
- **User profiles (MVP):** optional profile fields on `users`; `updateProfile` in `app/profile/actions.ts`; `/profile` edit form; public `/users/[id]`; `UserProfileLink` on listings, matches, interested users, messages
- **My Listings:** protected `/my-listings` — owner’s listings, interested users, status updates
- **My Collection:** protected `/my-collection` — CRUD for `collection_items`
- **My Wishlist (Phase 1):** protected `/my-wishlist` — CRUD for `wishlist_items`; TCG search/manual add; priority 1–5
- **Activate wishlist (Phase 2):** protected `/events/[id]/activate-wishlist`; `activateWishlistForEvent` in `app/events/[id]/activate-wishlist/actions.ts`; checklist UI; snapshotted want listings with `wishlist_item_id`
- **My Wishlist UX:** unique constraints on `wishlist_items`; duplicate error on create; bulk delete/set priority on `/my-wishlist`; activate page filters + select all/none + selected count
- **Set Browser (Phase 1):** protected `/sets` + `/sets/[setId]`; set search; card grid with Owned/Wanted/Missing badges; single-card add via existing create actions + `return_path`
- **Set Browser (Phase 2 — bulk):** checkbox selection + highlighted borders; Select all / Clear all / numeric range picker; sticky bulk toolbar; `bulkAddCardsToCollection` / `bulkAddCardsToWishlist`
- **Set Browser (Phase 3 — completion & filters):** `SetCompletionStatsPanel`; All/Owned/Wanted/Missing filters; “Add all missing to Wishlist” quick action
- **Set Browser (Phase 4 — binder mode):** Grid/Binder toggle; `SetBrowserBinder`; binder pagination helpers in `lib/set-browser.ts`
- **Collection Dashboard (Home):** logged-in `/` via `loadCollectorDashboard` in `lib/dashboard.ts`; `CollectorDashboard` component; recent set cookie on `/sets/[setId]` visits
- **Listing from collection:** searchable picker prefills form; snapshot on insert + optional `collection_item_id`
- **Language:** optional dropdown on collection + listings (13 values); snapshotted when creating listings
- **Pokémon TCG API (Phase A):** `lib/pokemon-tcg.ts`, `GET /api/card-search?q=...` (auth required); optional `POKEMON_TCG_API_KEY`; DB columns `tcg_api_card_id`, `card_number`, `set_id`; no images stored in DB
- **Pokémon TCG API (Phase B):** `CardSearchCombobox` + `AddCollectionItemForm` on `/my-collection` — search/manual toggle for cards; sealed stays manual
- **Pokémon TCG API (Phase C):** selected official card saved on create with API metadata; list shows badges
- **Pokémon TCG API (Phase D):** collection API fields snapshotted on listing create; thumbnails + badges on event + My Listings pages via `getCardImagesByIds`
- **Event listing search & filters:** `/events/[id]` GET form → URL params; Supabase query filtering in `lib/listing-filters.ts` + `EventListingFilters`
- **Matching engine (V2):** `/my-matches` — `findUserTradeMatches()` in `lib/listing-matches.ts`; grouped by event + user; perfect/strong/direct/reverse categories; no DB table
- **UI:** `Navbar`, `EventCard`, `ListingInterest`, `NewListingForm`, `LanguageSelect`, `CardSearchCombobox`, `AddCollectionItemForm`, `AddWishlistItemForm`, `PrioritySelect`, `ActivateWishlistForm`, `WishlistManageList`, `EventListingFilters`, `ListingOfficialCard`, `UserTradeMatchCard`, `SendMessageForm`, `ReplyMessageForm`, `MessageStatusAlert`, `ProfileForm`, `UserProfileLink`, `SetBrowserCard`, `SetBrowserGrid`, `SetCompletionStatsPanel`, `SetBrowserBinder`, `CollectorDashboard`
- **Stack:** Next.js 16 App Router, React 19, Tailwind v4, Supabase SSR

## Build next (priority order)

1. **Join event** — use `events.join_code`
2. **Collection Projects** — implement generic project system (design complete; not coded)

## Set Browser Phase 1 (done)

Protected routes `/sets` and `/sets/[setId]`. Search sets by name, set ID, or series. Set detail loads all cards in a responsive grid (2 columns on mobile). Each card shows thumbnail, collector number, name, status badge, and Add to Collection / Add to Wishlist buttons (disabled when already owned/wanted).

**Files changed (Phase 1):**

| Area | Files |
|---|---|
| Pokémon TCG lib | `lib/pokemon-tcg.ts` — `searchSets`, `getSet`, `getCardsForSet`, `formatSetReleaseDate` |
| Status helper | `lib/set-browser.ts` — `getSetCardStatus`, badge labels |
| Return path | `lib/return-path.ts` — `getSafeReturnPath` for create redirects |
| API routes | `app/api/sets/route.ts`, `app/api/sets/[setId]/route.ts`, `app/api/sets/[setId]/cards/route.ts` |
| Pages | `app/sets/page.tsx`, `app/sets/[setId]/page.tsx` |
| Component | `components/SetBrowserCard.tsx` |
| Actions | `app/my-collection/actions.ts`, `app/my-wishlist/actions.ts` — optional `return_path` |
| Auth / nav | `middleware.ts`, `components/Navbar.tsx` |

**API routes (auth required):**

- `GET /api/sets?q=...&pageSize=50` → `{ results: PokemonTcgSetSummary[] }`
- `GET /api/sets/[setId]` → `{ set: PokemonTcgSetSummary }`
- `GET /api/sets/[setId]/cards` → `{ cards: PokemonTcgSetCard[] }`

API key stays server-side; responses use the same in-memory cache as `lib/pokemon-tcg.ts`.

**Performance (set detail page):**

- 1 × Pokémon TCG API call for set metadata (`getSet`)
- 1 × Pokémon TCG API call for all cards (`getCardsForSet`, paginated upstream at 250/page)
- 1 × Supabase query for `collection_items` filtered by `user_id` + `set_id`
- 1 × Supabase query for `wishlist_items` filtered by `user_id` + `set_id`
- No per-card queries; status resolved in memory via `Set<string>` of `tcg_api_card_id`

**How to test:**

1. Log in, open `/sets` (or navbar **Set Browser**).
2. Search e.g. `brilliant` or `swsh9` — confirm logo/symbol, series, release date, card count.
3. Open a set — grid shows all cards with badges.
4. Add a card to collection — redirects back with `?added=collection`; button disables.
5. Add another card to wishlist — `?added=wishlist`; button disables.
6. Confirm rows on `/my-collection` and `/my-wishlist`.
7. Optional: `GET /api/sets?q=swsh9` while logged in (401 when logged out).

## Set Browser Phase 2 — Bulk Collection Management (done)

Checkbox on every card; selection persists while scrolling; selected cards get a blue highlighted border. Above the grid: Select all, Clear all, numeric range picker (plain numbers only — TG01/GG15/SVP123 ignored). Sticky bottom toolbar when cards are selected shows count, collection defaults (language, condition, quantity), wishlist defaults (language, priority), and bulk action buttons.

**Bulk workflow:**

1. Select cards via checkbox, Select all, or range.
2. Set defaults in the sticky toolbar.
3. Click **Add selected to Collection** or **Add selected to Wishlist** — one form submit, one server action, one redirect.
4. Server resolves card metadata via cached `getCardsForSet`, pre-queries existing rows, batch-inserts new ones, skips duplicates.
5. Redirect e.g. `/sets/swsh9?bulk=collection&added=28&alreadyOwned=2` — page shows success banner.

**Duplicate behavior:** Official cards already in collection or wishlist are skipped (not errors). Manual collection/wishlist rows are unaffected. Wishlist unique index still enforced; pre-filter avoids batch failures.

**Performance (bulk action):** 1 × `getCardsForSet` (cached), 1 × existing-rows query, 1 × batch insert, 1 × redirect. Set page load unchanged from Phase 1 (4 requests).

**Files changed (Phase 2):**

| Area | Files |
|---|---|
| Server actions | `app/sets/actions.ts` — `bulkAddCardsToCollection`, `bulkAddCardsToWishlist` |
| Helpers | `lib/set-browser.ts` — numeric range helpers, `parseBulkTcgApiCardIds` |
| Client UI | `components/SetBrowserGrid.tsx` (new), `components/SetBrowserCard.tsx` (checkbox + highlight) |
| Page | `app/sets/[setId]/page.tsx` — bulk result banners, uses `SetBrowserGrid` |

**How to test:**

1. Open a set, select several cards with checkboxes — toolbar appears, borders highlight.
2. Use Select all / Clear all.
3. Enter range 1–10 — only numeric collector numbers selected; helper text explains special numbers are skipped.
4. Set collection defaults, bulk add — banner shows added + already owned counts.
5. Bulk add overlapping selection to wishlist — banner shows added + already wished.
6. Confirm `/my-collection` and `/my-wishlist` rows; single-card buttons still work.

## Set Browser Phase 3 — Completion & Filters (done)

Completion stats panel at top of set detail: total, owned, wanted, missing, completion % (`owned / total`, rounded), and progress bar. Filters above grid: All / Owned / Wanted / Missing — client-side on loaded cards + status sets. Quick action **Add all missing to Wishlist** submits all cards that are not owned and not already wished via `bulkAddCardsToWishlist`; shows existing bulk result banner; skips duplicates.

**Completion calculation** (`computeSetCompletionStats` in `lib/set-browser.ts`):

- **Total** — count of cards loaded from Pokémon TCG API for the set
- **Owned** — cards with a matching `tcg_api_card_id` in `collection_items`
- **Wanted** — cards with a matching `tcg_api_card_id` in `wishlist_items` (includes owned + wanted)
- **Missing** — cards not in collection (`total - owned`)
- **Completion %** — `Math.round((owned / total) * 100)`

**Filters** (`matchesSetCardFilter`):

- **All** — every card
- **Owned** — owned or owned + wanted
- **Wanted** — wanted or owned + wanted
- **Missing** — not owned and not on wishlist (matches Missing badge)

Select all applies to the active filter; range selection still uses the full set.

**Quick action:** Computes missing wishlist candidates client-side; one form submit → `bulkAddCardsToWishlist` → redirect with `?bulk=wishlist&added=N&alreadyWished=M`. Shares wishlist language/priority with bulk toolbar state.

**Files changed (Phase 3):**

| Area | Files |
|---|---|
| Helpers | `lib/set-browser.ts` — `computeSetCompletionStats`, `matchesSetCardFilter`, `getMissingWishlistCandidateIds`, filter constants |
| Components | `components/SetCompletionStatsPanel.tsx` (new), `components/SetBrowserGrid.tsx` (filters + quick action) |
| Page | `app/sets/[setId]/page.tsx` — stats panel above grid |

**How to test:**

1. Open a set — confirm stats panel and progress bar match badge counts.
2. Filter Owned / Wanted / Missing — grid updates; no extra requests.
3. Click **Add all missing to Wishlist** — banner shows added + already wished counts; `/my-wishlist` updated.
4. Confirm Phase 2 still works: checkboxes, range, bulk toolbar, single-card buttons.

**Remaining after Phase 3:** collection unique index for official cards (Projects system separate).

## Set Browser Phase 4 — Binder Mode (done)

Grid/Binder toggle on `/sets/[setId]` (localStorage key `pet-set-browser-view`, default Grid). Binder shows 9 cards per page (3×3 desktop, 2-column layout on mobile) in collector-number order. Page navigation: Previous/Next, `Page N / M`, jump-to-page input. Desktop sidebar + mobile drawer list every page with owned/total and completion %. Status borders: green owned, blue wanted, green + blue badge owned+wanted, grey dashed missing. Filters, bulk selection, range selection, quick actions, and single-card buttons all work in both views. No extra fetches — client-side pagination over loaded cards.

**Binder architecture:** `SetBrowserGrid` owns shared state (selection, filters, view mode, binder page). `SetBrowserBinder` renders one page + navigation + page overview. `SetBrowserCard` accepts `mode="binder"` for border styling. Helpers in `lib/set-browser.ts`: `BINDER_PAGE_SIZE`, `computeBinderPageSummaries`, `getBinderPageCards`, `clampBinderPage`.

**Performance:** Zero additional server/API requests. Page changes and view toggle are client-only `useMemo` slices over the props `cards` array.

**Files changed:**

| Area | Files |
|---|---|
| Helpers | `lib/set-browser.ts` |
| Components | `components/SetBrowserBinder.tsx` (new), `components/SetBrowserGrid.tsx`, `components/SetBrowserCard.tsx` |

**How to test:**

1. Open a set → default Grid view.
2. Switch to Binder → page 1 shows first 9 cards in 3×3 (desktop) or 2 columns (mobile).
3. Navigate pages; jump to page 21 on a large set.
4. Open Pages drawer (mobile) or sidebar (desktop) → click a page to jump; verify completion %.
5. Confirm owned/wanted/missing borders and actions still work.
6. Reload page → Binder preference persists via localStorage.
7. Test bulk select + toolbar in Binder mode.

**Future improvements:** drag-and-drop reorder, custom binder sizes, Projects integration, page-turn animations, print layout.

## Collection Dashboard (Home) (done)

Logged-in users see a collector dashboard at `/`. Guests still see the marketing landing page.

**Sections:** Welcome + display name; Collection stats; Trading stats; Events (upcoming + events with active listings); Continue collecting (up to 5 sets with completion %); Top 10 priority wishlist cards; Quick action links.

**Dashboard queries** (`loadCollectorDashboard` — batched with `Promise.all` where possible):

| Query | Purpose |
|---|---|
| `users` profile | Display name |
| `collection_items` (all rows for user) | Total qty, distinct cards, owned-by-set, activity fallback |
| `wishlist_items` count | Wishlist total |
| `wishlist_items` top 10 by priority | Wishlist section |
| `listing_interests` count | Interested listings |
| `messages` unread count | Unread messages (`getUnreadMessageCount`) |
| `events` upcoming (end_date ≥ today, limit 5) | Upcoming events |
| `listings` active for user | Active listings count, match input, attending events |
| `listings` active at same events (others) | Match count via `findUserTradeMatches` |
| `getSet` × up to 5 (cached) | Continue collecting totals |
| `getCardImagesByIds` (batch) | Wishlist thumbnails |

Recent sets: cookie `pet_recent_sets` updated on `/sets/[setId]` visit; fallback = most recently updated `set_id` from collection/wishlist.

**Statistics shown:**

- Collection: total cards owned (sum of quantity), distinct cards, wishlist items, active listings
- Trading: active matches, interested listings, unread messages
- Events: upcoming events list; events where user has active listings (“Events you're listing at”)
- Continue collecting: set name, owned/total, completion %, progress bar
- Wishlist: top 10 by priority (1 first), thumbnail, name, set, priority label

**Files changed:**

| Area | Files |
|---|---|
| Data | `lib/dashboard.ts`, `lib/recent-sets.ts` |
| UI | `components/CollectorDashboard.tsx` |
| Pages | `app/page.tsx`, `app/sets/[setId]/page.tsx` (recent set cookie) |

**How to test:**

1. Sign out → `/` shows landing page.
2. Sign in → `/` shows dashboard with your display name.
3. Add collection/wishlist/listings → stats update on refresh.
4. Visit a set page → return to `/` → set appears under Continue collecting.
5. Add high-priority wishlist cards → appear in Wishlist section with thumbnails.
6. Confirm quick action links work.

**Future improvements:** join-code event attendance, dedicated recent-sets DB, dashboard widgets for match highlights, collection value/condition breakdown, redirect login to `/` instead of `/profile`.

## Supabase schema

**`events`:** `id`, `name`, `location`, `start_date`, `end_date`, `join_code`, `created_by`, `created_at`

**`listings`:** `id`, `event_id`, `user_id`, `type` (`want`|`trade`|`sale`), `card_name`, `card_ref` (required), `trade_for`, `target_price`, `status` (`active`|`reserved`|`completed`|`removed`), `condition`, `set_name`, `notes`, `language`, `tcg_api_card_id`, `card_number`, `set_id`, `collection_item_id` (optional), `wishlist_item_id` (optional), `created_at`, `updated_at`

**`wishlist_items`:** `id`, `user_id`, `card_name`, `card_ref`, `set_name`, `language`, `notes`, `tcg_api_card_id`, `card_number`, `set_id`, `priority` (1–5, default 3), `created_at`, `updated_at` — unique `(user_id, tcg_api_card_id)` when official; unique `(user_id, card_ref)` when manual

**`collection_items`:** `id`, `user_id`, `item_kind` (`card`|`sealed`), `card_name`, `card_ref`, `set_name`, `condition`, `notes`, `language`, `tcg_api_card_id`, `card_number`, `set_id`, `quantity`, `created_at`, `updated_at`

**`listing_interests`:** `id`, `listing_id`, `user_id`, `created_at` — unique `(listing_id, user_id)`

**`messages`:** `id`, `sender_id`, `recipient_id`, `listing_id` (optional), `parent_message_id` (optional), `body`, `read_at` (optional), `created_at`

**`users`:** `id`, `email`, `display_name`, `bio`, `location`, `favorite_pokemon`, `avatar_url`, `created_at`

**Links:** `event_id` → event; `user_id` → auth user; `listing_id` → listing; `collection_item_id` → collection item (provenance only); `wishlist_item_id` → wishlist item (provenance only); `listing_interests` embed `users` via `user_id`; `messages` link sender/recipient → `users`, optional `listing_id` → `listings`

## Current status

| Area | Status |
|---|---|
| Auth | Done |
| Events list/detail | Done |
| Create listing | Done |
| Listings display | Done |
| Listing interests (MVP) | Done |
| Contact flow (MVP) | Done |
| Message replies + unread | Done |
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
| User profiles (MVP) | Done |
| My Wishlist (Phase 1) | Done |
| Activate wishlist (Phase 2) | Done |
| My Wishlist UX | Done |
| Create listing cleanup | Done |
| Set Browser (Phase 1) | Done |
| Set Browser (Phase 2 — bulk) | Done |
| Set Browser (Phase 3 — completion & filters) | Done |
| Set Browser (Phase 4 — binder mode) | Done |
| Collection Dashboard (Home) | Done |
| Join event | Not started |

## Future: Bulk add cards by set/range

**Phase 2 bulk add and Phase 3 completion/filters/quick action are done** on `/sets/[setId]`. Remaining: binder mode, collection unique index for official cards.

Original planned flow (now implemented):

1. Search a Pokémon TCG set (e.g. Brilliant Stars).
2. Select a card number range (e.g. 1–32) or individual numbers.
3. Add matching cards to **My Wishlist** or **My Collection** in one action.

Blockers for remaining items: binder layout, collection unique index for official cards.

## Tips for the next chat

- Run `npm run dev` (Turbopack). Env in `.env.local`.
- Optional server env: `POKEMON_TCG_API_KEY` (Pokémon TCG Developer Portal; higher rate limits than unauthenticated).
- Card search: `GET /api/card-search?q=char` while logged in → `{ results: [...] }` with `images.small` for display only (not stored in DB). Future images: `getCardById` / `getCardImagesById` in `lib/pokemon-tcg.ts`.
- Dashboard: logged-in `/` uses `loadCollectorDashboard` in `lib/dashboard.ts`; recent sets cookie `pet_recent_sets` on set page visits
- Set browser: `/sets/[setId]` — Grid/Binder toggle (`pet-set-browser-view` localStorage); binder pagination via `computeBinderPageSummaries` in `lib/set-browser.ts`; completion stats, filters, bulk actions unchanged
- Create listing: `/events/[id]/new-listing` accepts **sale/trade only**; `createListing` rejects `type=want`; want listings via `activateWishlistForEvent`; legacy want rows kept
- Listing interests: `addInterest(listingId)` / `removeInterest(listingId)` in `app/listing-interests/actions.ts`; table `listing_interests`.
- Messages: `sendMessage`, `replyToMessage`, `markMessageRead` in `app/messages/actions.ts`; max body 1000 chars; inbox at `/messages`; unread = `read_at IS NULL`
- Profiles: `updateProfile(formData)` in `app/profile/actions.ts`; max lengths display_name 80, bio 500, location 120, favorite_pokemon 80, avatar_url 500; public profile at `/users/[id]`
- Wishlist: `createWishlistItem`, `updateWishlistItem`, `deleteWishlistItem`, `bulkDeleteWishlistItems`, `bulkSetWishlistPriority` in `app/my-wishlist/actions.ts`; parsing in `lib/wishlist.ts`; duplicate message: "This card is already in your wishlist."
- Activate wishlist: `activateWishlistForEvent(eventId, wishlistItemIds[])` in `app/events/[id]/activate-wishlist/actions.ts`; page `/events/[id]/activate-wishlist`; partial unique index on active want + `wishlist_item_id` per event
- Event listing filters: `/events/[id]?q=charizard&type=sale&language=English&condition=Near+Mint&official=1&sort=name` — parsed in `lib/listing-filters.ts`, applied in Supabase query on event page.
- Matches: `/my-matches` — `findUserTradeMatches()` in `lib/listing-matches.ts`; groups by event + other user; dedupes cards; categories perfect/strong/direct/reverse; absolute counts only.
- Migrations (run in Supabase SQL editor if not applied):
  - `supabase/migrations/20260613120000_create_collection_items.sql`
  - `supabase/migrations/20260628120000_add_language_columns.sql`
  - `supabase/migrations/20260628130000_add_tcg_api_card_fields.sql`
  - `supabase/migrations/20260628140000_create_listing_interests.sql`
  - `supabase/migrations/20260628150000_create_messages.sql`
  - `supabase/migrations/20260628160000_add_message_replies_and_read_state.sql`
  - `supabase/migrations/20260628170000_add_user_profile_fields.sql`
  - `supabase/migrations/20260628180000_create_wishlist_items.sql`
  - `supabase/migrations/20260628190000_add_wishlist_item_id_to_listings.sql`
  - `supabase/migrations/20260628200000_wishlist_unique_constraints.sql`
- Language values live in `lib/languages.ts` (dropdown only; DB stores plain text).
- After changes: `npm run build`.
