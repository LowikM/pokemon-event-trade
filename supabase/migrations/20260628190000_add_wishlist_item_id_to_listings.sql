-- Activate wishlist for event: link want listings to wishlist items.

ALTER TABLE public.listings
ADD COLUMN wishlist_item_id uuid REFERENCES public.wishlist_items (id) ON DELETE SET NULL;

CREATE INDEX listings_wishlist_item_id_idx
  ON public.listings (wishlist_item_id);

CREATE UNIQUE INDEX listings_one_active_want_per_wishlist_event
  ON public.listings (event_id, wishlist_item_id)
  WHERE type = 'want'
    AND status = 'active'
    AND wishlist_item_id IS NOT NULL;
