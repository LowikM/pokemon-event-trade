import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { activateWishlistForEventFromForm } from "@/app/events/[id]/activate-wishlist/actions";
import { ActivateWishlistForm } from "@/components/ActivateWishlistForm";
import { createClient } from "@/lib/supabase/server";

type ActivateWishlistPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function ActivateWishlistPage({
  params,
  searchParams,
}: ActivateWishlistPageProps) {
  const { id: eventId } = await params;
  const { error: pageError } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, name")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    notFound();
  }

  const [{ data: wishlistItems, error: wishlistError }, { data: activeListings, error: listingsError }] =
    await Promise.all([
      supabase
        .from("wishlist_items")
        .select(
          "id, card_name, set_name, language, notes, tcg_api_card_id, card_number, set_id, priority",
        )
        .eq("user_id", user.id)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("listings")
        .select("wishlist_item_id")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .eq("type", "want")
        .eq("status", "active")
        .not("wishlist_item_id", "is", null),
    ]);

  const alreadyListedIds = (activeListings ?? [])
    .map((listing) => listing.wishlist_item_id)
    .filter((id): id is string => Boolean(id));

  const activateWishlist = activateWishlistForEventFromForm.bind(null, event.id);

  return (
    <div className="flex flex-1 justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-2">
          <Link
            href={`/events/${event.id}`}
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            ← Back to event
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Activate Wishlist
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Create want listings for {event.name} from your permanent wishlist.
            Listing details are snapshotted at activation time.
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

        {wishlistError ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            role="alert"
          >
            Could not load wishlist: {wishlistError.message}
          </p>
        ) : null}

        {listingsError ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            role="alert"
          >
            Could not load existing listings: {listingsError.message}
          </p>
        ) : null}

        {!wishlistError && (wishlistItems ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            <p>Your wishlist is empty.</p>
            <p className="mt-2">
              <Link href="/my-wishlist" className="font-medium hover:underline">
                Add cards to My Wishlist
              </Link>{" "}
              first, then return here to activate them for this event.
            </p>
          </div>
        ) : null}

        {!wishlistError && (wishlistItems ?? []).length > 0 ? (
          <ActivateWishlistForm
            items={wishlistItems ?? []}
            alreadyListedIds={alreadyListedIds}
            action={activateWishlist}
          />
        ) : null}
      </div>
    </div>
  );
}
