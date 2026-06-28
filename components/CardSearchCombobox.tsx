"use client";

import { useEffect, useState } from "react";

import type { PokemonTcgCardSearchResult } from "@/lib/pokemon-tcg";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;
const SEARCH_PAGE_SIZE = 50;

export type { PokemonTcgCardSearchResult as CardSearchResult };

type CardSearchComboboxProps = {
  selectedCard: PokemonTcgCardSearchResult | null;
  onSelect: (card: PokemonTcgCardSearchResult) => void;
  onClear?: () => void;
  inputClassName?: string;
  inputId?: string;
};

export function CardSearchCombobox({
  selectedCard,
  onSelect,
  onClear,
  inputClassName,
  inputId = "card-search",
}: CardSearchComboboxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PokemonTcgCardSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const trimmedQuery = query.trim();
  const showMinLengthHint =
    trimmedQuery.length > 0 && trimmedQuery.length < MIN_QUERY_LENGTH;

  useEffect(() => {
    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsLoading(false);
      setSearchError(null);
      setHasSearched(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setSearchError(null);

    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/card-search?q=${encodeURIComponent(trimmedQuery)}&pageSize=${SEARCH_PAGE_SIZE}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          setResults([]);
          setHasSearched(true);
          setSearchError("Search is temporarily unavailable.");
          return;
        }

        const data = (await response.json()) as {
          results?: PokemonTcgCardSearchResult[];
        };

        setResults(data.results ?? []);
        setHasSearched(true);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setResults([]);
        setHasSearched(true);
        setSearchError("Search is temporarily unavailable.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [trimmedQuery]);

  return (
    <div className="space-y-3">
      <input
        id={inputId}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search official Pokémon cards..."
        className={inputClassName}
        aria-label="Search official Pokémon cards"
        autoComplete="off"
      />

      {showMinLengthHint ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Type at least {MIN_QUERY_LENGTH} characters to search.
        </p>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          You can search by card name or number, e.g. Charizard or 1/83.
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Searching…</p>
      ) : null}

      {searchError ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          role="alert"
        >
          {searchError}
        </p>
      ) : null}

      {hasSearched &&
      !isLoading &&
      !searchError &&
      trimmedQuery.length >= MIN_QUERY_LENGTH &&
      results.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          No results found.
        </p>
      ) : null}

      {results.length > 0 ? (
        <>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Showing top results. Refine your search with set name or card
            number.
          </p>
          <ul className="max-h-96 space-y-2 overflow-y-auto">
          {results.map((card) => {
            const isSelected = selectedCard?.id === card.id;

            return (
              <li key={card.id}>
                <button
                  type="button"
                  onClick={() => onSelect(card)}
                  className={`flex w-full gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                    isSelected
                      ? "border-foreground bg-zinc-50 dark:bg-zinc-900"
                      : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                  }`}
                >
                  {card.images.small ? (
                    <img
                      src={card.images.small}
                      alt=""
                      className="h-14 w-10 shrink-0 rounded object-contain"
                    />
                  ) : (
                    <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-zinc-100 text-xs text-zinc-500 dark:bg-zinc-800">
                      ?
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{card.name}</p>
                    <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                      {card.set.name || "Unknown set"}
                      {card.number ? ` · #${card.number}` : ""}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
          </ul>
        </>
      ) : null}

      {selectedCard ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="font-medium">Selected:</span>
          <span>
            {selectedCard.name}
            {selectedCard.set.name ? ` — ${selectedCard.set.name}` : ""}
            {selectedCard.number ? ` #${selectedCard.number}` : ""}
          </span>
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-zinc-600 hover:underline dark:text-zinc-400"
            >
              Clear
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
