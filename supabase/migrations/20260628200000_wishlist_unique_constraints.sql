-- Wishlist UX: prevent duplicate cards per user (official + manual).

DO $$
DECLARE
  official_dup_groups integer;
  manual_dup_groups integer;
BEGIN
  SELECT COUNT(*) INTO official_dup_groups
  FROM (
    SELECT user_id, tcg_api_card_id
    FROM public.wishlist_items
    WHERE tcg_api_card_id IS NOT NULL
    GROUP BY user_id, tcg_api_card_id
    HAVING COUNT(*) > 1
  ) duplicates;

  SELECT COUNT(*) INTO manual_dup_groups
  FROM (
    SELECT user_id, card_ref
    FROM public.wishlist_items
    WHERE tcg_api_card_id IS NULL
    GROUP BY user_id, card_ref
    HAVING COUNT(*) > 1
  ) duplicates;

  IF official_dup_groups > 0 OR manual_dup_groups > 0 THEN
    RAISE NOTICE
      'wishlist_items duplicates found: % official-card groups, % manual-card groups. Keeping earliest row per group.',
      official_dup_groups,
      manual_dup_groups;
  END IF;
END $$;

DELETE FROM public.wishlist_items
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, tcg_api_card_id
        ORDER BY created_at ASC, id ASC
      ) AS row_num
    FROM public.wishlist_items
    WHERE tcg_api_card_id IS NOT NULL
  ) ranked
  WHERE row_num > 1
);

DELETE FROM public.wishlist_items
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, card_ref
        ORDER BY created_at ASC, id ASC
      ) AS row_num
    FROM public.wishlist_items
    WHERE tcg_api_card_id IS NULL
  ) ranked
  WHERE row_num > 1
);

DO $$
DECLARE
  remaining_official_dup_groups integer;
  remaining_manual_dup_groups integer;
BEGIN
  SELECT COUNT(*) INTO remaining_official_dup_groups
  FROM (
    SELECT user_id, tcg_api_card_id
    FROM public.wishlist_items
    WHERE tcg_api_card_id IS NOT NULL
    GROUP BY user_id, tcg_api_card_id
    HAVING COUNT(*) > 1
  ) duplicates;

  SELECT COUNT(*) INTO remaining_manual_dup_groups
  FROM (
    SELECT user_id, card_ref
    FROM public.wishlist_items
    WHERE tcg_api_card_id IS NULL
    GROUP BY user_id, card_ref
    HAVING COUNT(*) > 1
  ) duplicates;

  IF remaining_official_dup_groups > 0 OR remaining_manual_dup_groups > 0 THEN
    RAISE EXCEPTION
      'Cannot add wishlist duplicate constraints: % official-card groups and % manual-card groups still remain after cleanup.',
      remaining_official_dup_groups,
      remaining_manual_dup_groups;
  END IF;
END $$;

CREATE UNIQUE INDEX wishlist_items_user_tcg_api_card_id_unique
  ON public.wishlist_items (user_id, tcg_api_card_id)
  WHERE tcg_api_card_id IS NOT NULL;

CREATE UNIQUE INDEX wishlist_items_user_card_ref_manual_unique
  ON public.wishlist_items (user_id, card_ref)
  WHERE tcg_api_card_id IS NULL;
