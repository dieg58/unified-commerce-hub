
-- Add category and image_url to products
ALTER TABLE public.products ADD COLUMN category text NOT NULL DEFAULT 'general';
ALTER TABLE public.products ADD COLUMN image_url text;
ALTER TABLE public.products ADD COLUMN description text;

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- Anyone can view product images (public bucket)
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Authenticated users can upload product images
CREATE POLICY "Authenticated upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

-- Authenticated users can update their uploads
CREATE POLICY "Authenticated update product images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images');

-- Authenticated users can delete product images
CREATE POLICY "Authenticated delete product images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');
