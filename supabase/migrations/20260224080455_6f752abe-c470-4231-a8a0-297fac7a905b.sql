
-- Create product request status type
CREATE TYPE public.product_request_status AS ENUM (
  'requested', 'in_discussion', 'bat_sent', 'validated', 'added', 'rejected'
);

-- Create product requests table
CREATE TABLE public.product_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  catalog_product_id UUID NOT NULL REFERENCES public.catalog_products(id),
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  status product_request_status NOT NULL DEFAULT 'requested',
  note TEXT,
  admin_note TEXT,
  created_product_id UUID REFERENCES public.products(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_requests ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "sa_all" ON public.product_requests
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Shop managers can view their tenant's requests
CREATE POLICY "ta_select" ON public.product_requests
  FOR SELECT USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND has_role(auth.uid(), 'shop_manager'::app_role)
  );

-- Shop managers can insert requests for their tenant
CREATE POLICY "ta_insert" ON public.product_requests
  FOR INSERT WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND requested_by = auth.uid()
    AND has_role(auth.uid(), 'shop_manager'::app_role)
  );

-- Trigger for updated_at
CREATE TRIGGER update_product_requests_updated_at
  BEFORE UPDATE ON public.product_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
