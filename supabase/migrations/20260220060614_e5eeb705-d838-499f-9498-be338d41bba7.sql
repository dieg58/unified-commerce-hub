
-- Invitations table to track pending user invitations
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'employee',
  invited_by uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(tenant_id, email)
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all invitations
CREATE POLICY "sa_all" ON public.invitations FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Shop managers can manage invitations for their own tenant
CREATE POLICY "ta_manage" ON public.invitations FOR ALL
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND has_role(auth.uid(), 'shop_manager'::app_role)
  );

-- Tenant members can view invitations
CREATE POLICY "tenant_select" ON public.invitations FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));
