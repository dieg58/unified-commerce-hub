import TopBar from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mock-data";
import { ShoppingCart, Package, Users, TrendingUp, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TenantDashboard = () => {
  const { profile, roles, isShopManager } = useAuth();
  const navigate = useNavigate();
  const tenantId = profile?.tenant_id;

  const { data: tenant } = useQuery({
    queryKey: ["tenant-dash", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").eq("id", tenantId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: orders } = useQuery({
    queryKey: ["tenant-dash-orders", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, total, created_at")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: stats } = useQuery({
    queryKey: ["tenant-dash-stats", tenantId],
    queryFn: async () => {
      const [ordersRes, productsRes, profilesRes] = await Promise.all([
        supabase.from("orders").select("total").eq("tenant_id", tenantId!),
        supabase.from("products").select("id").eq("tenant_id", tenantId!).eq("active", true),
        supabase.from("profiles").select("id").eq("tenant_id", tenantId!),
      ]);
      return {
        totalRevenue: ordersRes.data?.reduce((s, o) => s + Number(o.total), 0) || 0,
        totalOrders: ordersRes.data?.length || 0,
        totalProducts: productsRes.data?.length || 0,
        totalUsers: profilesRes.data?.length || 0,
      };
    },
    enabled: !!tenantId,
  });

  const roleLabel = roles.map((r) => {
    if (r === "shop_manager") return "Responsable Boutique";
    if (r === "dept_manager") return "Responsable Département";
    if (r === "employee") return "Employé";
    return r;
  }).join(", ");

  return (
    <>
      <TopBar title="Tableau de bord" subtitle={`Bienvenue, ${profile?.full_name || profile?.email}`} />
      <div className="p-6 space-y-6 overflow-auto">
        {/* Welcome card */}
        <div className="bg-card rounded-lg border border-border p-6 animate-fade-in">
          <h2 className="text-lg font-bold text-foreground">{tenant?.name || "Ma boutique"}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Votre rôle : <span className="font-medium text-foreground">{roleLabel || "aucun"}</span>
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: ShoppingCart, label: "Commandes", value: stats?.totalOrders || 0, color: "text-primary", to: "/tenant/orders" },
            { icon: TrendingUp, label: "Chiffre d'affaires", value: formatCurrency(stats?.totalRevenue || 0), color: "text-success", to: "/tenant/stats" },
            { icon: Package, label: "Produits", value: stats?.totalProducts || 0, color: "text-warning", to: "/store" },
            { icon: Users, label: "Utilisateurs", value: stats?.totalUsers || 0, color: "text-accent", to: isShopManager ? "/tenant/users" : "/tenant" },
          ].map((card, i) => (
            <button
              key={card.label}
              onClick={() => navigate(card.to)}
              className="bg-card rounded-lg border border-border p-5 text-left hover:shadow-card-hover transition-all animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <card.icon className={`w-5 h-5 ${card.color} mb-2`} />
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            </button>
          ))}
        </div>

        {/* Recent orders */}
        <div className="bg-card rounded-lg border border-border p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Dernières commandes</h3>
            <button onClick={() => navigate("/tenant/orders")} className="text-xs text-primary hover:underline">Voir tout</button>
          </div>
          {!orders?.length ? (
            <p className="text-sm text-muted-foreground">Aucune commande</p>
          ) : (
            <div className="space-y-2">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8)}</span>
                    <span className="ml-2 text-xs capitalize px-2 py-0.5 rounded bg-muted text-muted-foreground">{o.status}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-foreground">{formatCurrency(Number(o.total))}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TenantDashboard;
