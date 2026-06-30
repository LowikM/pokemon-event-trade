import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SetBrowserGrid } from "@/components/SetBrowserGrid";
import { SetCompletionStatsPanel } from "@/components/SetCompletionStatsPanel";
import { recordRecentSetVisit } from "@/lib/dashboard";
import {
  formatSetReleaseDate,
  getCardsForSet,
  getSet,
  PokemonTcgApiError,
} from "@/lib/pokemon-tcg";
import { computeSetCompletionStats } from "@/lib/set-browser";
import { createClient } from "@/lib/supabase/server";

type SetDetailPageProps = {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{
    error?: string;
    added?: string;
    bulk?: string;
    alreadyOwned?: string;
    alreadyWished?: string;
  }>;
};

function parseCountParam(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export default async function SetDetailPage({
  params,
  searchParams,
}: SetDetailPageProps) {
  const { setId } = await params;
  const {
    error: pageError,
    added,
    bulk,
    alreadyOwned,
    alreadyWished,
  } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await recordRecentSetVisit(setId);

  let set;
  let cards;
  let loadError: string | null = pageError ?? null;

  try {
    [set, cards] = await Promise.all([getSet(setId), getCardsForSet(setId)]);
  } catch (error) {
    if (error instanceof PokemonTcgApiError) {
      loadError = "This set is temporarily unavailable.";
    } else {
      throw error;
    }
  }

  if (!set && !loadError) {
    notFound();
  }

  const [{ data: collectionRows, error: collectionError }, { data: wishlistRows, error: wishlistError }] =
    set
      ? await Promise.all([
          supabase
            .from("collection_items")
            .select("tcg_api_card_id")
            .eq("user_id", user.id)
            .eq("set_id", set.id)
            .not("tcg_api_card_id", "is", null),
          supabase
            .from("wishlist_items")
            .select("tcg_api_card_id")
            .eq("user_id", user.id)
            .eq("set_id", set.id)
            .not("tcg_api_card_id", "is", null),
        ])
      : [{ data: null, error: null }, { data: null, error: null }];

  const ownedIds = (collectionRows ?? [])
    .map((row) => row.tcg_api_card_id)
    .filter((id): id is string => Boolean(id));
  const wantedIds = (wishlistRows ?? [])
    .map((row) => row.tcg_api_card_id)
    .filter((id): id is string => Boolean(id));

  const bulkAddedCount = parseCountParam(added);
  const bulkAlreadyOwnedCount = parseCountParam(alreadyOwned);
  const bulkAlreadyWishedCount = parseCountParam(alreadyWished);

  const ownedIdSet = new Set(ownedIds);
  const wantedIdSet = new Set(wantedIds);
  const completionStats =
    cards && cards.length > 0
      ? computeSetCompletionStats(cards, ownedIdSet, wantedIdSet)
      : null;

  return (
    <div className="flex flex-1 justify-center px-4 py-12">
      <div className="w-full max-w-6xl space-y-8">
        <div className="space-y-2">
          <Link
            href="/sets"
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            ← Back to Set Browser
          </Link>

          {set ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                {set.images.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={set.images.logo}
                    alt=""
                    className="h-12 w-auto max-w-[140px] object-contain"
                  />
                ) : null}
                {set.images.symbol ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={set.images.symbol}
                    alt=""
                    className="h-10 w-10 object-contain"
                  />
                ) : null}
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {set.name}
                  </h1>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {set.series || "Unknown series"} ·{" "}
                    {formatSetReleaseDate(set.releaseDate)} · {set.total} cards
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight">Set</h1>
          )}
        </div>

        {bulk === "collection" ? (
          <p
            className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
            role="status"
          >
            Added {bulkAddedCount} card{bulkAddedCount === 1 ? "" : "s"} to your
            Collection.
            {bulkAlreadyOwnedCount > 0
              ? ` ${bulkAlreadyOwnedCount} were already owned.`
              : null}
          </p>
        ) : null}

        {bulk === "wishlist" ? (
          <p
            className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
            role="status"
          >
            Added {bulkAddedCount} card{bulkAddedCount === 1 ? "" : "s"} to your
            Wishlist.
            {bulkAlreadyWishedCount > 0
              ? ` ${bulkAlreadyWishedCount} were already wished.`
              : null}
          </p>
        ) : null}

        {added === "collection" && bulk !== "collection" ? (
          <p
            className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
            role="status"
          >
            Card added to your collection.
          </p>
        ) : null}

        {added === "wishlist" && bulk !== "wishlist" ? (
          <p
            className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
            role="status"
          >
            Card added to your wishlist.
          </p>
        ) : null}

        {loadError ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            role="alert"
          >
            {loadError}
          </p>
        ) : null}

        {collectionError ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            role="alert"
          >
            Could not load collection status: {collectionError.message}
          </p>
        ) : null}

        {wishlistError ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            role="alert"
          >
            Could not load wishlist status: {wishlistError.message}
          </p>
        ) : null}

        {completionStats ? (
          <SetCompletionStatsPanel stats={completionStats} />
        ) : null}

        {set && cards && cards.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            No cards found for this set.
          </p>
        ) : null}

        {set && cards && cards.length > 0 ? (
          <SetBrowserGrid
            cards={cards}
            setId={set.id}
            ownedIds={ownedIds}
            wantedIds={wantedIds}
          />
        ) : null}
      </div>
    </div>
  );
}
