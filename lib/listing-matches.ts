export type ListingType = "want" | "trade" | "sale";

export type MatchListing = {
  id: string;
  event_id: string;
  user_id: string;
  type: ListingType;
  card_name: string;
  card_ref: string;
  card_number: string | null;
  language: string | null;
  tcg_api_card_id: string | null;
  set_name: string | null;
};

export type MatchUser = {
  display_name: string | null;
  email: string;
};

export type MatchedCard = {
  cardKey: string;
  cardName: string;
  cardNumber: string | null;
  language: string | null;
  tcgApiCardId: string | null;
  listingType: ListingType;
  setName: string | null;
};

export type MatchCategory =
  | "perfect-trade"
  | "strong-want"
  | "direct"
  | "reverse";

export const MATCH_CATEGORY_LABELS: Record<MatchCategory, string> = {
  "perfect-trade": "🤝 Perfect Trade Match",
  "strong-want": "🔥 Strong Match",
  direct: "Direct Match",
  reverse: "Reverse Match",
};

export const MATCH_CATEGORY_PRIORITY: Record<MatchCategory, number> = {
  "perfect-trade": 1,
  "strong-want": 2,
  direct: 3,
  reverse: 4,
};

export type UserTradeMatch = {
  id: string;
  category: MatchCategory;
  eventId: string;
  eventName: string;
  otherUserId: string;
  otherUser: MatchUser | null;
  theyHaveForMe: MatchedCard[];
  iHaveForThem: MatchedCard[];
  theyHaveCount: number;
  iHaveCount: number;
};

export function getListingCardKey(listing: MatchListing) {
  if (listing.tcg_api_card_id) {
    return `tcg:${listing.tcg_api_card_id}`;
  }

  return `ref:${listing.card_ref}`;
}

export function listingsMatch(a: MatchListing, b: MatchListing) {
  if (a.event_id !== b.event_id || a.user_id === b.user_id) {
    return false;
  }

  if (a.tcg_api_card_id && b.tcg_api_card_id) {
    return a.tcg_api_card_id === b.tcg_api_card_id;
  }

  return a.card_ref === b.card_ref;
}

function isWantListing(type: ListingType) {
  return type === "want";
}

function isOfferListing(type: ListingType) {
  return type === "sale" || type === "trade";
}

function toMatchedCard(listing: MatchListing): MatchedCard {
  return {
    cardKey: getListingCardKey(listing),
    cardName: listing.card_name,
    cardNumber: listing.card_number,
    language: listing.language,
    tcgApiCardId: listing.tcg_api_card_id,
    listingType: listing.type,
    setName: listing.set_name,
  };
}

function addMatchedCard(
  cards: Map<string, MatchedCard>,
  listing: MatchListing,
) {
  const card = toMatchedCard(listing);
  cards.set(card.cardKey, card);
}

function classifyMatch(
  theyHaveCount: number,
  iHaveCount: number,
): MatchCategory | null {
  if (theyHaveCount >= 1 && iHaveCount >= 1) {
    return "perfect-trade";
  }

  if (theyHaveCount >= 2) {
    return "strong-want";
  }

  if (theyHaveCount === 1) {
    return "direct";
  }

  if (iHaveCount >= 1 && theyHaveCount === 0) {
    return "reverse";
  }

  return null;
}

function getGroupKey(eventId: string, otherUserId: string) {
  return `${eventId}:${otherUserId}`;
}

export function findUserTradeMatches(
  userListings: MatchListing[],
  otherListings: (MatchListing & { user: MatchUser | null })[],
  eventNames: Map<string, string>,
): UserTradeMatch[] {
  const otherListingsByGroup = new Map<
    string,
    (MatchListing & { user: MatchUser | null })[]
  >();

  for (const listing of otherListings) {
    const groupKey = getGroupKey(listing.event_id, listing.user_id);
    const group = otherListingsByGroup.get(groupKey) ?? [];
    group.push(listing);
    otherListingsByGroup.set(groupKey, group);
  }

  const matches: UserTradeMatch[] = [];

  for (const [groupKey, groupListings] of otherListingsByGroup) {
    const [eventId, otherUserId] = groupKey.split(":");
    const userListingsAtEvent = userListings.filter(
      (listing) => listing.event_id === eventId,
    );

    if (userListingsAtEvent.length === 0) {
      continue;
    }

    const theyHaveForMe = new Map<string, MatchedCard>();
    const iHaveForThem = new Map<string, MatchedCard>();

    for (const userListing of userListingsAtEvent) {
      for (const otherListing of groupListings) {
        if (!listingsMatch(userListing, otherListing)) {
          continue;
        }

        if (isWantListing(userListing.type) && isOfferListing(otherListing.type)) {
          addMatchedCard(theyHaveForMe, userListing);
        }

        if (isOfferListing(userListing.type) && isWantListing(otherListing.type)) {
          addMatchedCard(iHaveForThem, userListing);
        }
      }
    }

    const theyHaveCards = [...theyHaveForMe.values()].sort((a, b) =>
      a.cardName.localeCompare(b.cardName),
    );
    const iHaveCards = [...iHaveForThem.values()].sort((a, b) =>
      a.cardName.localeCompare(b.cardName),
    );
    const theyHaveCount = theyHaveCards.length;
    const iHaveCount = iHaveCards.length;
    const category = classifyMatch(theyHaveCount, iHaveCount);

    if (!category) {
      continue;
    }

    matches.push({
      id: groupKey,
      category,
      eventId,
      eventName: eventNames.get(eventId) ?? "Unknown event",
      otherUserId,
      otherUser: groupListings[0]?.user ?? null,
      theyHaveForMe: theyHaveCards,
      iHaveForThem: iHaveCards,
      theyHaveCount,
      iHaveCount,
    });
  }

  matches.sort((a, b) => {
    const priorityCompare =
      MATCH_CATEGORY_PRIORITY[a.category] -
      MATCH_CATEGORY_PRIORITY[b.category];

    if (priorityCompare !== 0) {
      return priorityCompare;
    }

    if (b.theyHaveCount !== a.theyHaveCount) {
      return b.theyHaveCount - a.theyHaveCount;
    }

    if (b.iHaveCount !== a.iHaveCount) {
      return b.iHaveCount - a.iHaveCount;
    }

    const eventCompare = a.eventName.localeCompare(b.eventName);
    if (eventCompare !== 0) {
      return eventCompare;
    }

    const otherUserA =
      a.otherUser?.display_name?.trim() || a.otherUser?.email || "";
    const otherUserB =
      b.otherUser?.display_name?.trim() || b.otherUser?.email || "";

    return otherUserA.localeCompare(otherUserB);
  });

  return matches;
}

export function formatTheyHaveSummary(count: number) {
  if (count === 1) {
    return "They have 1 card you want.";
  }

  return `They have ${count} cards you want.`;
}

export function formatIHaveSummary(count: number) {
  if (count === 1) {
    return "You have 1 card they want.";
  }

  return `You have ${count} cards they want.`;
}

export function getMatchCategoryDescription(match: UserTradeMatch) {
  switch (match.category) {
    case "perfect-trade":
      return `${match.theyHaveCount} card${match.theyHaveCount === 1 ? "" : "s"} they have for you · ${match.iHaveCount} card${match.iHaveCount === 1 ? "" : "s"} you have for them`;
    case "strong-want":
      return `They have ${match.theyHaveCount} cards you're looking for.`;
    case "direct":
      return "They have exactly one card you want.";
    case "reverse":
      return "They are looking for your cards.";
  }
}
