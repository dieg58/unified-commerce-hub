import TopBar from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/mock-data";

const TenantProducts = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

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

  const toggleProduct = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("products").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { active }) => {
      toast.success(active ? "Produit affiché" : "Produit masqué");
      qc.invalidateQueries({ queryKey: ["tenant-products-manage"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const activeCount = products?.filter(p => p.active).length || 0;

  return (
    <>
      <TopBar title="Produits" subtitle="Gérer la visibilité des produits dans votre boutique" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          <div className="p-5 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Produits ({activeCount} affichés / {products?.length || 0} total)
            </h3>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !products?.length ? (
            <p className="p-12 text-center text-sm text-muted-foreground">Aucun produit disponible</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Produit</TableHead>
                  <TableHead className="text-xs">SKU</TableHead>
                  <TableHead className="text-xs">Catégorie</TableHead>
                  <TableHead className="text-xs">Stock</TableHead>
                  <TableHead className="text-xs">Prix</TableHead>
                  <TableHead className="text-xs">Visible</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product, i) => {
                  const prices = (product.product_prices as any[]) || [];
                  const mainPrice = prices[0]?.price || 0;
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
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${product.stock_type === "in_stock" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                          {product.stock_type === "in_stock" ? "En stock" : "Sur commande"}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(Number(mainPrice))}</TableCell>
                      <TableCell>
                        <Switch checked={product.active} onCheckedChange={v => toggleProduct.mutate({ id: product.id, active: v })} />
                      </TableCell>
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
