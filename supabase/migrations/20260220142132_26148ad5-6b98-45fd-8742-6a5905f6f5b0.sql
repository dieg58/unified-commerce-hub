-- Add per-store_type flag: when true, products are not re-invoiced (only shipping is billed)
ALTER TABLE public.tenants
  ADD COLUMN no_product_billing_bulk boolean NOT NULL DEFAULT false,
  ADD COLUMN no_product_billing_staff boolean NOT NULL DEFAULT false;