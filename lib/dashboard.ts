import { cookies } from "next/headers";

import {
  findUserTradeMatches,
  type MatchListing,
  type MatchUser,
  type UserTradeMatch,
} from "@/lib/listing-matches";
import { getUnreadMessageCount } from "@/lib/messages";
import { getSet } from "@/lib/pokemon-tcg";
import {
  mergeRecentSetIds,
  parseRecentSetIds,
  pushRecentSetId,
  RECENT_SETS_COOKIE,
  RECENT_SETS_MAX,
} from "@/lib/recent-sets";
import { getUserDisplayLabel } from "@/lib/users";
import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type CollectionActivityRow = {
  quantity: number | null;
  tcg_api_card_id: string | null;
  card_ref: string;
  set_id: string | null;
  set_name: string | null;
  updated_at: string;
};

type WishlistRow = {
  id: string;
  card_name: string;
  set_name: string | null;
  priority: number;
  tcg_api_card_id: string | null;
  updated_at: string;
};

type ListingRow = MatchListing & {
  events:
    | { id: string; name: string; location: string; start_date: string; end_date: string }
    | { id: string; name: string; location: string; start_date: string; end_date: string }[]
    | null;
  users?: MatchUser | MatchUser[] | null;
};

type EventRow = {
  id: string;
  name: string;
  location: string;
  start_date: string;
  end_date: string;
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
  events(id, name, location, start_date, end_date)
`;

export type DashboardEventSummary = {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
};

export type DashboardContinueSet = {
  setId: string;
  setName: string;
  ownedCount: number;
  totalCards: number;
  completionPercent: number;
};

export type DashboardWishlistCard = {
  id: string;
  cardName: string;
  setName: string | null;
  priority: number;
  tcgApiCardId: string | null;
};

export type CollectorDashboardData = {
  displayName: string;
  collection: {
    totalCardsOwned: number;
    distinctCards: number;
    wishlistItems: number;
    activeListings: number;
  };
  trading: {
    activeMatches: number;
    interestedListings: number;
    unreadMessages: number;
  };
  events: {
    upcoming: DashboardEventSummary[];
    attending: DashboardEventSummary[];
  };
  continueSets: DashboardContinueSet[];
  topWishlist: DashboardWishlistCard[];
  errors: string[];
};

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

function toEventSummary(event: EventRow): DashboardEventSummary {
  return {
    id: event.id,
    name: event.name,
    location: event.location,
    startDate: event.start_date,
    endDate: event.end_date,
  };
}

function computeCollectionStats(items: CollectionActivityRow[]) {
  const distinctKeys = new Set<string>();
  let totalCardsOwned = 0;

  for (const item of items) {
    totalCardsOwned += item.quantity ?? 1;
    distinctKeys.add(item.tcg_api_card_id ?? item.card_ref);
  }

  return {
    totalCardsOwned,
    distinctCards: distinctKeys.size,
  };
}

function countOwnedBySetId(items: CollectionActivityRow[]) {
  const ownedBySet = new Map<
    string,
    { ownedIds: Set<string>; setName: string | null }
  >();

  for (const item of items) {
    if (!item.set_id || !item.tcg_api_card_id) {
      continue;
    }

    const entry = ownedBySet.get(item.set_id) ?? {
      ownedIds: new Set<string>(),
      setName: item.set_name,
    };
    entry.ownedIds.add(item.tcg_api_card_id);

    if (item.set_name) {
      entry.setName = item.set_name;
    }

    ownedBySet.set(item.set_id, entry);
  }

  return new Map(
    [...ownedBySet.entries()].map(([setId, entry]) => [
      setId,
      {
        owned: entry.ownedIds.size,
        setName: entry.setName,
      },
    ]),
  );
}

function getRecentSetIdsFromActivity(
  collectionItems: CollectionActivityRow[],
  wishlistItems: (WishlistRow & { set_id: string | null })[],
) {
  const rows = [
    ...collectionItems
      .filter((item) => item.set_id)
      .map((item) => ({
        setId: item.set_id as string,
        updatedAt: item.updated_at,
      })),
    ...wishlistItems
      .filter((item) => item.set_id)
      .map((item) => ({
        setId: item.set_id as string,
        updatedAt: item.updated_at,
      })),
  ];

  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const seen = new Set<string>();
  const result: string[] = [];

  for (const row of rows) {
    if (seen.has(row.setId)) {
      continue;
    }

    seen.add(row.setId);
    result.push(row.setId);

    if (result.length >= RECENT_SETS_MAX) {
      break;
    }
  }

  return result;
}

async function loadContinueSets(
  setIds: string[],
  ownedBySetId: Map<string, { owned: number; setName: string | null }>,
) {
  const continueSets: DashboardContinueSet[] = [];

  await Promise.all(
    setIds.map(async (setId) => {
      const ownedEntry = ownedBySetId.get(setId);
      let setName = ownedEntry?.setName ?? setId;
      let totalCards = 0;

      try {
        const set = await getSet(setId);

        if (set) {
          setName = set.name;
          totalCards = set.total;
        }
      } catch {
        return;
      }

      const ownedCount = ownedEntry?.owned ?? 0;
      const completionPercent =
        totalCards > 0 ? Math.round((ownedCount / totalCards) * 100) : 0;

      continueSets.push({
        setId,
        setName,
        ownedCount,
        totalCards,
        completionPercent,
      });
    }),
  );

  return continueSets.sort((a, b) => {
    const indexA = setIds.indexOf(a.setId);
    const indexB = setIds.indexOf(b.setId);
    return indexA - indexB;
  });
}

async function loadTradeMatches(
  supabase: SupabaseClient,
  userId: string,
  userListings: ListingRow[],
): Promise<{ matches: UserTradeMatch[]; error?: string }> {
  const eventIds = [...new Set(userListings.map((listing) => listing.event_id))];
  const eventNames = new Map<string, string>();

  for (const listing of userListings) {
    const event = getEmbeddedEvent(listing.events);

    if (event) {
      eventNames.set(event.id, event.name);
    }
  }

  if (eventIds.length === 0) {
    return { matches: [] };
  }

  const { data: otherListingsData, error: otherListingsError } = await supabase
    .from("listings")
    .select(`${LISTING_SELECT}, users(display_name, email)`)
    .eq("status", "active")
    .in("event_id", eventIds)
    .neq("user_id", userId);

  if (otherListingsError) {
    return { matches: [], error: otherListingsError.message };
  }

  const otherListings = ((otherListingsData ?? []) as ListingRow[]).map(
    (listing) => ({
      ...toMatchListing(listing),
      user: getEmbeddedUser(listing.users) ?? null,
    }),
  );

  for (const listing of (otherListingsData ?? []) as ListingRow[]) {
    const event = getEmbeddedEvent(listing.events);

    if (event) {
      eventNames.set(event.id, event.name);
    }
  }

  return {
    matches: findUserTradeMatches(
      userListings.map(toMatchListing),
      otherListings,
      eventNames,
    ),
  };
}

function getAttendingEvents(userListings: ListingRow[]) {
  const eventsById = new Map<string, DashboardEventSummary>();

  for (const listing of userListings) {
    const event = getEmbeddedEvent(listing.events);

    if (event && !eventsById.has(event.id)) {
      eventsById.set(event.id, toEventSummary(event));
    }
  }

  return [...eventsById.values()].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );
}

export async function recordRecentSetVisit(setId: string) {
  const cookieStore = await cookies();
  const existing = parseRecentSetIds(cookieStore.get(RECENT_SETS_COOKIE)?.value);
  const next = pushRecentSetId(existing, setId);

  cookieStore.set(RECENT_SETS_COOKIE, JSON.stringify(next), {
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
    sameSite: "lax",
  });
}

export async function loadCollectorDashboard(
  supabase: SupabaseClient,
  userId: string,
): Promise<CollectorDashboardData> {
  const errors: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const cookieStore = await cookies();
  const visitedSetIds = parseRecentSetIds(
    cookieStore.get(RECENT_SETS_COOKIE)?.value,
  );

  const [
    profileResult,
    collectionResult,
    wishlistCountResult,
    wishlistItemsResult,
    interestsCountResult,
    unreadMessages,
    upcomingEventsResult,
    userListingsResult,
  ] = await Promise.all([
    supabase
      .from("users")
      .select("display_name, email")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("collection_items")
      .select(
        "quantity, tcg_api_card_id, card_ref, set_id, set_name, updated_at",
      )
      .eq("user_id", userId),
    supabase
      .from("wishlist_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("wishlist_items")
      .select("id, card_name, set_name, set_id, priority, tcg_api_card_id, updated_at")
      .eq("user_id", userId)
      .order("priority", { ascending: true })
      .order("updated_at", { ascending: false })
      .limit(10),
    supabase
      .from("listing_interests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    getUnreadMessageCount(supabase, userId),
    supabase
      .from("events")
      .select("id, name, location, start_date, end_date")
      .gte("end_date", today)
      .order("start_date", { ascending: true })
      .limit(5),
    supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("user_id", userId)
      .eq("status", "active"),
  ]);

  if (profileResult.error) {
    errors.push(`Could not load profile: ${profileResult.error.message}`);
  }

  if (collectionResult.error) {
    errors.push(`Could not load collection: ${collectionResult.error.message}`);
  }

  if (wishlistCountResult.error) {
    errors.push(`Could not load wishlist: ${wishlistCountResult.error.message}`);
  }

  if (wishlistItemsResult.error) {
    errors.push(
      `Could not load priority wishlist: ${wishlistItemsResult.error.message}`,
    );
  }

  if (interestsCountResult.error) {
    errors.push(`Could not load interests: ${interestsCountResult.error.message}`);
  }

  if (upcomingEventsResult.error) {
    errors.push(`Could not load events: ${upcomingEventsResult.error.message}`);
  }

  if (userListingsResult.error) {
    errors.push(`Could not load listings: ${userListingsResult.error.message}`);
  }

  const profile = profileResult.data;
  const collectionItems = (collectionResult.data ??
    []) as CollectionActivityRow[];
  const wishlistItems = (wishlistItemsResult.data ?? []) as (WishlistRow & {
    set_id: string | null;
  })[];
  const userListings = (userListingsResult.data ?? []) as ListingRow[];

  const collectionStats = computeCollectionStats(collectionItems);
  const ownedBySetId = countOwnedBySetId(collectionItems);
  const activitySetIds = getRecentSetIdsFromActivity(
    collectionItems,
    wishlistItems,
  );
  const continueSetIds = mergeRecentSetIds(visitedSetIds, activitySetIds);
  const continueSets = await loadContinueSets(continueSetIds, ownedBySetId);

  const matchResult = await loadTradeMatches(supabase, userId, userListings);

  if (matchResult.error) {
    errors.push(`Could not load matches: ${matchResult.error}`);
  }

  const displayName = getUserDisplayLabel(
    profile ?? { display_name: null, email: "" },
  );

  return {
    displayName,
    collection: {
      ...collectionStats,
      wishlistItems: wishlistCountResult.count ?? 0,
      activeListings: userListings.length,
    },
    trading: {
      activeMatches: matchResult.matches.length,
      interestedListings: interestsCountResult.count ?? 0,
      unreadMessages,
    },
    events: {
      upcoming: ((upcomingEventsResult.data ?? []) as EventRow[]).map(
        toEventSummary,
      ),
      attending: getAttendingEvents(userListings),
    },
    continueSets,
    topWishlist: wishlistItems.map((item) => ({
      id: item.id,
      cardName: item.card_name,
      setName: item.set_name,
      priority: item.priority,
      tcgApiCardId: item.tcg_api_card_id,
    })),
    errors,
  };
}
