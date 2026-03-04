import { NavLink, useLocation, useSearchParams } from "react-router-dom";
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
  ClipboardCheck,
  Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTenantContext } from "@/hooks/useTenantContext";
import { useTranslation } from "react-i18next";

type NavItem = { to: string; icon: any; label: string } | { separator: string };

const TenantAdminSidebar = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { basePath, isSuperAdminView } = useTenantContext();
  const shopPath = isSuperAdminView ? `${basePath}/shop` : "/shop";
  const isOnShop = location.pathname.startsWith(shopPath) || (!isSuperAdminView && location.pathname.startsWith("/shop"));
  const isDemo = searchParams.get("demo") === "1";
  const [manualCollapsed, setManualCollapsed] = useState(false);

  useEffect(() => {
    if (isDemo) setManualCollapsed(true);
  }, [isDemo]);

  const collapsed = isOnShop || manualCollapsed;
  const { isShopManager, signOut, profile } = useAuth();
  const { t } = useTranslation();

  // For super admin view, show full shop_manager nav
  const showFullNav = isShopManager || isSuperAdminView;

  const shopManagerNav: NavItem[] = [
    { to: basePath, icon: LayoutDashboard, label: t("nav.dashboard") },
    { separator: t("nav.structure") },
    { to: `${basePath}/entities`, icon: Building2, label: t("nav.entities") },
    { to: `${basePath}/users`, icon: Users, label: t("nav.users") },
    { separator: t("nav.commerce") },
    { to: `${basePath}/products`, icon: Package, label: t("nav.products") },
    { to: `${basePath}/product-requests`, icon: Sparkles, label: "Demandes produits" },
    { to: `${basePath}/orders`, icon: ShoppingCart, label: t("nav.orders") },
    { to: `${basePath}/approvals`, icon: ClipboardCheck, label: t("nav.approvals") },
    { to: `${basePath}/discounts`, icon: Tag, label: t("nav.promoCodes") },
    { separator: t("nav.analysis") },
    { to: `${basePath}/stats`, icon: BarChart3, label: t("nav.statistics") },
    { to: `${basePath}/settings`, icon: Settings, label: t("nav.settings") },
  ];

  const deptManagerNav: NavItem[] = [
    { to: basePath, icon: LayoutDashboard, label: t("nav.dashboard") },
    { separator: t("nav.commerce") },
    { to: `${basePath}/orders`, icon: ShoppingCart, label: t("nav.orders") },
    { to: `${basePath}/approvals`, icon: ClipboardCheck, label: t("nav.approvals") },
    { separator: t("nav.analysis") },
    { to: `${basePath}/stats`, icon: BarChart3, label: t("nav.statistics") },
  ];

  const navItems = showFullNav ? shopManagerNav : deptManagerNav;

  return (
    <aside
      data-tour="sidebar"
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
            {isSuperAdminView ? "Vue gestionnaire" : t("nav.shopManagement")}
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
            (item.to !== basePath && location.pathname.startsWith(item.to));
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

      <div className="px-2 pb-1">
        <NavLink
          to={`${basePath}/shop`}
          data-tour="view-shop"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full",
            isOnShop
              ? "bg-sidebar-accent text-sidebar-primary"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Store className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="truncate flex-1">{t("nav.viewShop")}</span>}
        </NavLink>
      </div>

      <div className="border-t border-sidebar-border p-2 space-y-1">
        {!collapsed && profile && (
          <div className="px-3 py-2">
            <p className="text-xs text-sidebar-accent-foreground font-medium truncate">{profile.full_name || profile.email}</p>
            <p className="text-xs text-sidebar-muted truncate">{profile.email}</p>
          </div>
        )}
        {!isSuperAdminView && (
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{t("common.logout")}</span>}
          </button>
        )}
        <button
          onClick={() => setManualCollapsed(!manualCollapsed)}
          className="flex items-center justify-center w-full h-8 text-sidebar-muted hover:text-sidebar-accent-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};

export default TenantAdminSidebar;
