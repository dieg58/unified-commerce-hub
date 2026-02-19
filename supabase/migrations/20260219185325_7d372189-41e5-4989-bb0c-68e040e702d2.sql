
-- 1. tenant_branding: tenant_admin can manage their tenant's branding
CREATE POLICY "ta_manage" ON public.tenant_branding
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'tenant_admin'));

-- 2. orders: tenant_admin can update orders in their tenant (approve/reject)
CREATE POLICY "ta_update_orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'tenant_admin'));

-- 3. profiles: all tenant members (staff included) can see profiles in their tenant
DROP POLICY "Tenant admins can view tenant profiles" ON public.profiles;
CREATE POLICY "tenant_members_view_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- 4. tenants: tenant_admin can update their own tenant record
CREATE POLICY "ta_update_tenant" ON public.tenants
  FOR UPDATE TO authenticated
  USING (id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'tenant_admin'));
