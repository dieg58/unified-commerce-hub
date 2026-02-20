
-- Table for signup approval requests
CREATE TABLE public.signup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;

-- Shop managers can see & manage requests for their tenant
CREATE POLICY "sa_all" ON public.signup_requests FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "ta_manage" ON public.signup_requests FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'shop_manager'));

-- Users can view their own request
CREATE POLICY "user_view_own" ON public.signup_requests FOR SELECT
  USING (user_id = auth.uid());

-- Update handle_new_user trigger to auto-create signup_request when tenant_slug metadata is present
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tenant_slug text;
  _tenant_id uuid;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  _tenant_slug := NEW.raw_user_meta_data->>'tenant_slug';
  IF _tenant_slug IS NOT NULL AND _tenant_slug <> '' THEN
    SELECT id INTO _tenant_id FROM public.tenants WHERE slug = _tenant_slug LIMIT 1;
    IF _tenant_id IS NOT NULL THEN
      INSERT INTO public.signup_requests (user_id, tenant_id, email, full_name)
      VALUES (NEW.id, _tenant_id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
