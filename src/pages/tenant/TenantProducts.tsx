import { useState } from "react";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Loader2, Package, Search } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/mock-data";

const TenantProducts = () => {
  const { profile, isSuperAdmin } = useAuth();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["tenant-products-manage", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_prices(*)")
        .eq("tenant_id", tenantId!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const updateProduct = useMutation({
    mutationFn: async (payload: { id: string; active_bulk?: boolean; active_staff?: boolean; min_bulk_qty?: number }) => {
      const { id, ...updates } = payload;
      const { error } = await supabase.from("products").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-products-manage"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = products?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const bulkCount = products?.filter(p => p.active_bulk).length || 0;
  const staffCount = products?.filter(p => p.active_staff).length || 0;

  return (
    <>
      <TopBar title="Produits" subtitle="Gérer la visibilité et les paramètres des produits" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Produits ({products?.length || 0}) — Bulk: {bulkCount} · Staff: {staffCount}
            </h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 w-52 text-sm" />
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !filtered?.length ? (
            <p className="p-12 text-center text-sm text-muted-foreground">{search ? "Aucun produit trouvé" : "Aucun produit disponible"}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Produit</TableHead>
                  <TableHead className="text-xs">SKU</TableHead>
                  <TableHead className="text-xs">Catégorie</TableHead>
                  <TableHead className="text-xs">Prix</TableHead>
                  <TableHead className="text-xs text-center">Bulk</TableHead>
                  <TableHead className="text-xs text-center">Staff</TableHead>
                  {isSuperAdmin && <TableHead className="text-xs text-center">Min. Bulk</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product, i) => {
                  const prices = (product.product_prices as any[]) || [];
                  const bulkPrice = prices.find((p: any) => p.store_type === "bulk");
                  const staffPrice = prices.find((p: any) => p.store_type === "staff");
                  return (
                    <TableRow key={product.id} className="text-sm animate-fade-in" style={{ animationDelay: `${i * 20}ms` }}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded-md object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                              <Package className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.description && <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                      <TableCell className="text-xs text-muted-foreground capitalize">{product.category}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          {bulkPrice && <p>Bulk: {formatCurrency(Number(bulkPrice.price))}</p>}
                          {staffPrice && <p>Staff: {formatCurrency(Number(staffPrice.price))}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={product.active_bulk}
                          onCheckedChange={v => updateProduct.mutate({ id: product.id, active_bulk: v })}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={product.active_staff}
                          onCheckedChange={v => updateProduct.mutate({ id: product.id, active_staff: v })}
                        />
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min={1}
                            className="w-16 h-7 text-xs text-center mx-auto"
                            defaultValue={product.min_bulk_qty}
                            onBlur={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              if (val !== product.min_bulk_qty) {
                                updateProduct.mutate({ id: product.id, min_bulk_qty: val });
                              }
                            }}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
};

export default TenantProducts;
