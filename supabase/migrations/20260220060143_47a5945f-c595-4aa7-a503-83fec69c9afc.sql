-- Add FK from orders.created_by to profiles.id for PostgREST join support
ALTER TABLE public.orders
  ADD CONSTRAINT orders_created_by_profiles_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id);
