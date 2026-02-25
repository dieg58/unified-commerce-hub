import { useState, useMemo } from "react";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Search, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/mock-data";
import ExportMenu from "@/components/ExportMenu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "react-i18next";
import type { ExportColumn } from "@/lib/export-utils";

const TenantProducts = () => {
  const { profile, isSuperAdmin } = useAuth();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterVisibility, setFilterVisibility] = useState<"all" | "bulk" | "staff" | "inactive">("all");
  const [showFilters, setShowFilters] = useState(false);
  const { t } = useTranslation();

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

  const categories = useMemo(() => {
    if (!products) return [];
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.category || "general";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    const searchLower = search.toLowerCase();
    return products.filter((p) => {
      if (search && !p.name.toLowerCase().includes(searchLower) && !p.sku.toLowerCase().includes(searchLower)) return false;
      if (filterCategory !== "all" && (p.category || "general") !== filterCategory) return false;
      if (filterVisibility === "bulk" && !p.active_bulk) return false;
      if (filterVisibility === "staff" && !p.active_staff) return false;
      if (filterVisibility === "inactive" && (p.active_bulk || p.active_staff)) return false;
      return true;
    });
  }, [products, search, filterCategory, filterVisibility]);

  const bulkCount = products?.filter(p => p.active_bulk).length || 0;
  const staffCount = products?.filter(p => p.active_staff).length || 0;
  const inactiveCount = products?.filter(p => !p.active_bulk && !p.active_staff).length || 0;

  const activeFilterCount = (filterCategory !== "all" ? 1 : 0) + (filterVisibility !== "all" ? 1 : 0);

  const clearFilters = () => {
    setFilterCategory("all");
    setFilterVisibility("all");
  };

  return (
    <>
      <TopBar title={t("tenantProducts.title")} subtitle={t("tenantProducts.subtitle")} />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              {t("tenantProducts.title")} ({products?.length || 0}) — Bulk: {bulkCount} · Staff: {staffCount}
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant={showFilters ? "secondary" : "outline"}
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-3.5 h-3.5" />
                {t("common.filter")}
                {activeFilterCount > 0 && (
                  <Badge variant="default" className="h-4 px-1 text-[10px] rounded-full ml-0.5">{activeFilterCount}</Badge>
                )}
                {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
              <ExportMenu
                title={t("tenantProducts.title")}
                filename="produits"
                columns={[
                  { header: t("common.name"), accessor: "name" },
                  { header: "SKU", accessor: "sku" },
                  { header: t("common.category"), accessor: "category" },
                  { header: t("tenantProducts.stock"), accessor: "stock_qty" },
                  { header: t("tenantProducts.alertThreshold"), accessor: "low_stock_threshold" },
                  { header: t("tenantProducts.bulkActive"), accessor: (r: any) => r.active_bulk ? t("common.yes") : t("common.no") },
                  { header: t("tenantProducts.staffActive"), accessor: (r: any) => r.active_staff ? t("common.yes") : t("common.no") },
                ]}
                data={filtered || []}
              />
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 w-52 text-sm" />
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          <Collapsible open={showFilters}>
            <CollapsibleContent>
              <div className="p-4 border-b border-border bg-muted/30 space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{t("tenantProducts.visibility")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: "all" as const, label: t("common.all"), count: products?.length || 0 },
                      { key: "bulk" as const, label: t("tenantProducts.bulkActive"), count: bulkCount },
                      { key: "staff" as const, label: t("tenantProducts.staffActive"), count: staffCount },
                      { key: "inactive" as const, label: t("common.inactive"), count: inactiveCount },
                    ].map((v) => (
                      <button
                        key={v.key}
                        onClick={() => setFilterVisibility(v.key)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          filterVisibility === v.key
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {v.label}
                        <span className="opacity-60">{v.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {categories.length > 1 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">{t("common.category")}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setFilterCategory("all")}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          filterCategory === "all"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {t("common.all")}
                      </button>
                      {categories.map(([cat, count]) => (
                        <button
                          key={cat}
                          onClick={() => setFilterCategory(cat)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                            filterCategory === cat
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          }`}
                        >
                          {cat}
                          <span className="opacity-60">{count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-xs text-primary hover:underline">
                    {t("tenantProducts.resetFilters")}
                  </button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {activeFilterCount > 0 && !isLoading && (
            <div className="px-5 py-2 border-b border-border bg-muted/10">
              <p className="text-xs text-muted-foreground">
                {t("tenantProducts.productsShown", { count: filtered.length })}
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !filtered?.length ? (
            <p className="p-12 text-center text-sm text-muted-foreground">{search || activeFilterCount > 0 ? t("tenantProducts.noProductFound") : t("tenantProducts.noProduct")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t("common.product")}</TableHead>
                  <TableHead className="text-xs">SKU</TableHead>
                  <TableHead className="text-xs">{t("common.category")}</TableHead>
                  <TableHead className="text-xs">{t("common.price")}</TableHead>
                  <TableHead className="text-xs text-center">Bulk</TableHead>
                  <TableHead className="text-xs text-center">Staff</TableHead>
                  {isSuperAdmin && <TableHead className="text-xs text-center">{t("tenantProducts.minBulk")}</TableHead>}
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
