import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { NewListingForm } from "@/components/NewListingForm";
import { createClient } from "@/lib/supabase/server";

import { createListing } from "./actions";

type NewListingPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function NewListingPage({
  params,
  searchParams,
}: NewListingPageProps) {
  const { id } = await params;
  const { error } = await searchParams;
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
    .eq("id", id)
    .single();

  if (eventError || !event) {
    notFound();
  }

  const { data: collectionItems } = await supabase
    .from("collection_items")
    .select("id, item_kind, card_name, set_name, condition, notes")
    .eq("user_id", user.id)
    .order("card_name", { ascending: true });

  const createListingForEvent = createListing.bind(null, event.id);

  return (
    <div className="flex flex-1 justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8">
        <div className="space-y-2">
          <Link
            href={`/events/${event.id}`}
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            ← Back to event
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Create Listing
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            for {event.name}
          </p>
        </div>

        {error ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <NewListingForm
          createListing={createListingForEvent}
          collectionItems={collectionItems ?? []}
        />
      </div>
    </div>
  );
}
