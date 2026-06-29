import Link from "next/link";
import { redirect } from "next/navigation";

import { UserTradeMatchCard } from "@/components/UserTradeMatchCard";
import {
  findUserTradeMatches,
  type MatchListing,
  type MatchUser,
} from "@/lib/listing-matches";
import { getCardImagesByIds } from "@/lib/pokemon-tcg";
import { createClient } from "@/lib/supabase/server";

type EmbeddedEvent = { id: string; name: string };
type EmbeddedUser = MatchUser;

type ListingRow = MatchListing & {
  events: EmbeddedEvent | EmbeddedEvent[] | null;
  users: EmbeddedUser | EmbeddedUser[] | null;
};

const LISTING_SELECT = `
  id,
  event_id,
  user_id,
  type,
  card_name,
  card_ref,
  card_number,
  language,
  tcg_api_card_id,
  set_name,
  events(id, name)
`;

function getEmbeddedEvent(events: ListingRow["events"]) {
  if (!events) {
    return null;
  }

  return Array.isArray(events) ? (events[0] ?? null) : events;
}

function getEmbeddedUser(users: ListingRow["users"]) {
  if (!users) {
    return null;
  }

  return Array.isArray(users) ? (users[0] ?? null) : users;
}

function toMatchListing(listing: ListingRow): MatchListing {
  return {
    id: listing.id,
    event_id: listing.event_id,
    user_id: listing.user_id,
    type: listing.type,
    card_name: listing.card_name,
    card_ref: listing.card_ref,
    card_number: listing.card_number,
    language: listing.language,
    tcg_api_card_id: listing.tcg_api_card_id,
    set_name: listing.set_name,
  };
}

export default async function MyMatchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userListingsData, error: userListingsError } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("user_id", user.id)
    .eq("status", "active");

  const userListings = (userListingsData ?? []) as ListingRow[];
  const eventIds = [...new Set(userListings.map((listing) => listing.event_id))];
  const eventNames = new Map<string, string>();

  for (const listing of userListings) {
    const event = getEmbeddedEvent(listing.events);
    if (event) {
      eventNames.set(event.id, event.name);
    }
  }

  let otherListings: (MatchListing & { user: MatchUser | null })[] = [];

  if (eventIds.length > 0) {
    const { data: otherListingsData, error: otherListingsError } = await supabase
      .from("listings")
      .select(`${LISTING_SELECT}, users(display_name, email)`)
      .eq("status", "active")
      .in("event_id", eventIds)
      .neq("user_id", user.id);

    if (otherListingsError) {
      return (
        <div className="flex flex-1 justify-center px-4 py-12">
          <div className="w-full max-w-3xl space-y-4">
            <h1 className="text-2xl font-semibold tracking-tight">My Matches</h1>
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
              role="alert"
            >
              Could not load listings: {otherListingsError.message}
            </p>
          </div>
        </div>
      );
    }

    otherListings = ((otherListingsData ?? []) as ListingRow[]).map(
      (listing) => ({
        ...toMatchListing(listing),
        user: getEmbeddedUser(listing.users),
      }),
    );

    for (const listing of (otherListingsData ?? []) as ListingRow[]) {
      const event = getEmbeddedEvent(listing.events);
      if (event) {
        eventNames.set(event.id, event.name);
      }
    }
  }

  if (userListingsError) {
    return (
      <div className="flex flex-1 justify-center px-4 py-12">
        <div className="w-full max-w-3xl space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">My Matches</h1>
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            role="alert"
          >
            Could not load your listings: {userListingsError.message}
          </p>
        </div>
      </div>
    );
  }

  const matches = findUserTradeMatches(
    userListings.map(toMatchListing),
    otherListings,
    eventNames,
  );

  const tcgApiCardIds = new Set<string>();

  for (const match of matches) {
    for (const card of [...match.theyHaveForMe, ...match.iHaveForThem]) {
      if (card.tcgApiCardId) {
        tcgApiCardIds.add(card.tcgApiCardId);
      }
    }
  }

  const cardImagesById = await getCardImagesByIds(tcgApiCardIds);

  return (
    <div className="flex flex-1 justify-center px-4 py-12">
      <div className="w-full max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Matches</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Trading opportunities grouped by event and collector — based on your
            active want and offer listings.
          </p>
        </div>

        {userListings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            You have no active listings yet.{" "}
            <Link href="/events" className="font-medium hover:underline">
              Browse events
            </Link>{" "}
            to create one.
          </p>
        ) : matches.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            No matches found for your active listings yet.
          </p>
        ) : (
          <ul className="grid gap-4">
            {matches.map((match) => (
              <li key={match.id}>
                <UserTradeMatchCard
                  match={match}
                  cardImagesById={cardImagesById}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
