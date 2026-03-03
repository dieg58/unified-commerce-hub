ALTER TABLE public.catalog_products
  ADD COLUMN IF NOT EXISTS product_family text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';