"use client";

import { useMemo, useState } from "react";

import {
  bulkAddCardsToCollection,
  bulkAddCardsToWishlist,
} from "@/app/sets/actions";
import { LanguageSelect } from "@/components/LanguageSelect";
import { SetBrowserCard } from "@/components/SetBrowserCard";
import { LISTING_CONDITIONS } from "@/lib/listing-filters";
import type { PokemonTcgSetCard } from "@/lib/pokemon-tcg";
import { selectCardsInNumericRange } from "@/lib/set-browser";
import {
  WISHLIST_PRIORITY_DEFAULT,
  WISHLIST_PRIORITY_LABELS,
  WISHLIST_PRIORITY_OPTIONS,
} from "@/lib/wishlist";

type SetBrowserGridProps = {
  cards: PokemonTcgSetCard[];
  setId: string;
  ownedIds: string[];
  wantedIds: string[];
};

const inputClassName =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

const toolbarButtonClassName =
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900";

const primaryButtonClassName =
  "rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

export function SetBrowserGrid({
  cards,
  setId,
  ownedIds,
  wantedIds,
}: SetBrowserGridProps) {
  const ownedSet = useMemo(() => new Set(ownedIds), [ownedIds]);
  const wantedSet = useMemo(() => new Set(wantedIds), [wantedIds]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [collectionLanguage, setCollectionLanguage] = useState("");
  const [collectionCondition, setCollectionCondition] = useState("");
  const [collectionQuantity, setCollectionQuantity] = useState("1");
  const [wishlistLanguage, setWishlistLanguage] = useState("");
  const [wishlistPriority, setWishlistPriority] = useState(
    String(WISHLIST_PRIORITY_DEFAULT),
  );

  const selectedCount = selectedIds.size;
  const returnPath = `/sets/${setId}`;
  const selectedIdList = [...selectedIds];

  function toggleCard(cardId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(cardId);
      } else {
        next.delete(cardId);
      }

      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(cards.map((card) => card.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function selectRange() {
    const from = Number.parseInt(rangeFrom, 10);
    const to = Number.parseInt(rangeTo, 10);

    if (!Number.isInteger(from) || !Number.isInteger(to)) {
      return;
    }

    const rangeIds = selectCardsInNumericRange(cards, from, to);

    setSelectedIds((current) => {
      const next = new Set(current);

      for (const cardId of rangeIds) {
        next.add(cardId);
      }

      return next;
    });
  }

  return (
    <>
      <section className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectAll}
            className={toolbarButtonClassName}
          >
            Select all
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className={toolbarButtonClassName}
          >
            Clear all
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Range selection</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1">
              <label htmlFor="range-from" className="text-xs text-zinc-600 dark:text-zinc-400">
                From
              </label>
              <input
                id="range-from"
                type="number"
                min={1}
                value={rangeFrom}
                onChange={(event) => setRangeFrom(event.target.value)}
                className={`${inputClassName} sm:w-28`}
                placeholder="1"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="range-to" className="text-xs text-zinc-600 dark:text-zinc-400">
                To
              </label>
              <input
                id="range-to"
                type="number"
                min={1}
                value={rangeTo}
                onChange={(event) => setRangeTo(event.target.value)}
                className={`${inputClassName} sm:w-28`}
                placeholder="32"
              />
            </div>
            <button
              type="button"
              onClick={selectRange}
              className={toolbarButtonClassName}
            >
              Select range
            </button>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Range selection only applies to plain numeric collector numbers (for
            example 1–32). Special numbers such as TG01, GG15, or SVP123 are
            ignored.
          </p>
        </div>
      </section>

      <ul className="grid grid-cols-2 gap-4 pb-28 md:grid-cols-3 lg:grid-cols-4">
        {cards.map((card) => (
          <li key={card.id}>
            <SetBrowserCard
              card={card}
              setId={setId}
              ownedIds={ownedSet}
              wantedIds={wantedSet}
              isSelected={selectedIds.has(card.id)}
              onSelectChange={(checked) => toggleCard(card.id, checked)}
            />
          </li>
        ))}
      </ul>

      {selectedCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 px-4 py-4 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
            <p className="text-sm font-medium">
              {selectedCount} card{selectedCount === 1 ? "" : "s"} selected
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                <p className="text-sm font-medium">Collection defaults</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label
                      htmlFor="bulk-collection-language"
                      className="text-xs text-zinc-600 dark:text-zinc-400"
                    >
                      Language
                    </label>
                    <LanguageSelect
                      id="bulk-collection-language"
                      className={inputClassName}
                      value={collectionLanguage}
                      onChange={(event) =>
                        setCollectionLanguage(event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="bulk-collection-condition"
                      className="text-xs text-zinc-600 dark:text-zinc-400"
                    >
                      Condition
                    </label>
                    <select
                      id="bulk-collection-condition"
                      value={collectionCondition}
                      onChange={(event) =>
                        setCollectionCondition(event.target.value)
                      }
                      className={inputClassName}
                    >
                      <option value="">No condition specified</option>
                      {LISTING_CONDITIONS.map((condition) => (
                        <option key={condition} value={condition}>
                          {condition}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="bulk-collection-quantity"
                      className="text-xs text-zinc-600 dark:text-zinc-400"
                    >
                      Quantity
                    </label>
                    <input
                      id="bulk-collection-quantity"
                      type="number"
                      min={1}
                      value={collectionQuantity}
                      onChange={(event) =>
                        setCollectionQuantity(event.target.value)
                      }
                      className={inputClassName}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                <p className="text-sm font-medium">Wishlist defaults</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label
                      htmlFor="bulk-wishlist-language"
                      className="text-xs text-zinc-600 dark:text-zinc-400"
                    >
                      Language
                    </label>
                    <LanguageSelect
                      id="bulk-wishlist-language"
                      className={inputClassName}
                      value={wishlistLanguage}
                      onChange={(event) =>
                        setWishlistLanguage(event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="bulk-wishlist-priority"
                      className="text-xs text-zinc-600 dark:text-zinc-400"
                    >
                      Priority
                    </label>
                    <select
                      id="bulk-wishlist-priority"
                      value={wishlistPriority}
                      onChange={(event) =>
                        setWishlistPriority(event.target.value)
                      }
                      className={inputClassName}
                    >
                      {WISHLIST_PRIORITY_OPTIONS.map((priority) => (
                        <option key={priority} value={priority}>
                          {WISHLIST_PRIORITY_LABELS[priority]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <form action={bulkAddCardsToCollection} className="flex">
                <input type="hidden" name="return_path" value={returnPath} />
                <input type="hidden" name="set_id" value={setId} />
                <input type="hidden" name="language" value={collectionLanguage} />
                <input
                  type="hidden"
                  name="condition"
                  value={collectionCondition}
                />
                <input
                  type="hidden"
                  name="quantity"
                  value={collectionQuantity}
                />
                {selectedIdList.map((cardId) => (
                  <input
                    key={`collection-${cardId}`}
                    type="hidden"
                    name="tcg_api_card_ids"
                    value={cardId}
                  />
                ))}
                <button type="submit" className={primaryButtonClassName}>
                  Add selected to Collection
                </button>
              </form>

              <form action={bulkAddCardsToWishlist} className="flex">
                <input type="hidden" name="return_path" value={returnPath} />
                <input type="hidden" name="set_id" value={setId} />
                <input type="hidden" name="language" value={wishlistLanguage} />
                <input type="hidden" name="priority" value={wishlistPriority} />
                {selectedIdList.map((cardId) => (
                  <input
                    key={`wishlist-${cardId}`}
                    type="hidden"
                    name="tcg_api_card_ids"
                    value={cardId}
                  />
                ))}
                <button type="submit" className={primaryButtonClassName}>
                  Add selected to Wishlist
                </button>
              </form>

              <button
                type="button"
                onClick={clearSelection}
                className={toolbarButtonClassName}
              >
                Clear selection
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
