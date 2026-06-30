"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isCardLanguage } from "@/lib/languages";
import { getSafeReturnPath } from "@/lib/return-path";
import { createClient } from "@/lib/supabase/server";

const ITEM_KINDS = ["card", "sealed"] as const;

type ItemKind = (typeof ITEM_KINDS)[number];

function isItemKind(value: string): value is ItemKind {
  return ITEM_KINDS.includes(value as ItemKind);
}

function getOptionalText(formData: FormData, name: string) {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isValidTcgApiCardId(value: string) {
  return /^[a-zA-Z0-9-]+$/.test(value) && value.length <= 64;
}

function parseOptionalApiFields(formData: FormData, itemKind: ItemKind):
  | { error: string }
  | {
      tcg_api_card_id: string | null;
      card_number: string | null;
      set_id: string | null;
    } {
  if (itemKind === "sealed") {
    return {
      tcg_api_card_id: null,
      card_number: null,
      set_id: null,
    };
  }

  const tcgApiCardId = getOptionalText(formData, "tcg_api_card_id");
  const cardNumber = getOptionalText(formData, "card_number");
  const setId = getOptionalText(formData, "set_id");

  const hasAnyApiField = Boolean(tcgApiCardId || cardNumber || setId);

  if (!hasAnyApiField) {
    return {
      tcg_api_card_id: null,
      card_number: null,
      set_id: null,
    };
  }

  if (!tcgApiCardId || !isValidTcgApiCardId(tcgApiCardId)) {
    return { error: "Please select a valid official card." };
  }

  return {
    tcg_api_card_id: tcgApiCardId,
    card_number: cardNumber,
    set_id: setId,
  };
}

function parseCollectionFields(formData: FormData):
  | { error: string }
  | {
      data: {
        item_kind: ItemKind;
        card_name: string;
        card_ref: string;
        set_name: string | null;
        condition: string | null;
        notes: string | null;
        language: string | null;
        quantity: number;
        tcg_api_card_id: string | null;
        card_number: string | null;
        set_id: string | null;
      };
    } {
  const itemKind = formData.get("item_kind");
  const cardName = formData.get("card_name");
  const quantityValue = formData.get("quantity");

  if (typeof itemKind !== "string" || !isItemKind(itemKind)) {
    return { error: "Please select a valid item kind." };
  }

  if (typeof cardName !== "string" || !cardName.trim()) {
    return { error: "Card name is required." };
  }

  const quantity =
    typeof quantityValue === "string" ? Number.parseInt(quantityValue, 10) : NaN;

  if (!Number.isInteger(quantity) || quantity < 1) {
    return { error: "Quantity must be at least 1." };
  }

  const normalizedCardName = cardName.trim();
  const languageValue = getOptionalText(formData, "language");

  if (languageValue && !isCardLanguage(languageValue)) {
    return { error: "Please select a valid language." };
  }

  const apiFields = parseOptionalApiFields(formData, itemKind);

  if ("error" in apiFields) {
    return apiFields;
  }

  return {
    data: {
      item_kind: itemKind,
      card_name: normalizedCardName,
      card_ref: normalizedCardName.toLowerCase(),
      set_name: getOptionalText(formData, "set_name"),
      condition: getOptionalText(formData, "condition"),
      notes: getOptionalText(formData, "notes"),
      language: languageValue,
      quantity,
      ...apiFields,
    },
  };
}

export async function createCollectionItem(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = parseCollectionFields(formData);
  const returnPath = getSafeReturnPath(formData, "/my-collection");

  if ("error" in parsed) {
    redirect(`${returnPath}?error=${encodeURIComponent(parsed.error)}`);
  }

  const { error } = await supabase.from("collection_items").insert({
    user_id: user.id,
    ...parsed.data,
  });

  if (error) {
    redirect(`${returnPath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/my-collection");
  revalidatePath(returnPath);
  redirect(`${returnPath}?added=collection`);
}

export async function updateCollectionItem(
  itemId: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = parseCollectionFields(formData);

  if ("error" in parsed) {
    redirect(
      `/my-collection?error=${encodeURIComponent(parsed.error)}`,
    );
  }

  const {
    tcg_api_card_id: _tcgApiCardId,
    card_number: _cardNumber,
    set_id: _setId,
    ...editableFields
  } = parsed.data;

  const { error } = await supabase
    .from("collection_items")
    .update(editableFields)
    .eq("id", itemId)
    .eq("user_id", user.id);

  if (error) {
    redirect(
      `/my-collection?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/my-collection");
  redirect("/my-collection");
}

export async function deleteCollectionItem(itemId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("collection_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", user.id);

  if (error) {
    redirect(
      `/my-collection?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/my-collection");
  redirect("/my-collection");
}
