import { CARD_LANGUAGES, type CardLanguage } from "@/lib/languages";

export const LISTING_TYPES = ["want", "trade", "sale"] as const;

export type ListingType = (typeof LISTING_TYPES)[number];

export const LISTING_CONDITIONS = [
  "Mint",
  "Near Mint",
  "Lightly Played",
  "Moderately Played",
  "Heavily Played",
  "Damaged",
] as const;

export type ListingCondition = (typeof LISTING_CONDITIONS)[number];

export const LISTING_SORT_OPTIONS = {
  newest: { label: "Newest", column: "created_at", ascending: false },
  oldest: { label: "Oldest", column: "created_at", ascending: true },
  name: { label: "Card name A-Z", column: "card_name", ascending: true },
  "name-desc": { label: "Card name Z-A", column: "card_name", ascending: false },
} as const;

export type ListingSort = keyof typeof LISTING_SORT_OPTIONS;

export const LISTING_SORT_KEYS = Object.keys(
  LISTING_SORT_OPTIONS,
) as ListingSort[];

export type ListingFilters = {
  q: string;
  type: ListingType | null;
  language: CardLanguage | null;
  condition: ListingCondition | null;
  official: boolean;
  sort: ListingSort;
};

type SearchParamValue = string | string[] | undefined;

function getSearchParam(params: Record<string, SearchParamValue>, key: string) {
  const value = params[key];
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0];
  }
  return undefined;
}

function isListingType(value: string): value is ListingType {
  return (LISTING_TYPES as readonly string[]).includes(value);
}

function isListingCondition(value: string): value is ListingCondition {
  return (LISTING_CONDITIONS as readonly string[]).includes(value);
}

function isListingSort(value: string): value is ListingSort {
  return value in LISTING_SORT_OPTIONS;
}

export function escapeIlikePattern(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function parseListingFilters(
  params: Record<string, SearchParamValue>,
): ListingFilters {
  const q = getSearchParam(params, "q")?.trim() ?? "";
  const typeValue = getSearchParam(params, "type")?.trim();
  const languageValue = getSearchParam(params, "language")?.trim();
  const conditionValue = getSearchParam(params, "condition")?.trim();
  const sortValue = getSearchParam(params, "sort")?.trim();
  const officialValue = getSearchParam(params, "official")?.trim();

  return {
    q,
    type: typeValue && isListingType(typeValue) ? typeValue : null,
    language:
      languageValue && CARD_LANGUAGES.includes(languageValue as CardLanguage)
        ? (languageValue as CardLanguage)
        : null,
    condition:
      conditionValue && isListingCondition(conditionValue)
        ? conditionValue
        : null,
    official: officialValue === "1",
    sort: sortValue && isListingSort(sortValue) ? sortValue : "newest",
  };
}

export function hasActiveListingFilters(filters: ListingFilters) {
  return Boolean(
    filters.q ||
      filters.type ||
      filters.language ||
      filters.condition ||
      filters.official ||
      filters.sort !== "newest",
  );
}

export function buildListingFilterSearchParams(
  filters: ListingFilters,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (filters.q) {
    searchParams.set("q", filters.q);
  }
  if (filters.type) {
    searchParams.set("type", filters.type);
  }
  if (filters.language) {
    searchParams.set("language", filters.language);
  }
  if (filters.condition) {
    searchParams.set("condition", filters.condition);
  }
  if (filters.official) {
    searchParams.set("official", "1");
  }
  if (filters.sort !== "newest") {
    searchParams.set("sort", filters.sort);
  }

  return searchParams;
}
