-- Listing interests: one row per user per listing.

CREATE TABLE public.listing_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_interests_listing_user_unique UNIQUE (listing_id, user_id)
);

CREATE INDEX listing_interests_listing_id_idx
  ON public.listing_interests (listing_id);

CREATE INDEX listing_interests_user_id_idx
  ON public.listing_interests (user_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'interests'
  ) THEN
    INSERT INTO public.listing_interests (listing_id, user_id, created_at)
    SELECT listing_id, user_id, created_at
    FROM public.interests
    ON CONFLICT (listing_id, user_id) DO NOTHING;

    DROP TABLE public.interests;
  END IF;
END $$;

ALTER TABLE public.listing_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own interest"
  ON public.listing_interests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interest"
  ON public.listing_interests
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own interests"
  ON public.listing_interests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Listing owners can view interests on their listings"
  ON public.listing_interests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.listings
      WHERE listings.id = listing_interests.listing_id
        AND listings.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view interests on active listings"
  ON public.listing_interests
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.listings
      WHERE listings.id = listing_interests.listing_id
        AND listings.status = 'active'
    )
  );

GRANT SELECT ON public.listing_interests TO anon, authenticated;
GRANT INSERT, DELETE ON public.listing_interests TO authenticated;
