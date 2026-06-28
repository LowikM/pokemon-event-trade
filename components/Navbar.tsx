import Link from "next/link";

import { signOut } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Pokémon Event Trade
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link
                href="/my-collection"
                className="text-zinc-600 transition-colors hover:text-foreground dark:text-zinc-400"
              >
                My Collection
              </Link>
              <Link
                href="/my-listings"
                className="text-zinc-600 transition-colors hover:text-foreground dark:text-zinc-400"
              >
                My Listings
              </Link>
              <Link
                href="/profile"
                className="text-zinc-600 transition-colors hover:text-foreground dark:text-zinc-400"
              >
                Profile
              </Link>
              <span className="hidden text-zinc-500 sm:inline dark:text-zinc-400">
                {user.email}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-foreground px-3 py-1.5 font-medium text-background transition-opacity hover:opacity-90"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
