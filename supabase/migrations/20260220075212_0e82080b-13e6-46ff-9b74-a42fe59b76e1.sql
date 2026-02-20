
-- Add new columns to entities
ALTER TABLE public.entities ADD COLUMN vat_rate numeric NOT NULL DEFAULT 20;
ALTER TABLE public.entities ADD COLUMN payment_on_order boolean NOT NULL DEFAULT false;
