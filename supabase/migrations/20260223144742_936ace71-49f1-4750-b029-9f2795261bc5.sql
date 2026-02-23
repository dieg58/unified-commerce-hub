ALTER TABLE public.product_prices 
ADD CONSTRAINT product_prices_product_store_tenant_unique 
UNIQUE (product_id, store_type, tenant_id);