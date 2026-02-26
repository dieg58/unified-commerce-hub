
-- Table des templates de produits démo (globale, pas par tenant)
CREATE TABLE public.demo_product_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text NOT NULL,
  base_image text NOT NULL,
  category text NOT NULL DEFAULT 'textile',
  price numeric NOT NULL DEFAULT 0,
  logo_x numeric NOT NULL DEFAULT 25,
  logo_y numeric NOT NULL DEFAULT 30,
  logo_width numeric NOT NULL DEFAULT 15,
  logo_rotation numeric NOT NULL DEFAULT 0,
  logo_blend text NOT NULL DEFAULT 'multiply',
  logo_opacity numeric NOT NULL DEFAULT 0.9,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.demo_product_templates ENABLE ROW LEVEL SECURITY;

-- SELECT pour tous les authentifiés
CREATE POLICY "authenticated_select" ON public.demo_product_templates
  FOR SELECT TO authenticated USING (true);

-- ALL pour super_admin
CREATE POLICY "sa_all" ON public.demo_product_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Ajouter logo_placement jsonb à products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS logo_placement jsonb;

-- Pré-insérer les 20 produits démo avec placements adaptés
INSERT INTO public.demo_product_templates (name, sku, base_image, category, price, logo_x, logo_y, logo_width, logo_rotation, logo_blend, logo_opacity, sort_order) VALUES
  ('T-Shirt Classic', 'DEMO-TSHIRT', 'tshirt.jpg', 'textile', 12.50, 30, 28, 12, 0, 'multiply', 0.85, 1),
  ('Polo Premium', 'DEMO-POLO', 'polo.jpg', 'textile', 24.90, 30, 28, 10, 0, 'multiply', 0.85, 2),
  ('Hoodie Confort', 'DEMO-HOODIE', 'hoodie.jpg', 'textile', 35.00, 30, 30, 14, 0, 'multiply', 0.85, 3),
  ('Veste Softshell', 'DEMO-JACKET', 'jacket.jpg', 'textile', 45.00, 28, 25, 10, 0, 'multiply', 0.85, 4),
  ('Casquette Brodée', 'DEMO-CAP', 'cap.jpg', 'accessories', 9.90, 40, 35, 20, 0, 'multiply', 0.9, 5),
  ('Tablier Pro', 'DEMO-APRON', 'apron.jpg', 'textile', 18.00, 40, 25, 15, 0, 'multiply', 0.85, 6),
  ('Badge Nominatif', 'DEMO-BADGE', 'badge.jpg', 'accessories', 3.50, 35, 30, 25, 0, 'normal', 0.9, 7),
  ('Sac à Dos', 'DEMO-BAG', 'bag.jpg', 'bags', 22.00, 38, 35, 15, 0, 'multiply', 0.85, 8),
  ('Gourde Isotherme', 'DEMO-BOTTLE', 'bottle.jpg', 'drinkware', 15.00, 40, 40, 18, 0, 'multiply', 0.85, 9),
  ('Tote Bag', 'DEMO-TOTEBAG', 'totebag.jpg', 'bags', 8.50, 35, 35, 25, 0, 'multiply', 0.85, 10),
  ('Mug Céramique', 'DEMO-MUG', 'mug.jpg', 'drinkware', 7.90, 45, 40, 20, 0, 'multiply', 0.85, 11),
  ('Carnet A5', 'DEMO-NOTEBOOK', 'notebook.jpg', 'stationery', 6.50, 55, 60, 18, 0, 'multiply', 0.85, 12),
  ('Stylo Métal', 'DEMO-PEN', 'pen.jpg', 'stationery', 4.20, 45, 45, 10, 0, 'multiply', 0.8, 13),
  ('Lanyard', 'DEMO-LANYARD', 'lanyard.jpg', 'accessories', 2.80, 40, 40, 15, 0, 'normal', 0.9, 14),
  ('T-Shirt Col V', 'DEMO-TSHIRT-V', 'tshirt.jpg', 'textile', 13.50, 30, 28, 12, 0, 'multiply', 0.85, 15),
  ('Polo Femme', 'DEMO-POLO-F', 'polo.jpg', 'textile', 24.90, 30, 28, 10, 0, 'multiply', 0.85, 16),
  ('Hoodie Zip', 'DEMO-HOODIE-Z', 'hoodie.jpg', 'textile', 38.00, 28, 28, 12, 0, 'multiply', 0.85, 17),
  ('Mug XL', 'DEMO-MUG-XL', 'mug.jpg', 'drinkware', 9.90, 45, 40, 22, 0, 'multiply', 0.85, 18),
  ('Stylo Bille', 'DEMO-PEN-B', 'pen.jpg', 'stationery', 2.50, 45, 45, 10, 0, 'multiply', 0.8, 19),
  ('Sac Shopping', 'DEMO-BAG-S', 'totebag.jpg', 'bags', 11.00, 35, 35, 25, 0, 'multiply', 0.85, 20);
