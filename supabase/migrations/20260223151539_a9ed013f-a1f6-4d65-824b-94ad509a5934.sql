
-- Add billing and shipping address references to orders
ALTER TABLE public.orders
ADD COLUMN billing_address_id uuid REFERENCES public.addresses(id),
ADD COLUMN shipping_address_id uuid REFERENCES public.addresses(id);
