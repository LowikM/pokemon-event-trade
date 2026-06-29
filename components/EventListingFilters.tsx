import Link from "next/link";

import {
  hasActiveListingFilters,
  LISTING_CONDITIONS,
  LISTING_SORT_KEYS,
  LISTING_SORT_OPTIONS,
  LISTING_TYPES,
  type ListingFilters,
} from "@/lib/listing-filters";
import { CARD_LANGUAGES } from "@/lib/languages";

type EventListingFiltersProps = {
  eventId: string;
  filters: ListingFilters;
};

const inputClassName =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

const TYPE_LABELS = {
  want: "Want",
  trade: "Trade",
  sale: "Sale",
} as const;

export function EventListingFilters({
  eventId,
  filters,
}: EventListingFiltersProps) {
  const showClearLink = hasActiveListingFilters(filters);

  return (
    <form
      method="get"
      action={`/events/${eventId}`}
      className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="space-y-2">
        <label htmlFor="listing-search" className="text-sm font-medium">
          Search listings
        </label>
        <input
          id="listing-search"
          name="q"
          type="search"
          defaultValue={filters.q}
          placeholder="Search by card name, set, number, or language..."
          className={inputClassName}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <label htmlFor="listing-type" className="text-sm font-medium">
            Listing type
          </label>
          <select
            id="listing-type"
            name="type"
            defaultValue={filters.type ?? ""}
            className={inputClassName}
          >
            <option value="">All</option>
            {LISTING_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="listing-language" className="text-sm font-medium">
            Language
          </label>
          <select
            id="listing-language"
            name="language"
            defaultValue={filters.language ?? ""}
            className={inputClassName}
          >
            <option value="">All</option>
            {CARD_LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="listing-condition" className="text-sm font-medium">
            Condition
          </label>
          <select
            id="listing-condition"
            name="condition"
            defaultValue={filters.condition ?? ""}
            className={inputClassName}
          >
            <option value="">Any</option>
            {LISTING_CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="listing-sort" className="text-sm font-medium">
            Sort by
          </label>
          <select
            id="listing-sort"
            name="sort"
            defaultValue={filters.sort}
            className={inputClassName}
          >
            {LISTING_SORT_KEYS.map((value) => (
              <option key={value} value={value}>
                {LISTING_SORT_OPTIONS[value].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="official"
            value="1"
            defaultChecked={filters.official}
            className="size-4 rounded border-zinc-300 dark:border-zinc-700"
          />
          Official cards only
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Apply filters
        </button>
        {showClearLink ? (
          <Link
            href={`/events/${eventId}`}
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            Clear filters
          </Link>
        ) : null}
      </div>
    </form>
  );
}
