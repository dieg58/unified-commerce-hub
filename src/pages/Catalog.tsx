import { useState } from "react";
import TopBar from "@/components/TopBar";
import { SectionHeader, StatusBadge } from "@/components/DashboardWidgets";
import { Package, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mock-data";

const Catalog = () => {
  const [search, setSearch] = useState("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*, product_prices(store_type, currency, price), tenants(name)");
      if (error) throw error;
      return data;
    },
  });

  const filtered = products?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <TopBar title="Catalogue" subtitle="Tous les produits de la plateforme" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          <div className="p-5 border-b border-border">
            <SectionHeader
              title={`Produits (${filtered?.length || 0})`}
              action={
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 w-52 text-sm" />
                </div>
              }
            />
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !filtered?.length ? (
            <p className="p-12 text-center text-sm text-muted-foreground">{search ? "Aucun produit trouvé" : "Aucun produit"}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5">
              {filtered.map((product, i) => {
                const prices = product.product_prices as any[];
                const tenant = product.tenants as any;
                const staffPrice = prices?.find((p: any) => p.store_type === "staff");
                const bulkPrice = prices?.find((p: any) => p.store_type === "bulk");
                return (
                  <div
                    key={product.id}
                    className="border border-border rounded-lg overflow-hidden hover:shadow-card-hover transition-shadow cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="w-full h-28 bg-secondary flex items-center justify-center">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-8 h-8 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="p-3 space-y-2">
                      <div>
                        <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] capitalize">{product.category || "général"}</Badge>
                        <StatusBadge status={product.active ? "active" : "inactive"} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="space-y-0.5">
                          {bulkPrice && <p>Bulk: {formatCurrency(bulkPrice.price)}</p>}
                          {staffPrice && <p>Staff: {formatCurrency(staffPrice.price)}</p>}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{tenant?.name}</p>
                    </div>
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
