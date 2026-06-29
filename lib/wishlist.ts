import { isCardLanguage } from "@/lib/languages";

export const WISHLIST_PRIORITY_MIN = 1;
export const WISHLIST_PRIORITY_MAX = 5;
export const WISHLIST_PRIORITY_DEFAULT = 3;

export const WISHLIST_PRIORITY_LABELS: Record<number, string> = {
  1: "1 — Highest",
  2: "2 — High",
  3: "3 — Medium",
  4: "4 — Low",
  5: "5 — Lowest",
};

export const WISHLIST_PRIORITY_OPTIONS = [1, 2, 3, 4, 5] as const;

export const WISHLIST_DUPLICATE_ERROR =
  "This card is already in your wishlist.";

export type WishlistFieldData = {
  card_name: string;
  card_ref: string;
  set_name: string | null;
  notes: string | null;
  language: string | null;
  priority: number;
  tcg_api_card_id: string | null;
  card_number: string | null;
  set_id: string | null;
};

export function isWishlistUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}

export function parseWishlistItemIds(formData: FormData) {
  return [
    ...new Set(
      formData
        .getAll("wishlist_item_ids")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

export function parseWishlistItemId(formData: FormData) {
  const value = formData.get("wishlist_item_id");

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  return value.trim();
}

function getOptionalText(formData: FormData, name: string) {
  const value = formData.get(name);
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isValidTcgApiCardId(value: string) {
  return /^[a-zA-Z0-9-]+$/.test(value) && value.length <= 64;
}

function parseOptionalApiFields(formData: FormData):
  | { error: string }
  | {
      tcg_api_card_id: string | null;
      card_number: string | null;
      set_id: string | null;
    } {
  const tcgApiCardId = getOptionalText(formData, "tcg_api_card_id");
  const cardNumber = getOptionalText(formData, "card_number");
  const setId = getOptionalText(formData, "set_id");
  const hasAnyApiField = Boolean(tcgApiCardId || cardNumber || setId);

  if (!hasAnyApiField) {
    return {
      tcg_api_card_id: null,
      card_number: null,
      set_id: null,
    };
  }

  if (!tcgApiCardId || !isValidTcgApiCardId(tcgApiCardId)) {
    return { error: "Please select a valid official card." };
  }

  return {
    tcg_api_card_id: tcgApiCardId,
    card_number: cardNumber,
    set_id: setId,
  };
}

function parsePriority(formData: FormData): { error: string } | { priority: number } {
  const raw = formData.get("priority");
  const priority =
    typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN;

  if (
    !Number.isInteger(priority) ||
    priority < WISHLIST_PRIORITY_MIN ||
    priority > WISHLIST_PRIORITY_MAX
  ) {
    return { error: "Please select a valid priority (1–5)." };
  }

  return { priority };
}

export function parseWishlistFields(formData: FormData):
  | { error: string }
  | {
      data: {
        card_name: string;
        card_ref: string;
        set_name: string | null;
        notes: string | null;
        language: string | null;
        priority: number;
        tcg_api_card_id: string | null;
        card_number: string | null;
        set_id: string | null;
      };
    } {
  const cardName = formData.get("card_name");
  const priorityResult = parsePriority(formData);

  if ("error" in priorityResult) {
    return priorityResult;
  }

  if (typeof cardName !== "string" || !cardName.trim()) {
    return { error: "Card name is required." };
  }

  const normalizedCardName = cardName.trim();
  const languageValue = getOptionalText(formData, "language");

  if (languageValue && !isCardLanguage(languageValue)) {
    return { error: "Please select a valid language." };
  }

  const apiFields = parseOptionalApiFields(formData);

  if ("error" in apiFields) {
    return apiFields;
  }

  return {
    data: {
      card_name: normalizedCardName,
      card_ref: normalizedCardName.toLowerCase(),
      set_name: getOptionalText(formData, "set_name"),
      notes: getOptionalText(formData, "notes"),
      language: languageValue,
      priority: priorityResult.priority,
      ...apiFields,
    },
  };
}
