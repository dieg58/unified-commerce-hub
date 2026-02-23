
-- Add stock quantity and storage location to products (used when no variants)
ALTER TABLE public.products ADD COLUMN stock_qty integer NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN location text;

-- Add stock quantity and storage location to product_variants (used per variant)
ALTER TABLE public.product_variants ADD COLUMN stock_qty integer NOT NULL DEFAULT 0;
ALTER TABLE public.product_variants ADD COLUMN location text;
