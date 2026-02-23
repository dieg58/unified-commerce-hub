
-- Add shipping entity to orders (billing entity remains in entity_id)
ALTER TABLE public.orders
ADD COLUMN shipping_entity_id uuid REFERENCES public.entities(id);

-- Default shipping_entity_id to entity_id for existing orders
UPDATE public.orders SET shipping_entity_id = entity_id WHERE shipping_entity_id IS NULL;
