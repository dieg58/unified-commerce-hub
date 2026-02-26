ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_status_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_status_check CHECK (status IN ('active', 'inactive', 'demo', 'suspended'));