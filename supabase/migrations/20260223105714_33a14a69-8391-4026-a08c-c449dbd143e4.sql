
-- Create shipments table
CREATE TABLE public.shipments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  tracking_number text,
  carrier text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'preparing',
  shipped_at timestamp with time zone,
  delivered_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "sa_all" ON public.shipments FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ta_manage" ON public.shipments FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'shop_manager'::app_role));

CREATE POLICY "tenant_select" ON public.shipments FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX idx_shipments_tenant_id ON public.shipments(tenant_id);
