
-- 1. Discount codes / gift cards table
CREATE TABLE public.discount_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed', 'gift_card')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  min_order_amount NUMERIC DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  store_scope TEXT NOT NULL DEFAULT 'both' CHECK (store_scope IN ('bulk', 'staff', 'both')),
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all" ON public.discount_codes FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ta_manage" ON public.discount_codes FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'shop_manager'::app_role));

CREATE POLICY "tenant_select" ON public.discount_codes FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- 2. User budgets table (per user within entity)
CREATE TABLE public.user_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  spent NUMERIC NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly', 'quarterly', 'yearly')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, entity_id, user_id)
);

ALTER TABLE public.user_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all" ON public.user_budgets FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ta_manage" ON public.user_budgets FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'shop_manager'::app_role));

CREATE POLICY "user_view_own" ON public.user_budgets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "tenant_select" ON public.user_budgets FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- 3. Global catalog products (managed by Inkoo/super_admin)
CREATE TABLE public.catalog_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  image_url TEXT,
  base_price NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all" ON public.catalog_products FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "anyone_can_view" ON public.catalog_products FOR SELECT
  USING (true);

-- 4. Tenant catalog selections (which global products a tenant has activated)
CREATE TABLE public.tenant_catalog_selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  catalog_product_id UUID NOT NULL REFERENCES public.catalog_products(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, catalog_product_id)
);

ALTER TABLE public.tenant_catalog_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all" ON public.tenant_catalog_selections FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ta_manage" ON public.tenant_catalog_selections FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'shop_manager'::app_role));

CREATE POLICY "tenant_select" ON public.tenant_catalog_selections FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- 5. Trigger for user_budgets updated_at
CREATE TRIGGER update_user_budgets_updated_at
  BEFORE UPDATE ON public.user_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
