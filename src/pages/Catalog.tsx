import TopBar from "@/components/TopBar";
import { SectionHeader } from "@/components/DashboardWidgets";
import { Package, Search, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mock-data";
import { StatusBadge } from "@/components/DashboardWidgets";

const Catalog = () => {
  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*, product_prices(store_type, currency, price), tenants(name)");
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <TopBar title="Catalog" subtitle="Manage products across stores" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          <div className="p-5 border-b border-border">
            <SectionHeader
              title={`Products (${products?.length || 0})`}
              action={
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Filter products…" className="pl-9 h-9 w-52 text-sm" />
                  </div>
                  <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />Add Product</Button>
                </div>
              }
            />
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !products?.length ? (
            <p className="p-12 text-center text-sm text-muted-foreground">No products yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5">
              {products.map((product, i) => {
                const prices = product.product_prices as any[];
                const tenant = product.tenants as any;
                const staffPrice = prices?.find((p: any) => p.store_type === "staff");
                const bulkPrice = prices?.find((p: any) => p.store_type === "bulk");
                return (
                  <div
                    key={product.id}
                    className="border border-border rounded-lg p-4 hover:shadow-card-hover transition-shadow cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="w-full h-28 bg-secondary rounded-md flex items-center justify-center mb-3">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{product.sku}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="space-y-0.5">
                        {bulkPrice && <p className="text-xs text-muted-foreground">Bulk: {formatCurrency(bulkPrice.price)}</p>}
                        {staffPrice && <p className="text-xs text-muted-foreground">Staff: {formatCurrency(staffPrice.price)}</p>}
                      </div>
                      <StatusBadge status={product.active ? "active" : "inactive"} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{tenant?.name}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Catalog;
