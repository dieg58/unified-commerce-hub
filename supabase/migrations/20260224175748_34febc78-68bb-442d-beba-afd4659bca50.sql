
ALTER TABLE public.catalog_products
  ADD COLUMN IF NOT EXISTS is_new boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS release_date date NULL;
