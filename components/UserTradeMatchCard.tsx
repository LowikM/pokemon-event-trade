import Link from "next/link";

import { SendMessageForm } from "@/components/SendMessageForm";
import { UserProfileLink } from "@/components/UserProfileLink";
import {
  ListingCardThumbnail,
  ListingOfficialCardBadges,
} from "@/components/ListingOfficialCard";
import {
  formatIHaveSummary,
  formatTheyHaveSummary,
  getMatchCategoryDescription,
  MATCH_CATEGORY_LABELS,
  type MatchedCard,
  type UserTradeMatch,
} from "@/lib/listing-matches";

type UserTradeMatchCardProps = {
  match: UserTradeMatch;
  cardImagesById: Map<string, { small: string; large: string }>;
};

const TYPE_LABELS = {
  want: "Want",
  trade: "Trade",
  sale: "Sale",
} as const;

const badgeClassName =
  "rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";

function MatchedCardRow({
  card,
  imageUrl,
}: {
  card: MatchedCard;
  imageUrl: string | null;
}) {
  return (
    <li className="flex gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
      <ListingCardThumbnail imageUrl={imageUrl} cardName={card.cardName} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={badgeClassName}>{TYPE_LABELS[card.listingType]}</span>
          <ListingOfficialCardBadges
            tcgApiCardId={card.tcgApiCardId}
            cardNumber={card.cardNumber}
          />
          <span className="text-sm font-medium">{card.cardName}</span>
        </div>
        {card.setName ? (
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Set: {card.setName}
          </p>
        ) : null}
        {card.language ? (
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Language: {card.language}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function MatchedCardSection({
  title,
  cards,
  cardImagesById,
}: {
  title: string;
  cards: MatchedCard[];
  cardImagesById: Map<string, { small: string; large: string }>;
}) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <details className="group rounded-lg border border-zinc-200 dark:border-zinc-800">
      <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span className="text-zinc-500 transition-transform group-open:rotate-180 dark:text-zinc-400">
            ▼
          </span>
          {title}
          <span className="font-normal text-zinc-600 dark:text-zinc-400">
            ({cards.length})
          </span>
        </span>
      </summary>
      <ul className="space-y-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
        {cards.map((card) => (
          <MatchedCardRow
            key={card.cardKey}
            card={card}
            imageUrl={
              card.tcgApiCardId
                ? (cardImagesById.get(card.tcgApiCardId)?.small ?? null)
                : null
            }
          />
        ))}
      </ul>
    </details>
  );
}

export function UserTradeMatchCard({
  match,
  cardImagesById,
}: UserTradeMatchCardProps) {
  return (
    <article className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start gap-2">
          <span className={badgeClassName}>
            {MATCH_CATEGORY_LABELS[match.category]}
          </span>
        </div>

        <dl className="space-y-2 text-sm">
          <div>
            <dt className="font-medium text-zinc-500 dark:text-zinc-400">
              Event
            </dt>
            <dd>
              <Link
                href={`/events/${match.eventId}`}
                className="hover:underline"
              >
                {match.eventName}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-500 dark:text-zinc-400">
              Other user
            </dt>
            <dd>
              {match.otherUser ? (
                <UserProfileLink
                  userId={match.otherUserId}
                  user={match.otherUser}
                />
              ) : (
                "Unknown user"
              )}
            </dd>
          </div>
        </dl>

        <div className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
          <p>{getMatchCategoryDescription(match)}</p>
          {match.theyHaveCount > 0 ? (
            <p>{formatTheyHaveSummary(match.theyHaveCount)}</p>
          ) : null}
          {match.iHaveCount > 0 ? (
            <p>{formatIHaveSummary(match.iHaveCount)}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <MatchedCardSection
            title="They have for you"
            cards={match.theyHaveForMe}
            cardImagesById={cardImagesById}
          />
          <MatchedCardSection
            title="You have for them"
            cards={match.iHaveForThem}
            cardImagesById={cardImagesById}
          />
          <SendMessageForm recipientId={match.otherUserId} />
        </div>
      </div>
    </article>
  );
}
