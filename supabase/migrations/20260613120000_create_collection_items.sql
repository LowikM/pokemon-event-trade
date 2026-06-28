-- My Collection — step 1
-- Creates collection_item_kind enum, collection_items table, listings FK,
-- RLS policies, indexes, and updated_at trigger.

-- ---------------------------------------------------------------------------
-- Enum
-- ---------------------------------------------------------------------------

CREATE TYPE public.collection_item_kind AS ENUM ('card', 'sealed');

-- ---------------------------------------------------------------------------
-- Table: collection_items
-- ---------------------------------------------------------------------------

CREATE TABLE public.collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  item_kind public.collection_item_kind NOT NULL,
  card_name text NOT NULL,
  card_ref text NOT NULL,
  set_name text,
  condition text,
  notes text,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Listings: optional link to source collection item
-- ---------------------------------------------------------------------------

ALTER TABLE public.listings
ADD COLUMN collection_item_id uuid REFERENCES public.collection_items (id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX collection_items_user_id_idx
  ON public.collection_items (user_id);

CREATE INDEX collection_items_user_card_ref_idx
  ON public.collection_items (user_id, card_ref);

CREATE INDEX listings_collection_item_id_idx
  ON public.listings (collection_item_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER collection_items_set_updated_at
BEFORE UPDATE ON public.collection_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own collection items"
  ON public.collection_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collection items"
  ON public.collection_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collection items"
  ON public.collection_items
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collection items"
  ON public.collection_items
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Grants (authenticated users rely on RLS above)
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_items TO authenticated;
