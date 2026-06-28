"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const LISTING_TYPES = ["want", "trade", "sale"] as const;

type ListingType = (typeof LISTING_TYPES)[number];

function isListingType(value: string): value is ListingType {
  return LISTING_TYPES.includes(value as ListingType);
}

function getOptionalText(formData: FormData, name: string) {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function getValidatedCollectionItemId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  collectionItemId: FormDataEntryValue | null,
) {
  if (typeof collectionItemId !== "string" || !collectionItemId.trim()) {
    return null;
  }

  const { data: item } = await supabase
    .from("collection_items")
    .select("id")
    .eq("id", collectionItemId.trim())
    .eq("user_id", userId)
    .maybeSingle();

  return item?.id ?? null;
}

export async function createListing(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const type = formData.get("type");
  const cardName = formData.get("card_name");

  if (typeof type !== "string" || !isListingType(type)) {
    redirect(
      `/events/${eventId}/new-listing?error=${encodeURIComponent("Please select a valid listing type.")}`,
    );
  }

  if (typeof cardName !== "string" || !cardName.trim()) {
    redirect(
      `/events/${eventId}/new-listing?error=${encodeURIComponent("Card name is required.")}`,
    );
  }

  const normalizedCardName = cardName.trim();
  const cardRef = normalizedCardName.toLowerCase();
  const collectionItemId = await getValidatedCollectionItemId(
    supabase,
    user.id,
    formData.get("collection_item_id"),
  );

  const tradeFor = getOptionalText(formData, "trade_for");
  const targetPrice = getOptionalText(formData, "target_price");
  const condition = getOptionalText(formData, "condition");
  const setName = getOptionalText(formData, "set_name");
  const notes = getOptionalText(formData, "notes");

  const { error } = await supabase.from("listings").insert({
    event_id: eventId,
    user_id: user.id,
    type,
    card_name: normalizedCardName,
    card_ref: cardRef,
    status: "active",
    ...(collectionItemId ? { collection_item_id: collectionItemId } : {}),
    ...(tradeFor ? { trade_for: tradeFor } : {}),
    ...(targetPrice ? { target_price: targetPrice } : {}),
    ...(condition ? { condition } : {}),
    ...(setName ? { set_name: setName } : {}),
    ...(notes ? { notes } : {}),
  });

  if (error) {
    redirect(
      `/events/${eventId}/new-listing?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}
