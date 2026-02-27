
CREATE TABLE public.product_price_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  min_qty integer NOT NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, tenant_id, min_qty)
);

ALTER TABLE public.product_price_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all" ON public.product_price_tiers FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ta_manage" ON public.product_price_tiers FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'shop_manager'::app_role))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'shop_manager'::app_role));

CREATE POLICY "tenant_select" ON public.product_price_tiers FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));
