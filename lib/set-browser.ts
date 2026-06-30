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
