import Link from "next/link";
import { redirect } from "next/navigation";

import { updateListingStatus } from "@/app/my-listings/actions";
import {
  ListingCardThumbnail,
  ListingOfficialCardBadges,
} from "@/components/ListingOfficialCard";
import { formatInterestCount } from "@/lib/listing-interests";
import { getCardImagesByIds } from "@/lib/pokemon-tcg";
import { createClient } from "@/lib/supabase/server";

type ListingType = "want" | "trade" | "sale";
type ListingStatus = "active" | "reserved" | "completed" | "removed";

type EmbeddedEvent = { name: string };
type EmbeddedUser = { display_name: string | null; email: string };
type EmbeddedInterest = {
  id: string;
  created_at: string;
  users: EmbeddedUser | EmbeddedUser[] | null;
};

type ListingRow = {
  id: string;
  card_name: string;
  type: ListingType;
  status: ListingStatus;
  set_name: string | null;
  language: string | null;
  tcg_api_card_id: string | null;
  card_number: string | null;
  set_id: string | null;
  created_at: string;
  events: EmbeddedEvent | EmbeddedEvent[] | null;
  listing_interests: EmbeddedInterest[] | null;
};

const TYPE_LABELS: Record<ListingType, string> = {
  want: "Want",
  trade: "Trade",
  sale: "Sale",
};

const STATUS_OPTIONS: ListingStatus[] = [
  "active",
  "reserved",
  "completed",
  "removed",
];

function formatDateTime(date: string) {
  return new Date(date).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getEventName(events: ListingRow["events"]) {
  if (!events) return null;
  if (Array.isArray(events)) return events[0]?.name ?? null;
  return events.name;
}

function getInterestedUser(users: EmbeddedInterest["users"]) {
  if (!users) return null;
  if (Array.isArray(users)) return users[0] ?? null;
  return users;
}

export default async function MyListingsPage({
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
    .from("listings")
    .select(
      `
      id,
      card_name,
      type,
      status,
      set_name,
      language,
      tcg_api_card_id,
      card_number,
      set_id,
      created_at,
      events(name),
      listing_interests(
        id,
        created_at,
        users(display_name, email)
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const listings = (data ?? []) as ListingRow[];
  const cardImagesById = await getCardImagesByIds(
    listings
      .map((listing) => listing.tcg_api_card_id)
      .filter((id): id is string => Boolean(id)),
  );

  return (
    <div className="flex flex-1 justify-center px-4 py-12">
      <div className="w-full max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Listings</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Your listings and users who expressed interest.
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
            Could not load listings: {error.message}
          </p>
        ) : listings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            You have no listings yet.{" "}
            <Link href="/events" className="font-medium hover:underline">
              Browse events
            </Link>{" "}
            to create one.
          </p>
        ) : (
          <ul className="grid gap-4">
            {listings.map((listing) => {
              const interests = listing.listing_interests ?? [];
              const interestCount = interests.length;
              const updateStatus = updateListingStatus.bind(null, listing.id);
              const imageUrl = listing.tcg_api_card_id
                ? (cardImagesById.get(listing.tcg_api_card_id)?.small ?? null)
                : null;

              return (
                <li key={listing.id}>
                  <article className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="flex gap-3">
                      <ListingCardThumbnail
                        imageUrl={imageUrl}
                        cardName={listing.card_name}
                      />
                      <div className="min-w-0 flex-1 space-y-3">
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

                        <dl className="grid gap-2 text-sm sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                            Status
                          </dt>
                          <dd className="mt-1">
                            <form
                              action={updateStatus}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <select
                                id={`status-${listing.id}`}
                                name="status"
                                defaultValue={listing.status}
                                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
                              >
                                {STATUS_OPTIONS.map((status) => (
                                  <option key={status} value={status}>
                                    {status.charAt(0).toUpperCase() +
                                      status.slice(1)}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="submit"
                                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                              >
                                Update
                              </button>
                            </form>
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                            Event
                          </dt>
                          <dd className="mt-0.5">
                            {getEventName(listing.events) ?? "Unknown event"}
                          </dd>
                        </div>
                        {listing.set_name ? (
                          <div>
                            <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                              Set
                            </dt>
                            <dd className="mt-0.5">{listing.set_name}</dd>
                          </div>
                        ) : null}
                        <div>
                          <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                            Created
                          </dt>
                          <dd className="mt-0.5">
                            {formatDateTime(listing.created_at)}
                          </dd>
                        </div>
                        {listing.language ? (
                          <div>
                            <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                              Language
                            </dt>
                            <dd className="mt-0.5">{listing.language}</dd>
                          </div>
                        ) : null}
                        <div>
                          <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                            Interests
                          </dt>
                          <dd className="mt-0.5">
                            {formatInterestCount(interestCount)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    </div>

                    <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                      <h3 className="text-sm font-medium">Interested users</h3>

                      {interestCount === 0 ? (
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                          No interested users yet.
                        </p>
                      ) : (
                        <ul className="mt-3 space-y-3">
                          {interests.map((interest) => {
                            const interestedUser = getInterestedUser(
                              interest.users,
                            );

                            return (
                              <li
                                key={interest.id}
                                className="rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900"
                              >
                                <p className="font-medium">
                                  {interestedUser?.display_name ?? "Unknown user"}
                                </p>
                                <p className="text-zinc-600 dark:text-zinc-400">
                                  {interestedUser?.email ?? "No email"}
                                </p>
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                                  Interested at{" "}
                                  {formatDateTime(interest.created_at)}
                                </p>
                              </li>
                            );
                          })}
                        </ul>
                      )}
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
