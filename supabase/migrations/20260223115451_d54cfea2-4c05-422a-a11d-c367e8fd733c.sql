
-- Create wishlist_items table
CREATE TABLE public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- Users can manage their own wishlist items
CREATE POLICY "Users can view own wishlist"
  ON public.wishlist_items FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can add to own wishlist"
  ON public.wishlist_items FOR INSERT
  WITH CHECK (user_id = auth.uid() AND tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can remove from own wishlist"
  ON public.wishlist_items FOR DELETE
  USING (user_id = auth.uid());

-- Super admin can manage all
CREATE POLICY "sa_all"
  ON public.wishlist_items FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));
