import Link from "next/link";

import {
  addInterest,
  removeInterest,
} from "@/app/listing-interests/actions";
import { formatInterestCount } from "@/lib/listing-interests";

type ListingInterestProps = {
  listingId: string;
  listingOwnerId: string;
  currentUserId: string | null;
  isInterested: boolean;
  interestCount: number;
};

const buttonClassName =
  "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900";

export function ListingInterest({
  listingId,
  listingOwnerId,
  currentUserId,
  isInterested,
  interestCount,
}: ListingInterestProps) {
  const isOwner = currentUserId === listingOwnerId;

  if (isOwner) {
    return interestCount > 0 ? (
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        {formatInterestCount(interestCount)}
      </p>
    ) : null;
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      {interestCount > 0 ? (
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {formatInterestCount(interestCount)}
        </span>
      ) : null}

      {isInterested ? (
        <form action={removeInterest.bind(null, listingId)}>
          <button type="submit" className={buttonClassName}>
            ✓ Interested
          </button>
        </form>
      ) : currentUserId ? (
        <form action={addInterest.bind(null, listingId)}>
          <button type="submit" className={buttonClassName}>
            ❤️ I&apos;m interested
          </button>
        </form>
      ) : (
        <Link href="/login" className={buttonClassName}>
          ❤️ I&apos;m interested
        </Link>
      )}
    </div>
  );
}
