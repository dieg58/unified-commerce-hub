import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  BarChart3,
  Users,
  Settings,
  Store,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  Tag,
  Package,
  Wallet,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStorefrontUrl } from "@/lib/subdomain";

type NavItem = { to: string; icon: any; label: string } | { separator: string };

const shopManagerNav: NavItem[] = [
  { to: "/tenant", icon: LayoutDashboard, label: "Tableau de bord" },
  { separator: "Structure" },
  { to: "/tenant/entities", icon: Building2, label: "Entités" },
  { to: "/tenant/users", icon: Users, label: "Utilisateurs" },
  { to: "/tenant/budgets", icon: Wallet, label: "Budgets" },
  { separator: "Commerce" },
  { to: "/tenant/products", icon: Package, label: "Produits" },
  { to: "/tenant/orders", icon: ShoppingCart, label: "Commandes" },
  { to: "/tenant/discounts", icon: Tag, label: "Codes promo" },
  { separator: "Analyse" },
  { to: "/tenant/stats", icon: BarChart3, label: "Statistiques" },
  { to: "/tenant/settings", icon: Settings, label: "Paramètres" },
];

const deptManagerNav: NavItem[] = [
  { to: "/tenant", icon: LayoutDashboard, label: "Tableau de bord" },
  { separator: "Commerce" },
  { to: "/tenant/orders", icon: ShoppingCart, label: "Commandes" },
  { separator: "Analyse" },
  { to: "/tenant/stats", icon: BarChart3, label: "Statistiques" },
];

const TenantAdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { isShopManager, signOut, profile } = useAuth();
  const tenantId = profile?.tenant_id;

  // Fetch tenant slug for storefront link
  const { data: tenant } = useQuery({
    queryKey: ["tenant-sidebar-slug", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("slug").eq("id", tenantId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const storefrontUrl = tenant?.slug ? getStorefrontUrl(tenant.slug) : null;

  const navItems = isShopManager ? shopManagerNav : deptManagerNav;

  return (
    <aside
      className={cn(
        "gradient-sidebar flex flex-col border-r border-sidebar-border transition-all duration-300 h-screen sticky top-0",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
          <Store className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-sidebar-accent-foreground font-semibold text-sm tracking-tight truncate">
            Gestion Boutique
          </span>
        )}
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item, idx) => {
          if ("separator" in item) {
            return (
              <div key={item.separator} className={cn("pt-3 pb-1", idx > 0 && "mt-1")}>
                {!collapsed ? (
                  <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
                    {item.separator}
                  </span>
                ) : (
                  <div className="mx-3 h-px bg-sidebar-border" />
                )}
              </div>
            );
          }
          const isActive = location.pathname === item.to ||
            (item.to !== "/tenant" && location.pathname.startsWith(item.to));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* External link to storefront */}
      {storefrontUrl && (
        <div className="px-2 pb-1">
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full"
          >
            <Store className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="truncate flex-1">Voir la boutique</span>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
              </>
            )}
          </a>
        </div>
      )}

      <div className="border-t border-sidebar-border p-2 space-y-1">
        {!collapsed && profile && (
          <div className="px-3 py-2">
            <p className="text-xs text-sidebar-accent-foreground font-medium truncate">{profile.full_name || profile.email}</p>
            <p className="text-xs text-sidebar-muted truncate">{profile.email}</p>
          </div>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full h-8 text-sidebar-muted hover:text-sidebar-accent-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};

export default TenantAdminSidebar;
