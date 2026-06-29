type ListingCardThumbnailProps = {
  imageUrl: string | null;
  cardName: string;
};

type ListingOfficialCardBadgesProps = {
  tcgApiCardId: string | null;
  cardNumber: string | null;
};

const badgeClassName =
  "rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";

export function ListingCardThumbnail({
  imageUrl,
  cardName,
}: ListingCardThumbnailProps) {
  if (!imageUrl) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Pokémon TCG API images are external and not stored in DB
    <img
      src={imageUrl}
      alt={cardName}
      width={56}
      height={78}
      className="h-[4.875rem] w-14 shrink-0 rounded object-contain"
    />
  );
}

export function ListingOfficialCardBadges({
  tcgApiCardId,
  cardNumber,
}: ListingOfficialCardBadgesProps) {
  if (!tcgApiCardId && !cardNumber) {
    return null;
  }

  return (
    <>
      {tcgApiCardId ? (
        <span className={badgeClassName}>Official card</span>
      ) : null}
      {cardNumber ? <span className={badgeClassName}>#{cardNumber}</span> : null}
    </>
  );
}
