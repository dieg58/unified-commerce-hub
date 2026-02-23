
-- Fix profiles_email_leak: Replace overly permissive tenant_members_view_profiles
-- with role-restricted policies so only managers can view tenant profiles

DROP POLICY IF EXISTS "tenant_members_view_profiles" ON public.profiles;

-- Managers (shop_manager, dept_manager) can view profiles in their tenant
CREATE POLICY "managers_view_tenant_profiles" ON public.profiles
  FOR SELECT
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (has_role(auth.uid(), 'shop_manager') OR has_role(auth.uid(), 'dept_manager'))
  );
