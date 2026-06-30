import { createCollectionItem } from "@/app/my-collection/actions";
import { createWishlistItem } from "@/app/my-wishlist/actions";
import type { PokemonTcgSetCard } from "@/lib/pokemon-tcg";
import {
  getSetCardStatus,
  matchesSetCardFilter,
  SET_CARD_STATUS_LABELS,
  type SetCardFilter,
  type SetCardStatus,
} from "@/lib/set-browser";
import { WISHLIST_PRIORITY_DEFAULT } from "@/lib/wishlist";

type SetBrowserCardProps = {
  card: PokemonTcgSetCard;
  setId: string;
  ownedIds: ReadonlySet<string>;
  wantedIds: ReadonlySet<string>;
  isSelected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  mode?: "grid" | "binder";
  statusFilter?: SetCardFilter;
};

const badgeClassName =
  "rounded-full px-2 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300";

const badgeStyles: Record<SetCardStatus, string> = {
  owned: "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300",
  wanted: "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300",
  "owned-wanted":
    "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300",
  missing: "bg-zinc-100 dark:bg-zinc-900",
};

const buttonClassName =
  "rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900";

function getGridBorderClass(isSelected: boolean) {
  if (isSelected) {
    return "border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20";
  }

  return "border-zinc-200 dark:border-zinc-800";
}

function getBinderBorderClass(status: SetCardStatus, isSelected: boolean) {
  let base = "";

  switch (status) {
    case "owned":
      base = "border-green-500 dark:border-green-400";
      break;
    case "wanted":
      base = "border-blue-500 dark:border-blue-400";
      break;
    case "owned-wanted":
      base = "border-green-500 dark:border-green-400";
      break;
    case "missing":
      base =
        "border-dashed border-zinc-300 bg-zinc-100/80 dark:border-zinc-700 dark:bg-zinc-900/80";
      break;
  }

  if (isSelected) {
    base += " ring-2 ring-blue-500/20 dark:ring-blue-400/20";
  }

  return base;
}

function BinderFilteredSlot({ cardNumber }: { cardNumber: string }) {
  return (
    <article className="flex h-full min-h-[280px] flex-col rounded-xl border border-dashed border-zinc-300 bg-zinc-100/60 p-3 dark:border-zinc-700 dark:bg-zinc-900/60">
      <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
        #{cardNumber}
      </span>
      <div className="flex flex-1 items-center justify-center">
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          Hidden by filter
        </span>
      </div>
    </article>
  );
}

export function SetBrowserCard({
  card,
  setId,
  ownedIds,
  wantedIds,
  isSelected = false,
  onSelectChange,
  mode = "grid",
  statusFilter = "all",
}: SetBrowserCardProps) {
  const status = getSetCardStatus(ownedIds, wantedIds, card.id);
  const isOwned = ownedIds.has(card.id);
  const isWanted = wantedIds.has(card.id);
  const returnPath = `/sets/${setId}`;
  const matchesFilter = matchesSetCardFilter(
    statusFilter,
    card.id,
    ownedIds,
    wantedIds,
  );

  if (mode === "binder" && statusFilter !== "all" && !matchesFilter) {
    return <BinderFilteredSlot cardNumber={card.number} />;
  }

  const borderClassName =
    mode === "binder"
      ? getBinderBorderClass(status, isSelected)
      : getGridBorderClass(isSelected);

  const showBinderWantedBadge = mode === "binder" && status === "owned-wanted";

  return (
    <article
      className={`flex h-full flex-col rounded-xl border p-3 transition-colors ${borderClassName}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(event) => onSelectChange?.(event.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
            aria-label={`Select ${card.name}`}
          />
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            #{card.number}
          </span>
        </label>
        <div className="flex flex-col items-end gap-1">
          {showBinderWantedBadge ? (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              Wanted
            </span>
          ) : null}
          {mode === "grid" ? (
            <span className={`${badgeClassName} ${badgeStyles[status]}`}>
              {SET_CARD_STATUS_LABELS[status]}
            </span>
          ) : status !== "owned-wanted" ? (
            <span className={`${badgeClassName} ${badgeStyles[status]}`}>
              {SET_CARD_STATUS_LABELS[status]}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mb-3 flex flex-1 flex-col items-center">
        {card.images.small ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.images.small}
            alt=""
            className={`h-auto w-full max-w-[120px] rounded-md ${
              status === "missing" && mode === "binder"
                ? "opacity-60 grayscale"
                : ""
            }`}
          />
        ) : (
          <div
            className={`flex h-32 w-full max-w-[120px] items-center justify-center rounded-md text-xs text-zinc-500 ${
              status === "missing" && mode === "binder"
                ? "bg-zinc-200/80 dark:bg-zinc-800/80"
                : "bg-zinc-100 dark:bg-zinc-900"
            }`}
          >
            No image
          </div>
        )}
        <h3
          className={`mt-2 line-clamp-2 text-center text-sm font-medium leading-snug ${
            status === "missing" && mode === "binder"
              ? "text-zinc-500 dark:text-zinc-400"
              : ""
          }`}
        >
          {card.name}
        </h3>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <form action={createCollectionItem}>
          <input type="hidden" name="return_path" value={returnPath} />
          <input type="hidden" name="item_kind" value="card" />
          <input type="hidden" name="quantity" value="1" />
          <input type="hidden" name="card_name" value={card.name} />
          <input type="hidden" name="set_name" value={card.set.name} />
          <input type="hidden" name="tcg_api_card_id" value={card.id} />
          <input type="hidden" name="card_number" value={card.number} />
          <input type="hidden" name="set_id" value={card.set.id} />
          <button
            type="submit"
            disabled={isOwned}
            className={`${buttonClassName} w-full`}
          >
            Add to Collection
          </button>
        </form>

        <form action={createWishlistItem}>
          <input type="hidden" name="return_path" value={returnPath} />
          <input type="hidden" name="card_name" value={card.name} />
          <input type="hidden" name="set_name" value={card.set.name} />
          <input type="hidden" name="tcg_api_card_id" value={card.id} />
          <input type="hidden" name="card_number" value={card.number} />
          <input type="hidden" name="set_id" value={card.set.id} />
          <input
            type="hidden"
            name="priority"
            value={WISHLIST_PRIORITY_DEFAULT}
          />
          <button
            type="submit"
            disabled={isWanted}
            className={`${buttonClassName} w-full`}
          >
            Add to Wishlist
          </button>
        </form>
      </div>
    </article>
  );
}
