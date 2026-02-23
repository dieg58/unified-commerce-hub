
-- Create stock movement type enum
CREATE TYPE public.stock_movement_type AS ENUM ('entry', 'exit', 'adjustment');

-- Create stock movements history table
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  movement_type public.stock_movement_type NOT NULL,
  quantity integer NOT NULL,
  previous_qty integer NOT NULL DEFAULT 0,
  new_qty integer NOT NULL DEFAULT 0,
  reason text,
  performed_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "sa_all" ON public.stock_movements FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ta_manage" ON public.stock_movements FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'shop_manager'::app_role));

CREATE POLICY "tenant_select" ON public.stock_movements FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "tenant_insert" ON public.stock_movements FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id, created_at DESC);
CREATE INDEX idx_stock_movements_tenant ON public.stock_movements(tenant_id, created_at DESC);
