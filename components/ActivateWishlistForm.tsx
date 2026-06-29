import { WISHLIST_PRIORITY_LABELS } from "@/lib/wishlist";

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

export function ActivateWishlistForm({
  items,
  alreadyListedIds,
  action,
}: ActivateWishlistFormProps) {
  const alreadyListedSet = new Set(alreadyListedIds);
  const selectableCount = items.filter((item) => !alreadyListedSet.has(item.id))
    .length;

  return (
    <form action={action} className="space-y-4">
      <ul className="space-y-3">
        {items.map((item) => {
          const isAlreadyListed = alreadyListedSet.has(item.id);

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
                  defaultChecked={!isAlreadyListed}
                  disabled={isAlreadyListed}
                  className="mt-1"
                />
                <span className="min-w-0 flex-1 space-y-2">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{item.card_name}</span>
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
                      <span className={badgeClassName}>#{item.card_number}</span>
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
        })}
      </ul>

      <button
        type="submit"
        disabled={selectableCount === 0}
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Activate selected for event
      </button>
    </form>
  );
}
