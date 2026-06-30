import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/ProfileForm";
import {
  formatMemberSince,
  type PublicUserProfile,
} from "@/lib/users";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const { error, updated } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select(
      "id, email, display_name, bio, location, favorite_pokemon, avatar_url, created_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  const userProfile = (profile ?? {
    id: user.id,
    email: user.email ?? "",
    display_name: null,
    bio: null,
    location: null,
    favorite_pokemon: null,
    avatar_url: null,
    created_at: user.created_at,
  }) as PublicUserProfile;

  return (
    <div className="flex flex-1 items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6 rounded-xl border border-zinc-200 p-8 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Update how other collectors see you on listings, matches, and
            messages.
          </p>
        </div>

        {updated === "1" ? (
          <p
            className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
            role="status"
          >
            Profile saved.
          </p>
        ) : null}

        {error ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {profileError ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            role="alert"
          >
            Could not load profile: {profileError.message}
          </p>
        ) : null}

        <dl className="space-y-4 text-sm">
          <div>
            <dt className="font-medium text-zinc-500 dark:text-zinc-400">
              Email
            </dt>
            <dd className="mt-1">{userProfile.email}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-500 dark:text-zinc-400">
              Public profile
            </dt>
            <dd className="mt-1">
              <Link
                href={`/users/${user.id}`}
                className="hover:underline"
              >
                View public profile
              </Link>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-500 dark:text-zinc-400">
              Member since
            </dt>
            <dd className="mt-1">
              {formatMemberSince(userProfile.created_at)}
            </dd>
          </div>
          {userProfile.avatar_url ? (
            <div>
              <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                Avatar preview
              </dt>
              <dd className="mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={userProfile.avatar_url}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover"
                />
              </dd>
            </div>
          ) : null}
        </dl>

        <ProfileForm profile={userProfile} />
      </div>
    </div>
  );
}
