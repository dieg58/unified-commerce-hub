
-- Add requires_approval flag to entities
ALTER TABLE public.entities ADD COLUMN requires_approval boolean NOT NULL DEFAULT false;

-- Update existing entity_manager policy: allow entity_managers to update orders (approve/reject) in their tenant
CREATE POLICY "em_update_orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'entity_manager')
  );
