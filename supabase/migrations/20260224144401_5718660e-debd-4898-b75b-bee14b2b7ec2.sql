
-- Add Midocean tracking columns to catalog_products
ALTER TABLE public.catalog_products
  ADD COLUMN IF NOT EXISTS midocean_id text,
  ADD COLUMN IF NOT EXISTS stock_qty integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamp with time zone;

-- Index for fast lookups by midocean_id
CREATE INDEX IF NOT EXISTS idx_catalog_products_midocean_id ON public.catalog_products(midocean_id);
