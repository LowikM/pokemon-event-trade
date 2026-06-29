"use client";

import { useMemo, useState } from "react";

import { CARD_LANGUAGES } from "@/lib/languages";
import {
  WISHLIST_PRIORITY_LABELS,
  WISHLIST_PRIORITY_OPTIONS,
} from "@/lib/wishlist";

type WishlistItemOption = {
  id: string;
  card_name: string;
  set_name: string | null;
  language: string | null;
  notes: string | null;
  tcg_api_card_id: string | null;
  card_number: string | null;
  set_id: string | null;
  priority: number;
};

type ActivateWishlistFormProps = {
  items: WishlistItemOption[];
  alreadyListedIds: string[];
  action: (formData: FormData) => void | Promise<void>;
};

const badgeClassName =
  "rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";

const filterSelectClassName =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

const toolbarButtonClassName =
  "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900";

function buildInitialSelection(
  items: WishlistItemOption[],
  alreadyListedSet: Set<string>,
) {
  return new Set(
    items
      .filter((item) => !alreadyListedSet.has(item.id))
      .map((item) => item.id),
  );
}

export function ActivateWishlistForm({
  items,
  alreadyListedIds,
  action,
}: ActivateWishlistFormProps) {
  const alreadyListedSet = useMemo(
    () => new Set(alreadyListedIds),
    [alreadyListedIds],
  );
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(() =>
    buildInitialSelection(items, alreadyListedSet),
  );

  const languageOptions = CARD_LANGUAGES;

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (
        priorityFilter !== "all" &&
        item.priority !== Number.parseInt(priorityFilter, 10)
      ) {
        return false;
      }

      if (languageFilter === "all") {
        return true;
      }

      if (languageFilter === "none") {
        return !item.language;
      }

      return item.language === languageFilter;
    });
  }, [items, languageFilter, priorityFilter]);

  const selectableFilteredIds = filteredItems
    .filter((item) => !alreadyListedSet.has(item.id))
    .map((item) => item.id);

  const selectedCount = [...selectedIds].filter((id) =>
    selectableFilteredIds.includes(id),
  ).length;

  function toggleItem(itemId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }

      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedIds((current) => {
      const next = new Set(current);

      for (const itemId of selectableFilteredIds) {
        next.add(itemId);
      }

      return next;
    });
  }

  function selectNoneFiltered() {
    setSelectedIds((current) => {
      const next = new Set(current);

      for (const itemId of selectableFilteredIds) {
        next.delete(itemId);
      }

      return next;
    });
  }

  return (
    <form action={action} className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="space-y-2">
          <label
            htmlFor="activate-priority-filter"
            className="text-sm font-medium"
          >
            Priority
          </label>
          <select
            id="activate-priority-filter"
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            className={filterSelectClassName}
          >
            <option value="all">All priorities</option>
            {WISHLIST_PRIORITY_OPTIONS.map((priority) => (
              <option key={priority} value={priority}>
                {WISHLIST_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="activate-language-filter"
            className="text-sm font-medium"
          >
            Language
          </label>
          <select
            id="activate-language-filter"
            value={languageFilter}
            onChange={(event) => setLanguageFilter(event.target.value)}
            className={filterSelectClassName}
          >
            <option value="all">All languages</option>
            <option value="none">No language set</option>
            {languageOptions.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectAllFiltered}
            className={toolbarButtonClassName}
          >
            Select all
          </button>
          <button
            type="button"
            onClick={selectNoneFiltered}
            className={toolbarButtonClassName}
          >
            Select none
          </button>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {selectedCount} selected
        </p>
      </div>

      <ul className="space-y-3">
        {filteredItems.length === 0 ? (
          <li className="rounded-xl border border-dashed border-zinc-300 px-6 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            No wishlist items match the current filters.
          </li>
        ) : (
          filteredItems.map((item) => {
            const isAlreadyListed = alreadyListedSet.has(item.id);
            const isSelected = selectedIds.has(item.id);

            return (
              <li
                key={item.id}
                className={`rounded-xl border p-4 ${
                  isAlreadyListed
                    ? "border-zinc-200 bg-zinc-50 opacity-80 dark:border-zinc-800 dark:bg-zinc-900"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    name="wishlist_item_ids"
                    value={item.id}
                    checked={isSelected}
                    disabled={isAlreadyListed}
                    onChange={(event) =>
                      toggleItem(item.id, event.target.checked)
                    }
                    className="mt-1"
                  />
                  <span className="min-w-0 flex-1 space-y-2">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {item.card_name}
                      </span>
                      {isAlreadyListed ? (
                        <span className={badgeClassName}>Already listed</span>
                      ) : null}
                    </span>
                    <span className="flex flex-wrap gap-2">
                      <span className={badgeClassName}>
                        {WISHLIST_PRIORITY_LABELS[item.priority] ??
                          `Priority ${item.priority}`}
                      </span>
                      {item.language ? (
                        <span className={badgeClassName}>{item.language}</span>
                      ) : null}
                      {item.tcg_api_card_id ? (
                        <span className={badgeClassName}>Official card</span>
                      ) : null}
                      {item.card_number ? (
                        <span className={badgeClassName}>
                          #{item.card_number}
                        </span>
                      ) : null}
                    </span>
                    {item.set_name ? (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Set: {item.set_name}
                      </p>
                    ) : null}
                    {item.notes ? (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {item.notes}
                      </p>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })
        )}
      </ul>

      <button
        type="submit"
        disabled={selectedCount === 0}
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Activate selected for event
      </button>
    </form>
  );
}
