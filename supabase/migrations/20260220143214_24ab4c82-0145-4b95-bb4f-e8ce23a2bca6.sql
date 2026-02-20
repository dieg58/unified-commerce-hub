-- Add per-product no-billing flags instead of per-tenant
ALTER TABLE public.products
  ADD COLUMN no_billing_bulk boolean NOT NULL DEFAULT false,
  ADD COLUMN no_billing_staff boolean NOT NULL DEFAULT false;

-- Remove tenant-level flags (no longer needed)
ALTER TABLE public.tenants
  DROP COLUMN no_product_billing_bulk,
  DROP COLUMN no_product_billing_staff;