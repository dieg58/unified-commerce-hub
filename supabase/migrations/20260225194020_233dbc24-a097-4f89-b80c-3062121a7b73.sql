
-- 1. Create platform_settings table
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all" ON public.platform_settings FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "anyone_select" ON public.platform_settings FOR SELECT
  USING (true);

-- 2. Create triggers for order notifications

-- Trigger: notify shop managers on new pending orders
CREATE OR REPLACE FUNCTION public.notify_on_pending_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('pending', 'pending_approval') THEN
    INSERT INTO public.notifications (tenant_id, type, title, body, link)
    VALUES (
      NEW.tenant_id,
      'order',
      'Nouvelle commande en attente',
      'Commande #' || LEFT(NEW.id::text, 8) || ' — ' || NEW.total || ' €',
      '/tenant/orders/' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_order_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_pending_order();

-- Trigger: notify order creator on status change  
CREATE OR REPLACE FUNCTION public.notify_on_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status NOT IN ('pending', 'pending_approval') THEN
    INSERT INTO public.notifications (user_id, tenant_id, type, title, body, link)
    VALUES (
      NEW.created_by,
      NEW.tenant_id,
      'order',
      'Commande #' || LEFT(NEW.id::text, 8) || ' — ' || NEW.status,
      'Votre commande a été mise à jour : ' || NEW.status,
      '/shop/orders'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_order_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_order_status_change();

-- Trigger: notify on signup request (already exists as function, just create trigger)
CREATE TRIGGER trg_notify_on_signup_request
  AFTER INSERT ON public.signup_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_signup_request();

-- Trigger: notify on low stock
CREATE TRIGGER trg_notify_on_low_stock
  AFTER UPDATE OF stock_qty ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_low_stock();
