
-- Add JSONB columns for variant colors and sizes
ALTER TABLE public.catalog_products
  ADD COLUMN IF NOT EXISTS variant_colors jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS variant_sizes jsonb DEFAULT '[]'::jsonb;

-- variant_colors: [{"color": "Blue", "hex": "#0000FF", "image_url": "https://..."}]
-- variant_sizes: ["S", "M", "L", "XL"]
