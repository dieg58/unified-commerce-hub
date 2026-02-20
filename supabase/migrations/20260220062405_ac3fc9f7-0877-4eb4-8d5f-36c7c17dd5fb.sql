
-- Create product_categories table
CREATE TABLE public.product_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

-- Enable RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all" ON public.product_categories FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "tenant_select" ON public.product_categories FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "ta_manage" ON public.product_categories FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'shop_manager'::app_role));

-- Index
CREATE INDEX idx_product_categories_tenant ON public.product_categories(tenant_id);
