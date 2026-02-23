
-- Add translation columns to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name_nl text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description_nl text;

-- Add translation columns to catalog_products
ALTER TABLE public.catalog_products ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE public.catalog_products ADD COLUMN IF NOT EXISTS name_nl text;
ALTER TABLE public.catalog_products ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE public.catalog_products ADD COLUMN IF NOT EXISTS description_nl text;

-- Add translation columns to product_categories
ALTER TABLE public.product_categories ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE public.product_categories ADD COLUMN IF NOT EXISTS name_nl text;
