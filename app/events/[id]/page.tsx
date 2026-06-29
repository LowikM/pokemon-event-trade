import Link from "next/link";
import { notFound } from "next/navigation";

import { EventListingFilters } from "@/components/EventListingFilters";
import { ListingInterest } from "@/components/ListingInterest";
import { MessageStatusAlert } from "@/components/MessageStatusAlert";
import { UserProfileLink } from "@/components/UserProfileLink";
import {
  ListingCardThumbnail,
  ListingOfficialCardBadges,
} from "@/components/ListingOfficialCard";
import {
  escapeIlikePattern,
  hasActiveListingFilters,
  LISTING_SORT_OPTIONS,
  parseListingFilters,
} from "@/lib/listing-filters";
import { getCardImagesByIds } from "@/lib/pokemon-tcg";
import { createClient } from "@/lib/supabase/server";

type EventDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ListingOwner = {
  id: string;
  display_name: string | null;
  email: string;
};

type Listing = {
  id: string;
  event_id: string;
  user_id: string;
  type: "want" | "trade" | "sale";
  card_name: string;
  trade_for: string | null;
  status: string;
  condition: string | null;
  set_name: string | null;
  notes: string | null;
  language: string | null;
  tcg_api_card_id: string | null;
  card_number: string | null;
  set_id: string | null;
  created_at: string;
  updated_at: string;
  users: ListingOwner | ListingOwner[] | null;
};

const TYPE_LABELS: Record<Listing["type"], string> = {
  want: "Want",
  trade: "Trade",
  sale: "Sale",
};

function getListingOwner(users: Listing["users"]) {
  if (!users) {
    return null;
  }

  return Array.isArray(users) ? (users[0] ?? null) : users;
}

function formatEventDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildListingSearchOrFilter(query: string) {
  const pattern = `%${escapeIlikePattern(query)}%`;
  const quotedPattern = `"${pattern.replace(/"/g, '""')}"`;

  return [
    `card_name.ilike.${quotedPattern}`,
    `set_name.ilike.${quotedPattern}`,
    `card_number.ilike.${quotedPattern}`,
    `language.ilike.${quotedPattern}`,
  ].join(",");
}

export default async function EventDetailPage({
  params,
  searchParams,
}: EventDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const pageError =
    typeof resolvedSearchParams.error === "string"
      ? resolvedSearchParams.error
      : undefined;
  const wishlistActivated =
    typeof resolvedSearchParams.wishlistActivated === "string"
      ? resolvedSearchParams.wishlistActivated
      : undefined;
  const messageSent = resolvedSearchParams.messageSent === "1";
  const filters = parseListingFilters(resolvedSearchParams);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: event, error } = await supabase
    .from("events")
    .select(
      "id, name, location, start_date, end_date, join_code, created_by, created_at",
    )
    .eq("id", id)
    .single();

  if (error || !event) {
    notFound();
  }

  let listingsQuery = supabase
    .from("listings")
    .select(
      "id, event_id, user_id, type, card_name, trade_for, status, condition, set_name, notes, language, tcg_api_card_id, card_number, set_id, created_at, updated_at, users(id, display_name, email)",
    )
    .eq("event_id", id)
    .eq("status", "active");

  if (filters.type) {
    listingsQuery = listingsQuery.eq("type", filters.type);
  }

  if (filters.language) {
    listingsQuery = listingsQuery.eq("language", filters.language);
  }

  if (filters.condition) {
    listingsQuery = listingsQuery.eq("condition", filters.condition);
  }

  if (filters.official) {
    listingsQuery = listingsQuery.not("tcg_api_card_id", "is", null);
  }

  if (filters.q) {
    listingsQuery = listingsQuery.or(buildListingSearchOrFilter(filters.q));
  }

  const sort = LISTING_SORT_OPTIONS[filters.sort];
  listingsQuery = listingsQuery.order(sort.column, {
    ascending: sort.ascending,
  });

  const { data: listings, error: listingsError } = await listingsQuery;

  const activeListings = (listings ?? []) as Listing[];
  const cardImagesById = await getCardImagesByIds(
    activeListings
      .map((listing) => listing.tcg_api_card_id)
      .filter((listingId): listingId is string => Boolean(listingId)),
  );
  const listingIds = activeListings.map((listing) => listing.id);

  const interestCountByListing = new Map<string, number>();
  const interestedListingIds = new Set<string>();

  if (listingIds.length > 0) {
    const { data: interests } = await supabase
      .from("listing_interests")
      .select("listing_id, user_id")
      .in("listing_id", listingIds);

    for (const interest of interests ?? []) {
      interestCountByListing.set(
        interest.listing_id,
        (interestCountByListing.get(interest.listing_id) ?? 0) + 1,
      );

      if (user && interest.user_id === user.id) {
        interestedListingIds.add(interest.listing_id);
      }
    }
  }

  const filtersActive = hasActiveListingFilters(filters);

  return (
    <div className="flex flex-1 justify-center px-4 py-12">
      <div className="w-full max-w-3xl space-y-8">
        <div className="space-y-4">
          <Link
            href="/events"
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            ← Back to events
          </Link>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {event.name}
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {event.location}
            </p>
          </div>

          <dl className="grid gap-4 rounded-xl border border-zinc-200 p-6 text-sm dark:border-zinc-800 sm:grid-cols-2">
            <div>
              <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                Start date
              </dt>
              <dd className="mt-1">{formatEventDate(event.start_date)}</dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                End date
              </dt>
              <dd className="mt-1">{formatEventDate(event.end_date)}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/events/${event.id}/new-listing`}
              className="inline-flex rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Create Listing
            </Link>
            <Link
              href={`/events/${event.id}/activate-wishlist`}
              className="inline-flex rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Activate Wishlist
            </Link>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Listings</h2>

          <EventListingFilters eventId={event.id} filters={filters} />

          <MessageStatusAlert messageSent={messageSent} />

          {wishlistActivated ? (
            <p
              className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
              role="status"
            >
              Activated {wishlistActivated} wishlist item
              {wishlistActivated === "1" ? "" : "s"} as want listings.
            </p>
          ) : null}

          {pageError ? (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
              role="alert"
            >
              {pageError}
            </p>
          ) : null}

          {listingsError ? (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
              role="alert"
            >
              Could not load listings: {listingsError.message}
            </p>
          ) : activeListings.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
              {filtersActive
                ? "No listings match your filters."
                : "No listings yet."}
            </p>
          ) : (
            <ul className="grid gap-4">
              {activeListings.map((listing) => {
                const imageUrl = listing.tcg_api_card_id
                  ? (cardImagesById.get(listing.tcg_api_card_id)?.small ?? null)
                  : null;
                const owner = getListingOwner(listing.users);

                return (
                  <li key={listing.id}>
                    <article className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                      <div className="flex gap-3">
                        <ListingCardThumbnail
                          imageUrl={imageUrl}
                          cardName={listing.card_name}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start gap-2">
                            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                              {TYPE_LABELS[listing.type]}
                            </span>
                            <ListingOfficialCardBadges
                              tcgApiCardId={listing.tcg_api_card_id}
                              cardNumber={listing.card_number}
                            />
                            <h3 className="text-base font-semibold tracking-tight">
                              {listing.card_name}
                            </h3>
                          </div>

                          <dl className="mt-3 space-y-2 text-sm">
                            <div>
                              <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                                Listed by
                              </dt>
                              <dd>
                                {owner ? (
                                  <UserProfileLink
                                    userId={listing.user_id}
                                    user={owner}
                                  />
                                ) : (
                                  "Unknown user"
                                )}
                              </dd>
                            </div>
                            {listing.set_name ? (
                              <div>
                                <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                                  Set
                                </dt>
                                <dd>{listing.set_name}</dd>
                              </div>
                            ) : null}
                            {listing.condition ? (
                              <div>
                                <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                                  Condition
                                </dt>
                                <dd>{listing.condition}</dd>
                              </div>
                            ) : null}
                            {listing.language ? (
                              <div>
                                <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                                  Language
                                </dt>
                                <dd>{listing.language}</dd>
                              </div>
                            ) : null}
                            {listing.trade_for ? (
                              <div>
                                <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                                  Trade for
                                </dt>
                                <dd>{listing.trade_for}</dd>
                              </div>
                            ) : null}
                            {listing.notes ? (
                              <div>
                                <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                                  Notes
                                </dt>
                                <dd className="leading-6">{listing.notes}</dd>
                              </div>
                            ) : null}
                          </dl>

                          <ListingInterest
                            listingId={listing.id}
                            listingOwnerId={listing.user_id}
                            listingCardName={listing.card_name}
                            currentUserId={user?.id ?? null}
                            isInterested={interestedListingIds.has(listing.id)}
                            interestCount={
                              interestCountByListing.get(listing.id) ?? 0
                            }
                          />
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
