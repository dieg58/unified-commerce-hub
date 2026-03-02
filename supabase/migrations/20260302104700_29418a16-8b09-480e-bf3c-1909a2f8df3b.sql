
-- Table for multiple product images with ordering
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_product_images_product ON public.product_images(product_id);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- RLS policies matching products table pattern
CREATE POLICY "sa_all" ON public.product_images FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ta_manage" ON public.product_images FOR ALL
  USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'shop_manager'::app_role))
  WITH CHECK ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'shop_manager'::app_role));

CREATE POLICY "tenant_select" ON public.product_images FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));
