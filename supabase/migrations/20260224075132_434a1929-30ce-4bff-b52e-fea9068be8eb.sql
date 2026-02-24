-- Add variant_id and variant_label to order_items
ALTER TABLE public.order_items
  ADD COLUMN variant_id uuid REFERENCES public.product_variants(id),
  ADD COLUMN variant_label text;
