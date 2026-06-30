export type SetCardStatus = "owned" | "wanted" | "owned-wanted" | "missing";

export function getSetCardStatus(
  ownedIds: ReadonlySet<string>,
  wantedIds: ReadonlySet<string>,
  tcgApiCardId: string,
): SetCardStatus {
  const isOwned = ownedIds.has(tcgApiCardId);
  const isWanted = wantedIds.has(tcgApiCardId);

  if (isOwned && isWanted) {
    return "owned-wanted";
  }

  if (isOwned) {
    return "owned";
  }

  if (isWanted) {
    return "wanted";
  }

  return "missing";
}

export const SET_CARD_STATUS_LABELS: Record<SetCardStatus, string> = {
  owned: "Owned",
  wanted: "Wanted",
  "owned-wanted": "Owned + Wanted",
  missing: "Missing",
};

export type SetCardFilter = "all" | "owned" | "wanted" | "missing";

export const SET_CARD_FILTERS: { value: SetCardFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "owned", label: "Owned" },
  { value: "wanted", label: "Wanted" },
  { value: "missing", label: "Missing" },
];

export type SetCompletionStats = {
  total: number;
  owned: number;
  wanted: number;
  missing: number;
  completionPercent: number;
};

export function computeSetCompletionStats(
  cards: readonly { id: string }[],
  ownedIds: ReadonlySet<string>,
  wantedIds: ReadonlySet<string>,
): SetCompletionStats {
  const total = cards.length;
  let owned = 0;
  let wanted = 0;
  let missing = 0;

  for (const card of cards) {
    const isOwned = ownedIds.has(card.id);
    const isWanted = wantedIds.has(card.id);

    if (isOwned) {
      owned += 1;
    } else {
      missing += 1;
    }

    if (isWanted) {
      wanted += 1;
    }
  }

  const completionPercent =
    total > 0 ? Math.round((owned / total) * 100) : 0;

  return {
    total,
    owned,
    wanted,
    missing,
    completionPercent,
  };
}

export function matchesSetCardFilter(
  filter: SetCardFilter,
  tcgApiCardId: string,
  ownedIds: ReadonlySet<string>,
  wantedIds: ReadonlySet<string>,
) {
  const status = getSetCardStatus(ownedIds, wantedIds, tcgApiCardId);

  switch (filter) {
    case "all":
      return true;
    case "owned":
      return status === "owned" || status === "owned-wanted";
    case "wanted":
      return status === "wanted" || status === "owned-wanted";
    case "missing":
      return status === "missing";
  }
}

export function getMissingWishlistCandidateIds<
  T extends { id: string },
>(cards: readonly T[], ownedIds: ReadonlySet<string>, wantedIds: ReadonlySet<string>) {
  return cards
    .filter((card) => !ownedIds.has(card.id) && !wantedIds.has(card.id))
    .map((card) => card.id);
}

export function isNumericCollectorNumber(number: string) {
  return /^\d+$/.test(number.trim());
}

export function getNumericCollectorNumber(number: string) {
  if (!isNumericCollectorNumber(number)) {
    return null;
  }

  return Number.parseInt(number.trim(), 10);
}

export function selectCardsInNumericRange<
  T extends { id: string; number: string },
>(cards: readonly T[], from: number, to: number) {
  const min = Math.min(from, to);
  const max = Math.max(from, to);

  return cards
    .filter((card) => {
      const collectorNumber = getNumericCollectorNumber(card.number);
      return collectorNumber !== null && collectorNumber >= min && collectorNumber <= max;
    })
    .map((card) => card.id);
}

export function parseBulkTcgApiCardIds(formData: FormData) {
  return [
    ...new Set(
      formData
        .getAll("tcg_api_card_ids")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}
