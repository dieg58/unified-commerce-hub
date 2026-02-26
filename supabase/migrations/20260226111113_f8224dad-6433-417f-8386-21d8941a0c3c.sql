
-- Restructure demo_product_templates to link to catalog_products
ALTER TABLE demo_product_templates 
  ADD COLUMN catalog_product_id uuid REFERENCES catalog_products(id),
  ADD COLUMN logo_mode text NOT NULL DEFAULT 'light';

-- Remove hardcoded product fields (data comes from catalog now)
ALTER TABLE demo_product_templates 
  DROP COLUMN name,
  DROP COLUMN sku,
  DROP COLUMN base_image,
  DROP COLUMN category,
  DROP COLUMN price;
