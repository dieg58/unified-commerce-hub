
-- Add Odoo sync columns to existing tables
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS odoo_order_id integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS odoo_order_status text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS odoo_synced_at timestamptz;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS odoo_partner_id integer;

-- Create invoices table (synced from Odoo)
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  odoo_invoice_id integer,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  amount_untaxed numeric NOT NULL DEFAULT 0,
  amount_tax numeric NOT NULL DEFAULT 0,
  amount_total numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'not_paid',
  odoo_pdf_url text,
  currency text NOT NULL DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all" ON public.invoices FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ta_manage" ON public.invoices FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'shop_manager'::app_role));

CREATE POLICY "tenant_select" ON public.invoices FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create Odoo sync log table
CREATE TABLE public.odoo_sync_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  sync_type text NOT NULL,
  direction text NOT NULL DEFAULT 'push',
  status text NOT NULL DEFAULT 'success',
  odoo_model text,
  odoo_record_id integer,
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.odoo_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all" ON public.odoo_sync_log FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ta_select" ON public.odoo_sync_log FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'shop_manager'::app_role));

CREATE INDEX idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX idx_odoo_sync_log_order_id ON public.odoo_sync_log(order_id);
CREATE INDEX idx_orders_odoo_order_id ON public.orders(odoo_order_id);
