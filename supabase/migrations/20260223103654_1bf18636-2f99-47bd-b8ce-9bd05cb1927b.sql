
-- Add low_stock_threshold column to products table
ALTER TABLE public.products ADD COLUMN low_stock_threshold integer NOT NULL DEFAULT 0;
