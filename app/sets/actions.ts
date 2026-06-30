"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isCardLanguage } from "@/lib/languages";
import { getCardsForSet } from "@/lib/pokemon-tcg";
import { getSafeReturnPath } from "@/lib/return-path";
import { parseBulkTcgApiCardIds } from "@/lib/set-browser";
import { createClient } from "@/lib/supabase/server";
import {
  isWishlistUniqueViolation,
  WISHLIST_PRIORITY_MAX,
  WISHLIST_PRIORITY_MIN,
} from "@/lib/wishlist";

type BulkAddSummary = {
  added: number;
  alreadyOwned: number;
  alreadyWished: number;
};

function isValidTcgApiCardId(value: string) {
  return /^[a-zA-Z0-9-]+$/.test(value) && value.length <= 64;
}

function getOptionalText(formData: FormData, name: string) {
  const value = formData.get(name);
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseBulkLanguage(formData: FormData) {
  const languageValue = getOptionalText(formData, "language");

  if (languageValue && !isCardLanguage(languageValue)) {
    return { ok: false as const, error: "Please select a valid language." };
  }

  return { ok: true as const, language: languageValue };
}

function parseBulkQuantity(formData: FormData) {
  const quantityValue = formData.get("quantity");
  const quantity =
    typeof quantityValue === "string"
      ? Number.parseInt(quantityValue, 10)
      : Number.NaN;

  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false as const, error: "Quantity must be at least 1." };
  }

  return { ok: true as const, quantity };
}

function parseBulkPriority(formData: FormData) {
  const raw = formData.get("priority");
  const priority =
    typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN;

  if (
    !Number.isInteger(priority) ||
    priority < WISHLIST_PRIORITY_MIN ||
    priority > WISHLIST_PRIORITY_MAX
  ) {
    return { ok: false as const, error: "Please select a valid priority (1–5)." };
  }

  return { ok: true as const, priority };
}

function buildBulkRedirectPath(
  returnPath: string,
  target: "collection" | "wishlist",
  summary: BulkAddSummary,
) {
  const params = new URLSearchParams();
  params.set("bulk", target);
  params.set("added", String(summary.added));

  if (summary.alreadyOwned > 0) {
    params.set("alreadyOwned", String(summary.alreadyOwned));
  }

  if (summary.alreadyWished > 0) {
    params.set("alreadyWished", String(summary.alreadyWished));
  }

  return `${returnPath}?${params.toString()}`;
}

async function resolveOfficialCards(setId: string, cardIds: string[]) {
  const validIds = cardIds.filter(isValidTcgApiCardId);

  if (validIds.length === 0) {
    return { ok: false as const, error: "Select at least one valid card." };
  }

  const setCards = await getCardsForSet(setId);
  const cardsById = new Map(setCards.map((card) => [card.id, card]));
  const resolvedCards = validIds
    .map((id) => cardsById.get(id))
    .filter((card): card is NonNullable<typeof card> => Boolean(card));

  if (resolvedCards.length === 0) {
    return {
      ok: false as const,
      error: "No matching official cards were found for this set.",
    };
  }

  return { ok: true as const, cards: resolvedCards };
}

export async function bulkAddCardsToCollection(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const returnPath = getSafeReturnPath(formData, "/sets");
  const setId = getOptionalText(formData, "set_id");
  const cardIds = parseBulkTcgApiCardIds(formData);
  const languageResult = parseBulkLanguage(formData);
  const quantityResult = parseBulkQuantity(formData);
  const condition = getOptionalText(formData, "condition");

  if (!setId) {
    redirect(`${returnPath}?error=${encodeURIComponent("Set not found.")}`);
  }

  if (cardIds.length === 0) {
    redirect(
      `${returnPath}?error=${encodeURIComponent("Select at least one card.")}`,
    );
  }

  if (!languageResult.ok) {
    redirect(`${returnPath}?error=${encodeURIComponent(languageResult.error)}`);
  }

  if (!quantityResult.ok) {
    redirect(`${returnPath}?error=${encodeURIComponent(quantityResult.error)}`);
  }

  const resolved = await resolveOfficialCards(setId, cardIds);

  if (!resolved.ok) {
    redirect(`${returnPath}?error=${encodeURIComponent(resolved.error)}`);
  }

  const resolvedIds = resolved.cards.map((card) => card.id);

  const { data: existingRows, error: existingError } = await supabase
    .from("collection_items")
    .select("tcg_api_card_id")
    .eq("user_id", user.id)
    .in("tcg_api_card_id", resolvedIds);

  if (existingError) {
    redirect(`${returnPath}?error=${encodeURIComponent(existingError.message)}`);
  }

  const ownedIds = new Set(
    (existingRows ?? [])
      .map((row) => row.tcg_api_card_id)
      .filter((id): id is string => Boolean(id)),
  );

  const cardsToAdd = resolved.cards.filter((card) => !ownedIds.has(card.id));
  const alreadyOwned = resolved.cards.length - cardsToAdd.length;

  if (cardsToAdd.length > 0) {
    const rows = cardsToAdd.map((card) => ({
      user_id: user.id,
      item_kind: "card" as const,
      card_name: card.name,
      card_ref: card.name.trim().toLowerCase(),
      set_name: card.set.name,
      condition,
      language: languageResult.language,
      quantity: quantityResult.quantity,
      tcg_api_card_id: card.id,
      card_number: card.number,
      set_id: card.set.id,
    }));

    const { error: insertError } = await supabase
      .from("collection_items")
      .insert(rows);

    if (insertError) {
      redirect(`${returnPath}?error=${encodeURIComponent(insertError.message)}`);
    }
  }

  revalidatePath("/my-collection");
  revalidatePath(returnPath);

  redirect(
    buildBulkRedirectPath(returnPath, "collection", {
      added: cardsToAdd.length,
      alreadyOwned,
      alreadyWished: 0,
    }),
  );
}

export async function bulkAddCardsToWishlist(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const returnPath = getSafeReturnPath(formData, "/sets");
  const setId = getOptionalText(formData, "set_id");
  const cardIds = parseBulkTcgApiCardIds(formData);
  const languageResult = parseBulkLanguage(formData);
  const priorityResult = parseBulkPriority(formData);

  if (!setId) {
    redirect(`${returnPath}?error=${encodeURIComponent("Set not found.")}`);
  }

  if (cardIds.length === 0) {
    redirect(
      `${returnPath}?error=${encodeURIComponent("Select at least one card.")}`,
    );
  }

  if (!languageResult.ok) {
    redirect(`${returnPath}?error=${encodeURIComponent(languageResult.error)}`);
  }

  if (!priorityResult.ok) {
    redirect(`${returnPath}?error=${encodeURIComponent(priorityResult.error)}`);
  }

  const resolved = await resolveOfficialCards(setId, cardIds);

  if (!resolved.ok) {
    redirect(`${returnPath}?error=${encodeURIComponent(resolved.error)}`);
  }

  const resolvedIds = resolved.cards.map((card) => card.id);

  const { data: existingRows, error: existingError } = await supabase
    .from("wishlist_items")
    .select("tcg_api_card_id")
    .eq("user_id", user.id)
    .in("tcg_api_card_id", resolvedIds);

  if (existingError) {
    redirect(`${returnPath}?error=${encodeURIComponent(existingError.message)}`);
  }

  const wishedIds = new Set(
    (existingRows ?? [])
      .map((row) => row.tcg_api_card_id)
      .filter((id): id is string => Boolean(id)),
  );

  const cardsToAdd = resolved.cards.filter((card) => !wishedIds.has(card.id));
  const alreadyWished = resolved.cards.length - cardsToAdd.length;

  if (cardsToAdd.length > 0) {
    const rows = cardsToAdd.map((card) => ({
      user_id: user.id,
      card_name: card.name,
      card_ref: card.name.trim().toLowerCase(),
      set_name: card.set.name,
      language: languageResult.language,
      priority: priorityResult.priority,
      tcg_api_card_id: card.id,
      card_number: card.number,
      set_id: card.set.id,
    }));

    const { error: insertError } = await supabase
      .from("wishlist_items")
      .insert(rows);

    if (insertError && !isWishlistUniqueViolation(insertError)) {
      redirect(`${returnPath}?error=${encodeURIComponent(insertError.message)}`);
    }
  }

  revalidatePath("/my-wishlist");
  revalidatePath(returnPath);

  redirect(
    buildBulkRedirectPath(returnPath, "wishlist", {
      added: cardsToAdd.length,
      alreadyOwned: 0,
      alreadyWished,
    }),
  );
}
