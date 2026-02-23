
-- Shipping configuration per tenant
CREATE TABLE public.tenant_shipping (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'none', -- 'none' | 'fixed' | 'threshold' | 'per_store_type'
  fixed_amount numeric NOT NULL DEFAULT 0,
  threshold_amount numeric NOT NULL DEFAULT 0, -- free shipping above this
  threshold_fee numeric NOT NULL DEFAULT 0,    -- fee below threshold
  bulk_fee numeric NOT NULL DEFAULT 0,
  staff_fee numeric NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id)
);

-- RLS
ALTER TABLE public.tenant_shipping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all" ON public.tenant_shipping FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "ta_manage" ON public.tenant_shipping FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'shop_manager'::app_role));
CREATE POLICY "tenant_select" ON public.tenant_shipping FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
