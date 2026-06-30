# Release Checklist — Pokémon Event Trade

Pre-release audit for first Vercel deployment / external test. Last audited: build passes (`npm run build`), TypeScript clean, no blocking runtime errors known.

---

## What is ready

### Build & types
- [x] `npm run build` succeeds (Next.js 16.2.9, Turbopack production build)
- [x] TypeScript compiles with no errors
- [x] All app routes render as dynamic server routes (expected for auth + Supabase)

### Core features (MVP)
- [x] Auth — email sign up, sign in, sign out (Supabase SSR + middleware session refresh)
- [x] Public event browsing — `/events`, `/events/[id]` (listings visible without login)
- [x] Protected collector flows — collection, wishlist, set browser, listings, interests, matches, messages, profile
- [x] Listing create (sale/trade), wishlist activation (want), interests, contact/messages
- [x] Pokémon TCG API integration — card search, set browser (with optional API key)
- [x] Logged-in home dashboard at `/`

### Auth enforcement
- [x] Middleware redirects unauthenticated users away from protected path prefixes
- [x] Page-level `getUser()` + `redirect("/login")` on protected pages and server actions
- [x] API routes return 401 when unauthenticated (`/api/card-search`, `/api/sets/*`)

### UX basics
- [x] Loading skeletons for `/sets` and `/sets/[setId]`
- [x] Empty states on events, set search, set detail, filtered grids
- [x] Error banners on most data-fetch pages (inline alerts, not global `error.tsx`)
- [x] `app/events/[id]/not-found.tsx` for missing events
- [x] Mobile set browser binder toggle fix (localStorage hydration race)

### Logging
- [x] No stray `console.log` / `console.debug` in app code
- [x] `console.error` only in API/upstream failure paths (acceptable for Vercel logs)

---

## Must fix before deploy

These are **operator / infrastructure** steps, not code blockers:

### 1. Supabase project setup
- [ ] Create or confirm Supabase project for production
- [ ] Apply **all** migrations (see list below) in timestamp order
- [ ] Confirm **base schema** exists: `users`, `events`, `listings`, enums (`listing_type`, `listing_status`) — these are **not** in the repo migration folder; they must already exist in your Supabase project or be created manually before the repo migrations
- [ ] Enable RLS policies on all tables (migrations add policies for newer tables; verify base tables too)
- [ ] Create at least one test `events` row for external testers

### 2. Supabase Auth URLs (production domain)
- [ ] **Site URL** — set to production URL (e.g. `https://your-app.vercel.app`)
- [ ] **Redirect URLs** — add production URL and `https://your-app.vercel.app/**`
- [ ] Confirm email confirmation settings match your test plan (enabled/disabled)

### 3. Vercel environment variables
- [ ] Set all required env vars (see below) for Production **and** Preview if testers use preview deploys
- [ ] Redeploy after env changes

### 4. Smoke test on production URL
- [ ] Sign up / sign in / sign out
- [ ] Browse events (guest)
- [ ] Create collection item, wishlist item, listing
- [ ] Set browser search + add card
- [ ] Send a message between two test accounts
- [ ] Mobile: navbar scroll, set browser Grid/Binder toggle, bulk toolbar

---

## Can wait until after deploy

### Code quality (non-blocking)
- [ ] ESLint warnings — unused destructured vars in collection/wishlist update actions (`_tcgApiCardId`, etc.)
- [ ] ESLint `react-hooks/set-state-in-effect` in `SetBrowserGrid.tsx`, `CardSearchCombobox.tsx` (build unaffected)
- [ ] `@next/next/no-img-element` warnings (TCG thumbnails intentionally use `<img>` — API URLs, not stored assets)
- [ ] Next.js middleware deprecation notice (`middleware` → `proxy` convention) — informational only

### Missing but not MVP-blocking
- [ ] Global `app/error.tsx` and route-level `error.tsx` files (most routes use inline error banners)
- [ ] `app/not-found.tsx` at root (only event detail has custom not-found)
- [ ] Join event via `join_code` (schema column exists, feature not built)
- [ ] Collection Projects system (design only)
- [ ] Real-time chat / push notifications
- [ ] Collection unique index for official `tcg_api_card_id` rows
- [ ] README update (still default create-next-app boilerplate)
- [ ] Redirect authenticated `/login` → `/` instead of `/profile` (nice-to-have)

### Deprecated / legacy paths (keep, do not remove pre-release)
- `lib/pokemon-tcg.ts` — `buildLegacyCardSearchQuery` deprecated alias; internal use only
- Legacy `want` listings created before activate-wishlist flow — still displayed, not migrated
- `listing_interests` replaced older `interests` table name in docs only

---

## Required Vercel environment variables

| Variable | Required | Scope | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Production, Preview | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Production, Preview | Supabase anon/public key |
| `POKEMON_TCG_API_KEY` | No | Production, Preview | Server-only; improves TCG API rate limits. App works without it at lower limits. |

Do **not** commit `.env.local`. Copy from `.env.example`.

---

## Required Supabase migrations

Run in order in the Supabase SQL editor (or CLI). Filenames in `supabase/migrations/`:

| # | Migration file | Purpose |
|---|---|---|
| — | *(base schema, not in repo)* | `users`, `events`, `listings`, core enums — must exist first |
| 1 | `20260613120000_create_collection_items.sql` | `collection_items`, `collection_item_kind`, listings FK |
| 2 | `20260628120000_add_language_columns.sql` | `language` on collection + listings |
| 3 | `20260628130000_add_tcg_api_card_fields.sql` | `tcg_api_card_id`, `card_number`, `set_id` |
| 4 | `20260628140000_create_listing_interests.sql` | `listing_interests` table + RLS |
| 5 | `20260628150000_create_messages.sql` | `messages` table + RLS |
| 6 | `20260628160000_add_message_replies_and_read_state.sql` | `parent_message_id`, `read_at` |
| 7 | `20260628170000_add_user_profile_fields.sql` | Profile fields on `users` |
| 8 | `20260628180000_create_wishlist_items.sql` | `wishlist_items` table + RLS |
| 9 | `20260628190000_add_wishlist_item_id_to_listings.sql` | `listings.wishlist_item_id` |
| 10 | `20260628200000_wishlist_unique_constraints.sql` | Wishlist uniqueness per user + card |

After migrations: verify `public.users` rows are created for new sign-ups (trigger or app insert — confirm your Supabase auth setup).

---

## Route access matrix

### Public (no login required)
| Route | Notes |
|---|---|
| `/` | Landing for guests; dashboard when signed in |
| `/login` | Redirects to `/profile` if already signed in |
| `/events` | Event list |
| `/events/[id]` | Event detail + active listings; interest button prompts login |
| `/users/[id]` | Public collector profile |

### Protected (middleware + page/action checks)
| Route | Middleware | Page redirect |
|---|---|---|
| `/profile` | Yes | Yes |
| `/my-collection` | Yes | Yes |
| `/my-wishlist` | Yes | Yes |
| `/my-listings` | Yes | Yes |
| `/my-interests` | Yes | Yes |
| `/my-matches` | Yes | Yes |
| `/messages` | Yes | Yes |
| `/sets`, `/sets/[setId]` | Yes | Yes |
| `/events/[id]/new-listing` | Yes (path suffix) | Yes |
| `/events/[id]/activate-wishlist` | Yes (path suffix) | Yes |

### API routes (401 if not authenticated; not middleware-gated)
| Route | Method |
|---|---|
| `/api/card-search` | GET |
| `/api/sets` | GET |
| `/api/sets/[setId]` | GET |
| `/api/sets/[setId]/cards` | GET |
| `/api/sets/[setId]/recent` | POST |

---

## Manual test checklist

### Auth
- [ ] Sign up with new email
- [ ] Sign in / sign out
- [ ] Protected URL while logged out → `/login`
- [ ] `/login` while logged in → `/profile`

### Events & listings (guest + auth)
- [ ] `/events` lists events or empty state
- [ ] `/events/[id]` shows event info and active listings
- [ ] Filters on event detail (search, type, language, etc.)
- [ ] Guest clicking interest → login prompt
- [ ] Create sale/trade listing from collection
- [ ] Activate wishlist items as want listings
- [ ] Update listing status on `/my-listings`

### Collection & wishlist
- [ ] Add card via TCG search on `/my-collection`
- [ ] Add manual card; edit quantity; delete
- [ ] Add wishlist item; duplicate blocked; bulk priority/delete
- [ ] Set browser: search set, view grid + binder, bulk add, filters

### Social / trading
- [ ] Mark listing interested; view on `/my-interests`
- [ ] `/my-matches` shows matches when overlapping event listings exist
- [ ] Send message from match/listing; reply; unread badge clears on inbox open

### Dashboard & profiles
- [ ] `/` dashboard stats after adding collection/wishlist/listings
- [ ] Edit `/profile`; view public `/users/[id]`

### Mobile (Safari or Chrome)
- [ ] Navbar links scroll horizontally without breaking layout
- [ ] Set browser Grid/Binder toggle works
- [ ] Bulk selection toolbar readable and scrollable
- [ ] Event listing cards and forms usable

### Production-only
- [ ] TCG API calls succeed (with or without API key)
- [ ] Cookies/session persist across refresh on production domain
- [ ] No mixed-content or CORS errors in browser console

---

## Audit notes (reference)

| Check | Result |
|---|---|
| `npm run build` | Pass |
| TypeScript | Pass |
| `npm run lint` | 3 errors (react-hooks rules), 9 warnings — **does not block build** |
| `console.log` | None in app source |
| Broken internal links | None found — all `href` targets match existing routes |
| Loading states | `/sets`, `/sets/[setId]` only |
| Error states | Inline page alerts; no global error boundary |
| Env vars documented | `.env.example` added |
| Middleware gaps fixed | `/new-listing`, `/activate-wishlist` suffixes added |
