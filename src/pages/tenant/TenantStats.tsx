import TopBar from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mock-data";
import { Loader2, ShoppingCart, Package, TrendingUp, Users } from "lucide-react";

const TenantStats = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const { data: orders } = useQuery({
    queryKey: ["tenant-stats-orders", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, entities(name)")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: budgets } = useQuery({
    queryKey: ["tenant-stats-budgets", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*, entities(name)")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: products } = useQuery({
    queryKey: ["tenant-stats-products", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id")
        .eq("tenant_id", tenantId!)
        .eq("active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const totalRevenue = orders?.reduce((s, o) => s + Number(o.total), 0) || 0;
  const totalBudget = budgets?.reduce((s, b) => s + Number(b.amount), 0) || 0;
  const totalSpent = budgets?.reduce((s, b) => s + Number(b.spent), 0) || 0;
  const pendingOrders = orders?.filter((o) => o.status === "pending" || o.status === "pending_approval").length || 0;

  // Orders by entity
  const ordersByEntity = orders?.reduce((acc, o) => {
    const entityName = (o.entities as any)?.name || "Inconnu";
    acc[entityName] = (acc[entityName] || 0) + Number(o.total);
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <>
      <TopBar title="Statistiques" subtitle="Vue d'ensemble de votre boutique" />
      <div className="p-6 space-y-6 overflow-auto">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-5 animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10"><ShoppingCart className="w-5 h-5 text-primary" /></div>
            </div>
            <p className="text-2xl font-bold text-foreground">{orders?.length || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Commandes totales</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-5 animate-fade-in" style={{ animationDelay: "50ms" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-success/10"><TrendingUp className="w-5 h-5 text-success" /></div>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Chiffre d'affaires</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-5 animate-fade-in" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-warning/10"><Package className="w-5 h-5 text-warning" /></div>
            </div>
            <p className="text-2xl font-bold text-foreground">{pendingOrders}</p>
            <p className="text-xs text-muted-foreground mt-1">En attente</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-5 animate-fade-in" style={{ animationDelay: "150ms" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-accent/10"><Package className="w-5 h-5 text-accent" /></div>
            </div>
            <p className="text-2xl font-bold text-foreground">{products?.length || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Produits actifs</p>
          </div>
        </div>

        {/* Budget overview */}
        <div className="bg-card rounded-lg border border-border p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-foreground mb-4">Budgets par département</h3>
          {!budgets?.length ? (
            <p className="text-sm text-muted-foreground">Aucun budget configuré</p>
          ) : (
            <div className="space-y-3">
              {budgets.map((b) => {
                const pct = Number(b.amount) > 0 ? (Number(b.spent) / Number(b.amount)) * 100 : 0;
                return (
                  <div key={b.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{(b as any).entities?.name || "—"} ({b.store_type === "bulk" ? "Interne" : "Employé"})</span>
                      <span className="text-muted-foreground">{formatCurrency(Number(b.spent))} / {formatCurrency(Number(b.amount))}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct > 90 ? "bg-destructive" : pct > 70 ? "bg-warning" : "bg-primary"}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Revenue by entity */}
        <div className="bg-card rounded-lg border border-border p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-foreground mb-4">Dépenses par département</h3>
          {Object.keys(ordersByEntity).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(ordersByEntity)
                .sort(([, a], [, b]) => b - a)
                .map(([name, amount]) => (
                  <div key={name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm font-medium text-foreground">{name}</span>
                    <span className="text-sm font-bold text-foreground">{formatCurrency(amount)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TenantStats;
