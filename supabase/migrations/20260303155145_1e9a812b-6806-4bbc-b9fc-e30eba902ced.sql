
ALTER TABLE public.tenant_branding
ADD COLUMN product_logo_url text,
ADD COLUMN product_logo_mode text NOT NULL DEFAULT 'light';
