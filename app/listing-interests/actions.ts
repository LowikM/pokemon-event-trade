"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

async function getListingForInterest(listingId: string) {
  const supabase = await createClient();

  const { data: listing, error } = await supabase
    .from("listings")
    .select("id, user_id, event_id, status")
    .eq("id", listingId)
    .maybeSingle();

  if (error || !listing) {
    return null;
  }

  return listing;
}

async function redirectAfterInterestChange(eventId: string) {
  const referer = (await headers()).get("referer");

  if (referer?.includes("/my-interests")) {
    redirect("/my-interests");
  }

  redirect(`/events/${eventId}`);
}

function revalidateInterestPaths(eventId: string) {
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/my-interests");
  revalidatePath("/my-listings");
}

export async function addInterest(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const listing = await getListingForInterest(listingId);

  if (!listing || listing.user_id === user.id || listing.status !== "active") {
    redirect(listing ? `/events/${listing.event_id}` : "/events");
  }

  const { data: existingInterest } = await supabase
    .from("listing_interests")
    .select("id")
    .eq("listing_id", listingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingInterest) {
    await redirectAfterInterestChange(listing.event_id);
  }

  const { error } = await supabase.from("listing_interests").insert({
    listing_id: listingId,
    user_id: user.id,
  });

  if (error) {
    redirect(
      `/events/${listing.event_id}?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidateInterestPaths(listing.event_id);
  await redirectAfterInterestChange(listing.event_id);
}

export async function removeInterest(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const listing = await getListingForInterest(listingId);
  const eventId = listing?.event_id;

  const { error } = await supabase
    .from("listing_interests")
    .delete()
    .eq("listing_id", listingId)
    .eq("user_id", user.id);

  if (error) {
    const redirectPath = eventId ? `/events/${eventId}` : "/my-interests";
    redirect(`${redirectPath}?error=${encodeURIComponent(error.message)}`);
  }

  if (eventId) {
    revalidateInterestPaths(eventId);
    await redirectAfterInterestChange(eventId);
  }

  revalidatePath("/my-interests");
  redirect("/my-interests");
}
