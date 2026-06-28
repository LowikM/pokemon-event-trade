import { redirect } from "next/navigation";

import {
  createCollectionItem,
  deleteCollectionItem,
  updateCollectionItem,
} from "@/app/my-collection/actions";
import { AddCollectionItemForm } from "@/components/AddCollectionItemForm";
import { LanguageSelect } from "@/components/LanguageSelect";
import { createClient } from "@/lib/supabase/server";

type ItemKind = "card" | "sealed";

type CollectionItem = {
  id: string;
  item_kind: ItemKind;
  card_name: string;
  card_ref: string;
  set_name: string | null;
  condition: string | null;
  notes: string | null;
  language: string | null;
  tcg_api_card_id: string | null;
  card_number: string | null;
  set_id: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
};

const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  card: "Card",
  sealed: "Sealed",
};

const inputClassName =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

function formatDateTime(date: string) {
  return new Date(date).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function MyCollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: pageError } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("collection_items")
    .select(
      "id, item_kind, card_name, card_ref, set_name, condition, notes, language, tcg_api_card_id, card_number, set_id, quantity, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const items = (data ?? []) as CollectionItem[];

  return (
    <div className="flex flex-1 justify-center px-4 py-12">
      <div className="w-full max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Collection</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Save cards and sealed products you own for faster listing later.
          </p>
        </div>

        {pageError ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            role="alert"
          >
            {pageError}
          </p>
        ) : null}

        <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold tracking-tight">
            Add to collection
          </h2>
          <AddCollectionItemForm action={createCollectionItem} />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Your items</h2>

          {error ? (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
              role="alert"
            >
              Could not load collection: {error.message}
            </p>
          ) : items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
              No items in your collection yet.
            </p>
          ) : (
            <ul className="grid gap-4">
              {items.map((item) => {
                const updateItem = updateCollectionItem.bind(null, item.id);
                const deleteItem = deleteCollectionItem.bind(null, item.id);

                return (
                  <li key={item.id}>
                    <article className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                      <div className="mb-4 flex flex-wrap items-start gap-2">
                        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                          {ITEM_KIND_LABELS[item.item_kind]}
                        </span>
                        {item.language ? (
                          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                            {item.language}
                          </span>
                        ) : null}
                        {item.tcg_api_card_id ? (
                          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                            Official card
                          </span>
                        ) : null}
                        {item.card_number ? (
                          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                            #{item.card_number}
                          </span>
                        ) : null}
                        {item.set_id ? (
                          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                            {item.set_id}
                          </span>
                        ) : null}
                        <p className="text-xs text-zinc-500 dark:text-zinc-500">
                          Added {formatDateTime(item.created_at)}
                        </p>
                      </div>

                      <form action={updateItem} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label
                              htmlFor={`item-kind-${item.id}`}
                              className="text-sm font-medium"
                            >
                              Item kind
                            </label>
                            <select
                              id={`item-kind-${item.id}`}
                              name="item_kind"
                              required
                              defaultValue={item.item_kind}
                              className={inputClassName}
                            >
                              <option value="card">Card</option>
                              <option value="sealed">Sealed</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label
                              htmlFor={`quantity-${item.id}`}
                              className="text-sm font-medium"
                            >
                              Quantity
                            </label>
                            <input
                              id={`quantity-${item.id}`}
                              name="quantity"
                              type="number"
                              min={1}
                              defaultValue={item.quantity}
                              required
                              className={inputClassName}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label
                            htmlFor={`card-name-${item.id}`}
                            className="text-sm font-medium"
                          >
                            Card name
                          </label>
                          <input
                            id={`card-name-${item.id}`}
                            name="card_name"
                            type="text"
                            required
                            defaultValue={item.card_name}
                            className={inputClassName}
                          />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label
                              htmlFor={`set-name-${item.id}`}
                              className="text-sm font-medium"
                            >
                              Set name
                            </label>
                            <input
                              id={`set-name-${item.id}`}
                              name="set_name"
                              type="text"
                              defaultValue={item.set_name ?? ""}
                              className={inputClassName}
                            />
                          </div>
                          <div className="space-y-2">
                            <label
                              htmlFor={`condition-${item.id}`}
                              className="text-sm font-medium"
                            >
                              Condition
                            </label>
                            <input
                              id={`condition-${item.id}`}
                              name="condition"
                              type="text"
                              defaultValue={item.condition ?? ""}
                              className={inputClassName}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label
                            htmlFor={`language-${item.id}`}
                            className="text-sm font-medium"
                          >
                            Language
                          </label>
                          <LanguageSelect
                            id={`language-${item.id}`}
                            defaultValue={item.language ?? ""}
                            className={inputClassName}
                          />
                        </div>
                        <div className="space-y-2">
                          <label
                            htmlFor={`notes-${item.id}`}
                            className="text-sm font-medium"
                          >
                            Notes
                          </label>
                          <textarea
                            id={`notes-${item.id}`}
                            name="notes"
                            rows={3}
                            defaultValue={item.notes ?? ""}
                            className={inputClassName}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="submit"
                            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                          >
                            Save changes
                          </button>
                        </div>
                      </form>

                      <form action={deleteItem} className="mt-2">
                        <button
                          type="submit"
                          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                        >
                          Delete
                        </button>
                      </form>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
