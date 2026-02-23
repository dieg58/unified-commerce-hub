
-- Notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id),
  user_id uuid REFERENCES public.profiles(id),
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Super admins see all (tenant_id IS NULL = platform-wide)
CREATE POLICY "sa_all" ON public.notifications FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Tenant users see their tenant notifications or personal ones
CREATE POLICY "tenant_select" ON public.notifications FOR SELECT
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    OR user_id = auth.uid()
  );

-- Users can mark their own as read
CREATE POLICY "user_update_read" ON public.notifications FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    OR user_id = auth.uid()
  );

-- Index
CREATE INDEX idx_notifications_tenant ON public.notifications(tenant_id, read, created_at DESC);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ========================================
-- Trigger: auto-notify on new pending order
-- ========================================
CREATE OR REPLACE FUNCTION public.notify_on_pending_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('pending', 'pending_approval') THEN
    INSERT INTO public.notifications (tenant_id, type, title, body, link)
    VALUES (
      NEW.tenant_id,
      'order',
      'Nouvelle commande en attente',
      'Commande #' || LEFT(NEW.id::text, 8) || ' — ' || NEW.total || ' €',
      '/orders/' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_pending_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_pending_order();

-- ========================================
-- Trigger: auto-notify on new signup request
-- ========================================
CREATE OR REPLACE FUNCTION public.notify_on_signup_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (tenant_id, type, title, body, link)
  VALUES (
    NEW.tenant_id,
    'signup',
    'Nouvelle demande d''inscription',
    NEW.full_name || ' (' || NEW.email || ')',
    '/tenant/users'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_signup_request
  AFTER INSERT ON public.signup_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_signup_request();

-- ========================================
-- Trigger: auto-notify on low stock
-- ========================================
CREATE OR REPLACE FUNCTION public.notify_on_low_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.low_stock_threshold > 0
    AND NEW.stock_qty <= NEW.low_stock_threshold
    AND (OLD.stock_qty > OLD.low_stock_threshold OR OLD.stock_qty IS DISTINCT FROM NEW.stock_qty)
  THEN
    INSERT INTO public.notifications (tenant_id, type, title, body, link)
    VALUES (
      NEW.tenant_id,
      'stock',
      'Stock bas — ' || NEW.name,
      'Stock actuel : ' || NEW.stock_qty || ' (seuil : ' || NEW.low_stock_threshold || ')',
      '/tenant/products'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_low_stock
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_low_stock();
