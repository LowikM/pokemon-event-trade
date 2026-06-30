import Link from "next/link";
import { redirect } from "next/navigation";

import {
  formatSetReleaseDate,
  PokemonTcgApiError,
  searchSets,
  type PokemonTcgSetSummary,
} from "@/lib/pokemon-tcg";
import { createClient } from "@/lib/supabase/server";

const inputClassName =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

const MIN_QUERY_LENGTH = 2;

export default async function SetsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const { q: rawQuery, error: pageError } = await searchParams;
  const query = rawQuery?.trim() ?? "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let results: PokemonTcgSetSummary[] = [];
  let searchError: string | null = pageError ?? null;

  if (query.length >= MIN_QUERY_LENGTH) {
    try {
      results = await searchSets(query);
    } catch (error) {
      if (error instanceof PokemonTcgApiError) {
        searchError = "Set search is temporarily unavailable.";
      } else {
        throw error;
      }
    }
  }

  return (
    <div className="flex flex-1 justify-center px-4 py-12">
      <div className="w-full max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Set Browser</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Search Pokémon TCG sets by name, set ID, or series, then add
            individual cards to your collection or wishlist.
          </p>
        </div>

        <form className="space-y-3">
          <label htmlFor="set-search" className="text-sm font-medium">
            Search sets
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="set-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder='e.g. Brilliant Stars or swsh9'
              minLength={MIN_QUERY_LENGTH}
              className={inputClassName}
            />
            <button
              type="submit"
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Search
            </button>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Enter at least {MIN_QUERY_LENGTH} characters.
          </p>
        </form>

        {searchError ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            role="alert"
          >
            {searchError}
          </p>
        ) : null}

        {query.length > 0 && query.length < MIN_QUERY_LENGTH ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Type at least {MIN_QUERY_LENGTH} characters to search.
          </p>
        ) : null}

        {query.length >= MIN_QUERY_LENGTH && !searchError ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight">
              Results for &ldquo;{query}&rdquo;
            </h2>

            {results.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                No sets found.
              </p>
            ) : (
              <ul className="grid gap-4">
                {results.map((set) => (
                  <li key={set.id}>
                    <Link
                      href={`/sets/${set.id}`}
                      className="block rounded-xl border border-zinc-200 p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex shrink-0 items-center gap-2">
                          {set.images.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={set.images.logo}
                              alt=""
                              className="h-10 w-auto max-w-[96px] object-contain"
                            />
                          ) : null}
                          {set.images.symbol ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={set.images.symbol}
                              alt=""
                              className="h-8 w-8 object-contain"
                            />
                          ) : null}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="font-medium">{set.name}</p>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {set.series || "Unknown series"} ·{" "}
                            {formatSetReleaseDate(set.releaseDate)} ·{" "}
                            {set.total} cards
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-500">
                            Set ID: {set.id}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
