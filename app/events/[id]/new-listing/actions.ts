"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isCardLanguage } from "@/lib/languages";
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

type CollectionItemSnapshot = {
  id: string;
  tcg_api_card_id: string | null;
  card_number: string | null;
  set_id: string | null;
};

async function getValidatedCollectionItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  collectionItemId: FormDataEntryValue | null,
): Promise<CollectionItemSnapshot | null> {
  if (typeof collectionItemId !== "string" || !collectionItemId.trim()) {
    return null;
  }

  const { data: item } = await supabase
    .from("collection_items")
    .select("id, tcg_api_card_id, card_number, set_id")
    .eq("id", collectionItemId.trim())
    .eq("user_id", userId)
    .maybeSingle();

  return item ?? null;
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
  const collectionItem = await getValidatedCollectionItem(
    supabase,
    user.id,
    formData.get("collection_item_id"),
  );

  const tradeFor = getOptionalText(formData, "trade_for");
  const targetPrice = getOptionalText(formData, "target_price");
  const condition = getOptionalText(formData, "condition");
  const setName = getOptionalText(formData, "set_name");
  const notes = getOptionalText(formData, "notes");
  const languageValue = getOptionalText(formData, "language");

  if (languageValue && !isCardLanguage(languageValue)) {
    redirect(
      `/events/${eventId}/new-listing?error=${encodeURIComponent("Please select a valid language.")}`,
    );
  }

  const { error } = await supabase.from("listings").insert({
    event_id: eventId,
    user_id: user.id,
    type,
    card_name: normalizedCardName,
    card_ref: cardRef,
    status: "active",
    ...(collectionItem ? { collection_item_id: collectionItem.id } : {}),
    ...(collectionItem?.tcg_api_card_id
      ? { tcg_api_card_id: collectionItem.tcg_api_card_id }
      : {}),
    ...(collectionItem?.card_number
      ? { card_number: collectionItem.card_number }
      : {}),
    ...(collectionItem?.set_id ? { set_id: collectionItem.set_id } : {}),
    ...(tradeFor ? { trade_for: tradeFor } : {}),
    ...(targetPrice ? { target_price: targetPrice } : {}),
    ...(condition ? { condition } : {}),
    ...(setName ? { set_name: setName } : {}),
    ...(notes ? { notes } : {}),
    ...(languageValue ? { language: languageValue } : {}),
  });

  if (error) {
    redirect(
      `/events/${eventId}/new-listing?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}
