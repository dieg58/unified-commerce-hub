import TopBar from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mock-data";

/** TopTex products store purchase price — apply 1.81× markup for selling price */
function getSellingPrice(basePrice: number, midoceanId?: string | null): number {
  if (midoceanId && midoceanId.startsWith("TT-")) return basePrice * 1.81;
  return basePrice;
}
import { ShoppingCart, Package, Users, TrendingUp, Loader2, AlertTriangle, Clock, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/DashboardWidgets";
import CatalogProductDetailDialog from "@/components/CatalogProductDetailDialog";
import OnboardingCard from "@/components/OnboardingCard";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocaleDate } from "@/hooks/useLocaleDate";

const TenantDashboard = () => {
  const { profile, roles, isShopManager } = useAuth();
  const navigate = useNavigate();
  const tenantId = profile?.tenant_id;
  const { t } = useTranslation();
  const { formatDate } = useLocaleDate();

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
        .select("id, status, total, created_at, store_type")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(10);
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

  // Pending approval orders
  const pendingOrders = orders?.filter(o => o.status === "pending" || o.status === "pending_approval") || [];

  // New catalog products (from Inkoo global catalog)
  const { data: newCatalogProducts } = useQuery({
    queryKey: ["catalog-new-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_products")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Already selected catalog products
  const { data: selections } = useQuery({
    queryKey: ["catalog-selections", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_catalog_selections")
        .select("catalog_product_id")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return new Set(data?.map(s => s.catalog_product_id));
    },
    enabled: !!tenantId,
  });

  const unselectedCatalog = newCatalogProducts?.filter(p => !selections?.has(p.id)) || [];

  // Existing product requests for this tenant
  const { data: existingRequests } = useQuery({
    queryKey: ["tenant-product-requests", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_requests")
        .select("catalog_product_id")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return new Set(data?.map(r => r.catalog_product_id));
    },
    enabled: !!tenantId,
  });

  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const roleLabel = roles.map((r) => {
    if (r === "shop_manager") return t("tenantDash.roleShopManager");
    if (r === "dept_manager") return t("tenantDash.roleDeptManager");
    if (r === "employee") return t("tenantDash.roleEmployee");
    return r;
  }).join(", ");

  return (
    <>
      <TopBar title={t("tenantDash.title")} subtitle={t("tenantDash.welcome", { name: profile?.full_name || profile?.email })} />
      <div className="p-6 space-y-6 overflow-auto">
        {/* Onboarding */}
        <div data-tour="onboarding">
          <OnboardingCard />
        </div>

        {/* Welcome card */}
        <div className="bg-card rounded-lg border border-border p-6 animate-fade-in">
          <h2 className="text-lg font-bold text-foreground">{tenant?.name || t("tenantDash.myShop")}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("tenantDash.yourRole")} : <span className="font-medium text-foreground">{roleLabel || t("tenantDash.noRole")}</span>
          </p>
        </div>

        {/* KPIs */}
        <div data-tour="kpis" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: ShoppingCart, label: t("tenantDash.orders"), value: stats?.totalOrders || 0, color: "text-primary", to: "/tenant/orders" },
            { icon: TrendingUp, label: t("tenantDash.revenue"), value: formatCurrency(stats?.totalRevenue || 0), color: "text-success", to: "/tenant/stats" },
            { icon: Package, label: t("tenantDash.products"), value: stats?.totalProducts || 0, color: "text-warning", to: "/tenant/products" },
            { icon: Users, label: t("tenantDash.users"), value: stats?.totalUsers || 0, color: "text-accent", to: isShopManager ? "/tenant/users" : "/tenant" },
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

        {/* Action required section */}
        {isShopManager && pendingOrders.length > 0 && (
          <div className="bg-card rounded-lg border border-warning/30 p-5 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <h3 className="text-sm font-semibold text-foreground">{t("tenantDash.actionsRequired")}</h3>
            </div>
            <div className="space-y-2">
              {pendingOrders.slice(0, 5).map(order => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-warning" />
                    <div>
                      <span className="text-sm font-medium text-foreground">{t("tenantDash.order")} {order.id.slice(0, 8)}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {order.store_type === "bulk" ? t("tenantDash.internal") : t("tenantDash.employee")} — {formatCurrency(Number(order.total))}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate("/tenant/orders")}>
                    {t("tenantDash.process")}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Inkoo catalog products */}
        <div className="bg-card rounded-lg border border-border p-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{t("tenantDash.newCatalogProducts")}</h3>
          </div>
          {!newCatalogProducts?.length ? (
            <p className="text-sm text-muted-foreground">{t("tenantDash.noCatalogProducts")}</p>
          ) : unselectedCatalog.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("tenantDash.allCatalogAdded")}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {unselectedCatalog.map(product => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="border border-border rounded-lg p-4 hover:shadow-card-hover transition-all text-left cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-md object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{product.category}</p>
                      <p className="text-sm font-semibold text-primary mt-1">{formatCurrency(getSellingPrice(Number(product.base_price), product.midocean_id))}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div className="bg-card rounded-lg border border-border p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">{t("tenantDash.recentOrders")}</h3>
            <button onClick={() => navigate("/tenant/orders")} className="text-xs text-primary hover:underline">{t("tenantDash.viewAll")}</button>
          </div>
          {!orders?.length ? (
            <p className="text-sm text-muted-foreground">{t("tenantDash.noOrders")}</p>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 5).map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-foreground">{formatCurrency(Number(o.total))}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{formatDate(o.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CatalogProductDetailDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
        alreadyRequested={selectedProduct ? existingRequests?.has(selectedProduct.id) : false}
      />
    </>
  );
};

export default TenantDashboard;
