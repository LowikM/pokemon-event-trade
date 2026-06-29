"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  isWishlistUniqueViolation,
  parseWishlistFields,
  parseWishlistItemId,
  parseWishlistItemIds,
  WISHLIST_DUPLICATE_ERROR,
  WISHLIST_PRIORITY_MAX,
  WISHLIST_PRIORITY_MIN,
  type WishlistFieldData,
} from "@/lib/wishlist";
import { createClient } from "@/lib/supabase/server";

type ExistingWishlistItem = {
  id: string;
  tcg_api_card_id: string | null;
};

async function findDuplicateWishlistItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  data: Pick<WishlistFieldData, "card_ref" | "tcg_api_card_id">,
  excludeItemId?: string,
) {
  let query = supabase.from("wishlist_items").select("id");

  if (data.tcg_api_card_id) {
    query = query
      .eq("user_id", userId)
      .eq("tcg_api_card_id", data.tcg_api_card_id);
  } else {
    query = query
      .eq("user_id", userId)
      .is("tcg_api_card_id", null)
      .eq("card_ref", data.card_ref);
  }

  const { data: existing, error } = await query.maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (existing && existing.id !== excludeItemId) {
    return { duplicate: true as const };
  }

  return { duplicate: false as const };
}

async function getOwnedWishlistItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  itemId: string,
):
  Promise<
    | { error: string }
    | { notFound: true }
    | { item: ExistingWishlistItem }
  > {
  const { data, error } = await supabase
    .from("wishlist_items")
    .select("id, tcg_api_card_id")
    .eq("id", itemId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { notFound: true };
  }

  return { item: data as ExistingWishlistItem };
}

function parseBulkPriority(formData: FormData):
  | { error: string }
  | { priority: number } {
  const raw = formData.get("bulk_priority");
  const priority =
    typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN;

  if (
    !Number.isInteger(priority) ||
    priority < WISHLIST_PRIORITY_MIN ||
    priority > WISHLIST_PRIORITY_MAX
  ) {
    return { error: "Please select a valid priority (1–5)." };
  }

  return { priority };
}

export async function createWishlistItem(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = parseWishlistFields(formData);

  if ("error" in parsed) {
    redirect(`/my-wishlist?error=${encodeURIComponent(parsed.error)}`);
  }

  const duplicateCheck = await findDuplicateWishlistItem(
    supabase,
    user.id,
    parsed.data,
  );

  if ("error" in duplicateCheck && duplicateCheck.error) {
    redirect(`/my-wishlist?error=${encodeURIComponent(duplicateCheck.error)}`);
  }

  if ("duplicate" in duplicateCheck && duplicateCheck.duplicate) {
    redirect(
      `/my-wishlist?error=${encodeURIComponent(WISHLIST_DUPLICATE_ERROR)}`,
    );
  }

  const { error } = await supabase.from("wishlist_items").insert({
    user_id: user.id,
    ...parsed.data,
  });

  if (error) {
    if (isWishlistUniqueViolation(error)) {
      redirect(
        `/my-wishlist?error=${encodeURIComponent(WISHLIST_DUPLICATE_ERROR)}`,
      );
    }

    redirect(`/my-wishlist?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/my-wishlist");
  redirect("/my-wishlist");
}

export async function updateWishlistItem(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const itemId = parseWishlistItemId(formData);

  if (!itemId) {
    redirect(
      `/my-wishlist?error=${encodeURIComponent("Wishlist item not found.")}`,
    );
  }

  const ownedItem = await getOwnedWishlistItem(supabase, user.id, itemId);

  if ("error" in ownedItem && ownedItem.error) {
    redirect(`/my-wishlist?error=${encodeURIComponent(ownedItem.error)}`);
  }

  if ("notFound" in ownedItem) {
    redirect("/my-wishlist");
  }

  if (!("item" in ownedItem)) {
    redirect("/my-wishlist");
  }

  const existingItem = ownedItem.item;

  const parsed = parseWishlistFields(formData);

  if ("error" in parsed) {
    redirect(`/my-wishlist?error=${encodeURIComponent(parsed.error)}`);
  }

  const duplicateCheck = await findDuplicateWishlistItem(
    supabase,
    user.id,
    {
      card_ref: parsed.data.card_ref,
      tcg_api_card_id: existingItem.tcg_api_card_id,
    },
    itemId,
  );

  if ("error" in duplicateCheck && duplicateCheck.error) {
    redirect(`/my-wishlist?error=${encodeURIComponent(duplicateCheck.error)}`);
  }

  if ("duplicate" in duplicateCheck && duplicateCheck.duplicate) {
    redirect(
      `/my-wishlist?error=${encodeURIComponent(WISHLIST_DUPLICATE_ERROR)}`,
    );
  }

  const {
    tcg_api_card_id: _tcgApiCardId,
    card_number: _cardNumber,
    set_id: _setId,
    ...editableFields
  } = parsed.data;

  const { error } = await supabase
    .from("wishlist_items")
    .update(editableFields)
    .eq("id", itemId)
    .eq("user_id", user.id);

  if (error) {
    if (isWishlistUniqueViolation(error)) {
      redirect(
        `/my-wishlist?error=${encodeURIComponent(WISHLIST_DUPLICATE_ERROR)}`,
      );
    }

    redirect(`/my-wishlist?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/my-wishlist");
  redirect("/my-wishlist");
}

export async function deleteWishlistItem(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const itemId = parseWishlistItemId(formData);

  if (!itemId) {
    redirect("/my-wishlist");
  }

  const { error } = await supabase
    .from("wishlist_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/my-wishlist?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/my-wishlist");
  redirect("/my-wishlist");
}

export async function bulkDeleteWishlistItems(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const itemIds = parseWishlistItemIds(formData);

  if (itemIds.length === 0) {
    redirect(
      `/my-wishlist?error=${encodeURIComponent("Select at least one wishlist item.")}`,
    );
  }

  const { error, count } = await supabase
    .from("wishlist_items")
    .delete({ count: "exact" })
    .eq("user_id", user.id)
    .in("id", itemIds);

  if (error) {
    redirect(`/my-wishlist?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/my-wishlist");
  redirect(
    `/my-wishlist?deleted=${encodeURIComponent(String(count ?? itemIds.length))}`,
  );
}

export async function bulkSetWishlistPriority(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const itemIds = parseWishlistItemIds(formData);
  const priorityResult = parseBulkPriority(formData);

  if (itemIds.length === 0) {
    redirect(
      `/my-wishlist?error=${encodeURIComponent("Select at least one wishlist item.")}`,
    );
  }

  if ("error" in priorityResult) {
    redirect(`/my-wishlist?error=${encodeURIComponent(priorityResult.error)}`);
  }

  const { error, count } = await supabase
    .from("wishlist_items")
    .update({ priority: priorityResult.priority })
    .eq("user_id", user.id)
    .in("id", itemIds);

  if (error) {
    redirect(`/my-wishlist?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/my-wishlist");
  redirect(
    `/my-wishlist?priorityUpdated=${encodeURIComponent(String(count ?? itemIds.length))}`,
  );
}
