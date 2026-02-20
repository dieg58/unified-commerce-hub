ALTER TABLE public.addresses
  ADD COLUMN postal_code text NOT NULL DEFAULT '',
  ADD COLUMN phone text NOT NULL DEFAULT '',
  ADD COLUMN contact_name text NOT NULL DEFAULT '';