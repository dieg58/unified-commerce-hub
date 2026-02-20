
-- Add stock type to products
CREATE TYPE public.stock_type AS ENUM ('in_stock', 'made_to_order');

ALTER TABLE public.products
  ADD COLUMN stock_type public.stock_type NOT NULL DEFAULT 'in_stock';

-- Product variants table
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  variant_label text NOT NULL,  -- e.g. "Couleur", "Taille"
  variant_value text NOT NULL,  -- e.g. "Rouge", "XL"
  sku_suffix text,              -- appended to product SKU e.g. "-RED-XL"
  price_adjustment numeric NOT NULL DEFAULT 0,  -- +/- from base price
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all" ON public.product_variants FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "tenant_select" ON public.product_variants FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "ta_manage" ON public.product_variants FOR ALL
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND has_role(auth.uid(), 'shop_manager'::app_role)
  );

-- Index for fast lookups
CREATE INDEX idx_product_variants_product ON public.product_variants(product_id);
