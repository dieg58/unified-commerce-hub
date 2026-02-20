
-- Add per-store-type activation and bulk minimum quantity
ALTER TABLE public.products
  ADD COLUMN active_bulk boolean NOT NULL DEFAULT true,
  ADD COLUMN active_staff boolean NOT NULL DEFAULT true,
  ADD COLUMN min_bulk_qty integer NOT NULL DEFAULT 1;

-- Migrate existing active flag: if product was active, enable both; if inactive, disable both
UPDATE public.products SET active_bulk = active, active_staff = active;
