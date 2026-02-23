-- Fix: Make sa_all policies PERMISSIVE on orders and related tables so super_admin can access all data
-- (Restrictive policies require ALL to pass; permissive require at least ONE to pass)

-- orders
DROP POLICY IF EXISTS "sa_all" ON public.orders;
CREATE POLICY "sa_all" ON public.orders FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- order_items
DROP POLICY IF EXISTS "sa_all" ON public.order_items;
CREATE POLICY "sa_all" ON public.order_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- profiles
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
CREATE POLICY "Super admins can manage all profiles" ON public.profiles FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- tenants
DROP POLICY IF EXISTS "Super admins can manage all tenants" ON public.tenants;
CREATE POLICY "Super admins can manage all tenants" ON public.tenants FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- entities
DROP POLICY IF EXISTS "sa_all" ON public.entities;
CREATE POLICY "sa_all" ON public.entities FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- products
DROP POLICY IF EXISTS "sa_all" ON public.products;
CREATE POLICY "sa_all" ON public.products FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- shipments
DROP POLICY IF EXISTS "sa_all" ON public.shipments;
CREATE POLICY "sa_all" ON public.shipments FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- invoices
DROP POLICY IF EXISTS "sa_all" ON public.invoices;
CREATE POLICY "sa_all" ON public.invoices FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- notifications
DROP POLICY IF EXISTS "sa_all" ON public.notifications;
CREATE POLICY "sa_all" ON public.notifications FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- addresses
DROP POLICY IF EXISTS "sa_all" ON public.addresses;
CREATE POLICY "sa_all" ON public.addresses FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- budgets
DROP POLICY IF EXISTS "sa_all" ON public.budgets;
CREATE POLICY "sa_all" ON public.budgets FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- user_budgets
DROP POLICY IF EXISTS "sa_all" ON public.user_budgets;
CREATE POLICY "sa_all" ON public.user_budgets FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- discount_codes
DROP POLICY IF EXISTS "sa_all" ON public.discount_codes;
CREATE POLICY "sa_all" ON public.discount_codes FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- invitations
DROP POLICY IF EXISTS "sa_all" ON public.invitations;
CREATE POLICY "sa_all" ON public.invitations FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- email_logs
DROP POLICY IF EXISTS "sa_all" ON public.email_logs;
CREATE POLICY "sa_all" ON public.email_logs FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- odoo_sync_log
DROP POLICY IF EXISTS "sa_all" ON public.odoo_sync_log;
CREATE POLICY "sa_all" ON public.odoo_sync_log FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- tenant_branding
DROP POLICY IF EXISTS "sa_all" ON public.tenant_branding;
CREATE POLICY "sa_all" ON public.tenant_branding FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- tenant_catalog_selections
DROP POLICY IF EXISTS "sa_all" ON public.tenant_catalog_selections;
CREATE POLICY "sa_all" ON public.tenant_catalog_selections FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- tenant_shipping
DROP POLICY IF EXISTS "sa_all" ON public.tenant_shipping;
CREATE POLICY "sa_all" ON public.tenant_shipping FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- product_variants
DROP POLICY IF EXISTS "sa_all" ON public.product_variants;
CREATE POLICY "sa_all" ON public.product_variants FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- product_prices
DROP POLICY IF EXISTS "sa_all" ON public.product_prices;
CREATE POLICY "sa_all" ON public.product_prices FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- product_categories
DROP POLICY IF EXISTS "sa_all" ON public.product_categories;
CREATE POLICY "sa_all" ON public.product_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- stock_movements
DROP POLICY IF EXISTS "sa_all" ON public.stock_movements;
CREATE POLICY "sa_all" ON public.stock_movements FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- signup_requests
DROP POLICY IF EXISTS "sa_all" ON public.signup_requests;
CREATE POLICY "sa_all" ON public.signup_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- user_roles
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
CREATE POLICY "Super admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- billing_profiles
DROP POLICY IF EXISTS "sa_all" ON public.billing_profiles;
CREATE POLICY "sa_all" ON public.billing_profiles FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- wishlist_items
DROP POLICY IF EXISTS "sa_all" ON public.wishlist_items;
CREATE POLICY "sa_all" ON public.wishlist_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- catalog_products
DROP POLICY IF EXISTS "sa_all" ON public.catalog_products;
CREATE POLICY "sa_all" ON public.catalog_products FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- email_templates
DROP POLICY IF EXISTS "sa_all" ON public.email_templates;
CREATE POLICY "sa_all" ON public.email_templates FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));