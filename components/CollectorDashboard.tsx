import Link from "next/link";

import type {
  CollectorDashboardData,
  DashboardContinueSet,
  DashboardEventSummary,
} from "@/lib/dashboard";
import { WISHLIST_PRIORITY_LABELS } from "@/lib/wishlist";

type CollectorDashboardProps = {
  data: CollectorDashboardData;
  cardImagesById: Map<string, { small: string; large: string }>;
};

const sectionClassName =
  "space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800";

const statTileClassName =
  "rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900";

const quickActionClassName =
  "inline-flex items-center justify-center rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900";

function formatEventDates(startDate: string, endDate: string) {
  const start = new Date(startDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const end = new Date(endDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (startDate.slice(0, 10) === endDate.slice(0, 10)) {
    return end;
  }

  return `${start} – ${end}`;
}

function StatTile({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <>
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${statTileClassName} block transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800`}>
        {content}
      </Link>
    );
  }

  return <div className={statTileClassName}>{content}</div>;
}

function ContinueSetCard({ set }: { set: DashboardContinueSet }) {
  return (
    <article className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="space-y-3">
        <div>
          <h3 className="font-medium">{set.setName}</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {set.ownedCount} / {set.totalCards} owned · {set.completionPercent}%
            complete
          </p>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
          role="progressbar"
          aria-valuenow={set.completionPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${set.setName} completion`}
        >
          <div
            className="h-full rounded-full bg-green-500 dark:bg-green-400"
            style={{ width: `${set.completionPercent}%` }}
          />
        </div>
        <Link
          href={`/sets/${set.setId}`}
          className="inline-flex rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Continue →
        </Link>
      </div>
    </article>
  );
}

function EventList({
  events,
  emptyMessage,
}: {
  events: DashboardEventSummary[];
  emptyMessage: string;
}) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{emptyMessage}</p>
    );
  }

  return (
    <ul className="space-y-2">
      {events.map((event) => (
        <li key={event.id}>
          <Link
            href={`/events/${event.id}`}
            className="block rounded-lg border border-zinc-200 px-3 py-2 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
          >
            <p className="font-medium">{event.name}</p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {formatEventDates(event.startDate, event.endDate)} · {event.location}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CollectorDashboard({
  data,
  cardImagesById,
}: CollectorDashboardProps) {
  return (
    <div className="flex flex-1 justify-center px-4 py-12">
      <div className="w-full max-w-6xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {data.displayName}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Your collector dashboard — collection progress, trading activity, and
            what to work on next.
          </p>
        </div>

        {data.errors.length > 0 ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            role="alert"
          >
            {data.errors.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        ) : null}

        <section className={sectionClassName}>
          <h2 className="text-sm font-medium">Collection</h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Total cards owned"
              value={data.collection.totalCardsOwned}
              href="/my-collection"
            />
            <StatTile
              label="Distinct cards"
              value={data.collection.distinctCards}
              href="/my-collection"
            />
            <StatTile
              label="Wishlist items"
              value={data.collection.wishlistItems}
              href="/my-wishlist"
            />
            <StatTile
              label="Active listings"
              value={data.collection.activeListings}
              href="/my-listings"
            />
          </dl>
        </section>

        <section className={sectionClassName}>
          <h2 className="text-sm font-medium">Trading</h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile
              label="Active matches"
              value={data.trading.activeMatches}
              href="/my-matches"
            />
            <StatTile
              label="Interested listings"
              value={data.trading.interestedListings}
              href="/my-interests"
            />
            <StatTile
              label="Unread messages"
              value={data.trading.unreadMessages}
              href="/messages"
            />
          </dl>
        </section>

        <section className={sectionClassName}>
          <h2 className="text-sm font-medium">Events</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Upcoming events
              </h3>
              <EventList
                events={data.events.upcoming}
                emptyMessage="No upcoming events scheduled."
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Events you&apos;re listing at
              </h3>
              <EventList
                events={data.events.attending}
                emptyMessage="No active listings yet. Browse events to post cards for trade."
              />
            </div>
          </div>
        </section>

        <section className={sectionClassName}>
          <h2 className="text-sm font-medium">Continue collecting</h2>
          {data.continueSets.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Visit the{" "}
              <Link href="/sets" className="font-medium hover:underline">
                Set Browser
              </Link>{" "}
              or add cards to your collection to see set progress here.
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.continueSets.map((set) => (
                <li key={set.setId}>
                  <ContinueSetCard set={set} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={sectionClassName}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium">Wishlist</h2>
            <Link
              href="/my-wishlist"
              className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
            >
              View all
            </Link>
          </div>
          {data.topWishlist.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No wishlist items yet.{" "}
              <Link href="/my-wishlist" className="font-medium hover:underline">
                Add cards you want
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.topWishlist.map((item) => {
                const image = item.tcgApiCardId
                  ? cardImagesById.get(item.tcgApiCardId)?.small
                  : null;

                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image}
                        alt=""
                        className="h-14 w-10 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-zinc-100 text-[10px] text-zinc-500 dark:bg-zinc-900">
                        No image
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.cardName}</p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {item.setName ?? "Unknown set"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                      {WISHLIST_PRIORITY_LABELS[item.priority] ??
                        `Priority ${item.priority}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={sectionClassName}>
          <h2 className="text-sm font-medium">Quick actions</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link href="/sets" className={quickActionClassName}>
              Browse Sets
            </Link>
            <Link href="/my-collection" className={quickActionClassName}>
              My Collection
            </Link>
            <Link href="/my-wishlist" className={quickActionClassName}>
              My Wishlist
            </Link>
            <Link href="/my-matches" className={quickActionClassName}>
              My Matches
            </Link>
            <Link href="/messages" className={quickActionClassName}>
              Messages
            </Link>
            <Link href="/events" className={quickActionClassName}>
              Upcoming Events
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
