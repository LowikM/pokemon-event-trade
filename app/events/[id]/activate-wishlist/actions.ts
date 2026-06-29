"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type WishlistItemRow = {
  id: string;
  card_name: string;
  card_ref: string;
  set_name: string | null;
  language: string | null;
  notes: string | null;
  tcg_api_card_id: string | null;
  card_number: string | null;
  set_id: string | null;
};

function parseWishlistItemIds(wishlistItemIds: string[]) {
  const uniqueIds = [
    ...new Set(
      wishlistItemIds.filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      ),
    ),
  ];

  return uniqueIds.map((id) => id.trim());
}

function buildListingInsert(item: WishlistItemRow, eventId: string, userId: string) {
  return {
    event_id: eventId,
    user_id: userId,
    type: "want" as const,
    status: "active" as const,
    card_name: item.card_name,
    card_ref: item.card_ref,
    wishlist_item_id: item.id,
    ...(item.set_name ? { set_name: item.set_name } : {}),
    ...(item.language ? { language: item.language } : {}),
    ...(item.notes ? { notes: item.notes } : {}),
    ...(item.tcg_api_card_id ? { tcg_api_card_id: item.tcg_api_card_id } : {}),
    ...(item.card_number ? { card_number: item.card_number } : {}),
    ...(item.set_id ? { set_id: item.set_id } : {}),
  };
}

export async function activateWishlistForEvent(
  eventId: string,
  wishlistItemIds: string[],
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const selectedIds = parseWishlistItemIds(wishlistItemIds);

  if (selectedIds.length === 0) {
    redirect(
      `/events/${eventId}/activate-wishlist?error=${encodeURIComponent("Select at least one wishlist item.")}`,
    );
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    redirect(
      `/events/${eventId}/activate-wishlist?error=${encodeURIComponent("Event not found.")}`,
    );
  }

  const { data: wishlistItems, error: wishlistError } = await supabase
    .from("wishlist_items")
    .select(
      "id, card_name, card_ref, set_name, language, notes, tcg_api_card_id, card_number, set_id",
    )
    .eq("user_id", user.id)
    .in("id", selectedIds);

  if (wishlistError) {
    redirect(
      `/events/${eventId}/activate-wishlist?error=${encodeURIComponent(wishlistError.message)}`,
    );
  }

  const ownedItems = (wishlistItems ?? []) as WishlistItemRow[];

  if (ownedItems.length !== selectedIds.length) {
    redirect(
      `/events/${eventId}/activate-wishlist?error=${encodeURIComponent("One or more selected wishlist items could not be found.")}`,
    );
  }

  const { data: activeListings, error: activeListingsError } = await supabase
    .from("listings")
    .select("wishlist_item_id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .eq("type", "want")
    .eq("status", "active")
    .not("wishlist_item_id", "is", null)
    .in("wishlist_item_id", selectedIds);

  if (activeListingsError) {
    redirect(
      `/events/${eventId}/activate-wishlist?error=${encodeURIComponent(activeListingsError.message)}`,
    );
  }

  const alreadyActiveIds = new Set(
    (activeListings ?? [])
      .map((listing) => listing.wishlist_item_id)
      .filter((id): id is string => Boolean(id)),
  );

  let activatedCount = 0;

  for (const item of ownedItems) {
    if (alreadyActiveIds.has(item.id)) {
      continue;
    }

    const { error } = await supabase
      .from("listings")
      .insert(buildListingInsert(item, eventId, user.id));

    if (error) {
      redirect(
        `/events/${eventId}/activate-wishlist?error=${encodeURIComponent(error.message)}`,
      );
    }

    activatedCount += 1;
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/activate-wishlist`);
  revalidatePath("/my-listings");
  revalidatePath("/my-matches");

  if (activatedCount === 0) {
    redirect(
      `/events/${eventId}/activate-wishlist?error=${encodeURIComponent("All selected items are already listed for this event.")}`,
    );
  }

  redirect(
    `/events/${eventId}?wishlistActivated=${encodeURIComponent(String(activatedCount))}`,
  );
}

export async function activateWishlistForEventFromForm(
  eventId: string,
  formData: FormData,
) {
  const wishlistItemIds = formData
    .getAll("wishlist_item_ids")
    .filter((value): value is string => typeof value === "string");

  await activateWishlistForEvent(eventId, wishlistItemIds);
}
