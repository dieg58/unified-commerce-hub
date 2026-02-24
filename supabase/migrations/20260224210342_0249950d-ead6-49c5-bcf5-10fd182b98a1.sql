DROP INDEX IF EXISTS catalog_products_midocean_id_unique;
ALTER TABLE public.catalog_products ADD CONSTRAINT catalog_products_midocean_id_key UNIQUE (midocean_id);