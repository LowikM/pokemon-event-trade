"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { LanguageSelect } from "@/components/LanguageSelect";

type CollectionItem = {
  id: string;
  item_kind: "card" | "sealed";
  card_name: string;
  set_name: string | null;
  condition: string | null;
  notes: string | null;
  language: string | null;
  tcg_api_card_id: string | null;
  card_number: string | null;
};

type NewListingFormProps = {
  eventId: string;
  createListing: (formData: FormData) => void | Promise<void>;
  collectionItems: CollectionItem[];
};

const inputClassName =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

const ITEM_KIND_LABELS: Record<CollectionItem["item_kind"], string> = {
  card: "Card",
  sealed: "Sealed",
};

export function NewListingForm({
  eventId,
  createListing,
  collectionItems,
}: NewListingFormProps) {
  const [search, setSearch] = useState("");
  const [selectedCollectionItemId, setSelectedCollectionItemId] = useState("");
  const [cardName, setCardName] = useState("");
  const [setName, setSetName] = useState("");
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [language, setLanguage] = useState("");

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return collectionItems;

    return collectionItems.filter((item) => {
      const haystack = [
        item.card_name,
        item.set_name ?? "",
        item.condition ?? "",
        item.notes ?? "",
        item.language ?? "",
        ITEM_KIND_LABELS[item.item_kind],
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [collectionItems, search]);

  function selectCollectionItem(item: CollectionItem) {
    setSelectedCollectionItemId(item.id);
    setCardName(item.card_name);
    setSetName(item.set_name ?? "");
    setCondition(item.condition ?? "");
    setNotes(item.notes ?? "");
    setLanguage(item.language ?? "");
  }

  function clearSelection() {
    setSelectedCollectionItemId("");
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-700 dark:text-zinc-300">
          Looking for a card? Add it to My Wishlist and activate your wishlist
          for this event.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            href="/my-wishlist"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-950"
          >
            My Wishlist
          </Link>
          <Link
            href={`/events/${eventId}/activate-wishlist`}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-950"
          >
            Activate Wishlist
          </Link>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Select from My Collection
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Choose something you own to prefill a sale or trade listing. You can
            still edit fields before submitting.
          </p>
        </div>

        {collectionItems.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Your collection is empty. Add items on My Collection or fill in the
            form manually below.
          </p>
        ) : (
          <>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search your collection..."
              className={inputClassName}
              aria-label="Search collection items"
            />

            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {filteredItems.length === 0 ? (
                <li className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                  No collection items match your search.
                </li>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedCollectionItemId === item.id;

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => selectCollectionItem(item)}
                        className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                          isSelected
                            ? "border-foreground bg-zinc-50 dark:bg-zinc-900"
                            : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {ITEM_KIND_LABELS[item.item_kind]}
                          </span>
                          {item.tcg_api_card_id ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                              Official card
                            </span>
                          ) : null}
                          {item.card_number ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                              #{item.card_number}
                            </span>
                          ) : null}
                          <span className="text-sm font-medium">
                            {item.card_name}
                          </span>
                        </div>
                        {item.set_name ? (
                          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                            Set: {item.set_name}
                          </p>
                        ) : null}
                        {item.language ? (
                          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                            Language: {item.language}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>

            {selectedCollectionItemId ? (
              <button
                type="button"
                onClick={clearSelection}
                className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
              >
                Clear selection
              </button>
            ) : null}
          </>
        )}
      </section>

      <form action={createListing} className="space-y-4">
        <input
          type="hidden"
          name="collection_item_id"
          value={selectedCollectionItemId}
        />

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Post cards or sealed products you own as a sale or trade listing.
        </p>

        <div className="space-y-2">
          <label htmlFor="type" className="text-sm font-medium">
            Type <span className="text-red-600">*</span>
          </label>
          <select
            id="type"
            name="type"
            required
            defaultValue=""
            className={inputClassName}
          >
            <option value="" disabled>
              Select a type
            </option>
            <option value="trade">Trade</option>
            <option value="sale">Sale</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="card_name" className="text-sm font-medium">
            Card name <span className="text-red-600">*</span>
          </label>
          <input
            id="card_name"
            name="card_name"
            type="text"
            required
            value={cardName}
            onChange={(event) => setCardName(event.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="trade_for" className="text-sm font-medium">
            Trade for
          </label>
          <input
            id="trade_for"
            name="trade_for"
            type="text"
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="target_price" className="text-sm font-medium">
            Target price
          </label>
          <input
            id="target_price"
            name="target_price"
            type="text"
            placeholder="e.g. 200€"
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="condition" className="text-sm font-medium">
            Condition
          </label>
          <input
            id="condition"
            name="condition"
            type="text"
            value={condition}
            onChange={(event) => setCondition(event.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="set_name" className="text-sm font-medium">
            Set name
          </label>
          <input
            id="set_name"
            name="set_name"
            type="text"
            value={setName}
            onChange={(event) => setSetName(event.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="language" className="text-sm font-medium">
            Language
          </label>
          <LanguageSelect
            id="language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="notes" className="text-sm font-medium">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={inputClassName}
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Create Listing
        </button>
      </form>
    </div>
  );
}
