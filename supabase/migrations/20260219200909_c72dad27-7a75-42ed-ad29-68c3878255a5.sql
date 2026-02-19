
-- Rename app_role enum values
ALTER TYPE public.app_role RENAME VALUE 'tenant_admin' TO 'shop_manager';
ALTER TYPE public.app_role RENAME VALUE 'entity_manager' TO 'dept_manager';
ALTER TYPE public.app_role RENAME VALUE 'staff' TO 'employee';
