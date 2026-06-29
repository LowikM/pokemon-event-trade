import Link from "next/link";
import { redirect } from "next/navigation";

import { removeInterest } from "@/app/listing-interests/actions";
import {
  ListingCardThumbnail,
  ListingOfficialCardBadges,
} from "@/components/ListingOfficialCard";
import { getCardImagesByIds } from "@/lib/pokemon-tcg";
import { createClient } from "@/lib/supabase/server";

type ListingType = "want" | "trade" | "sale";
type ListingStatus = "active" | "reserved" | "completed" | "removed";

type EmbeddedEvent = { id: string; name: string };
type EmbeddedListing = {
  id: string;
  event_id: string;
  user_id: string;
  type: ListingType;
  card_name: string;
  trade_for: string | null;
  status: ListingStatus;
  condition: string | null;
  set_name: string | null;
  notes: string | null;
  language: string | null;
  tcg_api_card_id: string | null;
  card_number: string | null;
  set_id: string | null;
  events: EmbeddedEvent | EmbeddedEvent[] | null;
};

type InterestRow = {
  id: string;
  created_at: string;
  listings: EmbeddedListing | EmbeddedListing[] | null;
};

const TYPE_LABELS: Record<ListingType, string> = {
  want: "Want",
  trade: "Trade",
  sale: "Sale",
};

const buttonClassName =
  "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900";

function formatDateTime(date: string) {
  return new Date(date).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getListing(interest: InterestRow) {
  if (!interest.listings) {
    return null;
  }

  return Array.isArray(interest.listings)
    ? (interest.listings[0] ?? null)
    : interest.listings;
}

function getEventName(events: EmbeddedListing["events"]) {
  if (!events) {
    return null;
  }

  return Array.isArray(events) ? (events[0]?.name ?? null) : events.name;
}

function getEventId(events: EmbeddedListing["events"]) {
  if (!events) {
    return null;
  }

  return Array.isArray(events) ? (events[0]?.id ?? null) : events.id;
}

export default async function MyInterestsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: pageError } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("listing_interests")
    .select(
      `
      id,
      created_at,
      listings(
        id,
        event_id,
        user_id,
        type,
        card_name,
        trade_for,
        status,
        condition,
        set_name,
        notes,
        language,
        tcg_api_card_id,
        card_number,
        set_id,
        events(id, name)
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const interests = (data ?? []) as InterestRow[];
  const listings = interests
    .map(getListing)
    .filter((listing): listing is EmbeddedListing => listing !== null);
  const cardImagesById = await getCardImagesByIds(
    listings
      .map((listing) => listing.tcg_api_card_id)
      .filter((id): id is string => Boolean(id)),
  );

  return (
    <div className="flex flex-1 justify-center px-4 py-12">
      <div className="w-full max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Interests</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Listings you&apos;ve marked as interested.
          </p>
        </div>

        {pageError ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            role="alert"
          >
            {pageError}
          </p>
        ) : null}

        {error ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            role="alert"
          >
            Could not load interests: {error.message}
          </p>
        ) : interests.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            You haven&apos;t expressed interest in any listings yet.{" "}
            <Link href="/events" className="font-medium hover:underline">
              Browse events
            </Link>{" "}
            to find cards.
          </p>
        ) : (
          <ul className="grid gap-4">
            {interests.map((interest) => {
              const listing = getListing(interest);

              if (!listing) {
                return null;
              }

              const eventId = getEventId(listing.events);
              const eventName = getEventName(listing.events);
              const imageUrl = listing.tcg_api_card_id
                ? (cardImagesById.get(listing.tcg_api_card_id)?.small ?? null)
                : null;
              const removeListingInterest = removeInterest.bind(null, listing.id);

              return (
                <li key={interest.id}>
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
                          <h2 className="text-base font-semibold tracking-tight">
                            {listing.card_name}
                          </h2>
                        </div>

                        <dl className="mt-3 space-y-2 text-sm">
                          <div>
                            <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                              Event
                            </dt>
                            <dd>
                              {eventId ? (
                                <Link
                                  href={`/events/${eventId}`}
                                  className="hover:underline"
                                >
                                  {eventName ?? "View event"}
                                </Link>
                              ) : (
                                (eventName ?? "Unknown event")
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
                          <div>
                            <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                              Interested at
                            </dt>
                            <dd>{formatDateTime(interest.created_at)}</dd>
                          </div>
                        </dl>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <form action={removeListingInterest}>
                            <button type="submit" className={buttonClassName}>
                              ✓ Interested
                            </button>
                          </form>
                          {listing.status !== "active" ? (
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">
                              Listing status: {listing.status}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
