
-- Fix ta_manage policies: add WITH CHECK clauses to prevent cross-tenant writes
-- This ensures shop_managers can only INSERT/UPDATE within their own tenant

-- addresses
DROP POLICY IF EXISTS "ta_manage" ON public.addresses;
CREATE POLICY "ta_manage" ON public.addresses FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'));

-- billing_profiles
DROP POLICY IF EXISTS "ta_manage" ON public.billing_profiles;
CREATE POLICY "ta_manage" ON public.billing_profiles FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'));

-- budgets
DROP POLICY IF EXISTS "ta_manage" ON public.budgets;
CREATE POLICY "ta_manage" ON public.budgets FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'));

-- discount_codes
DROP POLICY IF EXISTS "ta_manage" ON public.discount_codes;
CREATE POLICY "ta_manage" ON public.discount_codes FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'));

-- entities
DROP POLICY IF EXISTS "ta_manage" ON public.entities;
CREATE POLICY "ta_manage" ON public.entities FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'));

-- invitations
DROP POLICY IF EXISTS "ta_manage" ON public.invitations;
CREATE POLICY "ta_manage" ON public.invitations FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'));

-- invoices
DROP POLICY IF EXISTS "ta_manage" ON public.invoices;
CREATE POLICY "ta_manage" ON public.invoices FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'));

-- product_categories
DROP POLICY IF EXISTS "ta_manage" ON public.product_categories;
CREATE POLICY "ta_manage" ON public.product_categories FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'));

-- product_prices
DROP POLICY IF EXISTS "ta_manage" ON public.product_prices;
CREATE POLICY "ta_manage" ON public.product_prices FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'));

-- product_variants
DROP POLICY IF EXISTS "ta_manage" ON public.product_variants;
CREATE POLICY "ta_manage" ON public.product_variants FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'));

-- products
DROP POLICY IF EXISTS "ta_manage" ON public.products;
CREATE POLICY "ta_manage" ON public.products FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'));

-- shipments
DROP POLICY IF EXISTS "ta_manage" ON public.shipments;
CREATE POLICY "ta_manage" ON public.shipments FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'));

-- signup_requests
DROP POLICY IF EXISTS "ta_manage" ON public.signup_requests;
CREATE POLICY "ta_manage" ON public.signup_requests FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'));

-- tenant_branding
DROP POLICY IF EXISTS "ta_manage" ON public.tenant_branding;
CREATE POLICY "ta_manage" ON public.tenant_branding FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'));

-- tenant_catalog_selections
DROP POLICY IF EXISTS "ta_manage" ON public.tenant_catalog_selections;
CREATE POLICY "ta_manage" ON public.tenant_catalog_selections FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'));

-- tenant_shipping
DROP POLICY IF EXISTS "ta_manage" ON public.tenant_shipping;
CREATE POLICY "ta_manage" ON public.tenant_shipping FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'));

-- user_budgets
DROP POLICY IF EXISTS "ta_manage" ON public.user_budgets;
CREATE POLICY "ta_manage" ON public.user_budgets FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'));

-- stock_movements
DROP POLICY IF EXISTS "ta_manage" ON public.stock_movements;
CREATE POLICY "ta_manage" ON public.stock_movements FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'shop_manager'));
