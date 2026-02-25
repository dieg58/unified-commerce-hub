import { Outlet } from "react-router-dom";
import { NavLink, useLocation } from "react-router-dom";
import { Store, ShoppingCart, User, LogOut, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSubdomain } from "@/components/SubdomainRouter";
import { useTenantBySlug } from "@/hooks/useTenantBySlug";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const StorefrontLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut, profile, isShopManager, isDeptManager, isSuperAdmin } = useAuth();
  const { tenantSlug } = useSubdomain();
  const { data: subdomainTenant } = useTenantBySlug(tenantSlug);
  const { t } = useTranslation();

  const navItems = [
    { to: "/shop", icon: Store, label: t("nav.shop") },
    { to: "/shop/wishlist", icon: Heart, label: t("nav.myFavorites") },
    { to: "/shop/orders", icon: ShoppingCart, label: t("nav.myOrders") },
    { to: "/shop/profile", icon: User, label: t("nav.myProfile") },
  ];

  const branding = subdomainTenant?.tenant_branding as any;
  const storeName = branding?.head_title || subdomainTenant?.name || "Ma Boutique";

  const showSidebar = isShopManager || isDeptManager || isSuperAdmin;

  // Employee layout: top nav + bottom nav for mobile, no sidebar
  if (!showSidebar) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Top navigation bar for employees */}
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {branding?.logo_url ? (
                <img src={branding.logo_url} alt={storeName} className="h-7 object-contain" />
              ) : (
                <span className="font-semibold text-foreground text-sm">{storeName}</span>
              )}
            </div>
            {/* Desktop nav links */}
            <nav className="hidden sm:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive =
                  item.to === "/shop"
                    ? location.pathname === "/shop" || location.pathname === "/" || location.pathname === "/store"
                    : location.pathname.startsWith(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="flex items-center gap-2">
              <LanguageSwitcher variant="ghost" />
              {profile && (
                <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[120px]">
                  {profile.full_name || profile.email}
                </span>
              )}
              <button
                onClick={signOut}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title={t("common.logout")}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 pb-16 sm:pb-0">
          <Outlet />
        </main>

        {/* Bottom navigation bar for mobile */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border sm:hidden">
          <div className="flex items-center justify-around h-14">
            {navItems.map((item) => {
              const isActive =
                item.to === "/shop"
                  ? location.pathname === "/shop" || location.pathname === "/" || location.pathname === "/store"
                  : location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "gradient-sidebar flex flex-col border-r border-sidebar-border transition-all duration-300 h-screen sticky top-0",
          collapsed ? "w-[68px]" : "w-[240px]"
        )}
      >
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
          {branding?.logo_url ? (
            <img src={branding.logo_url} alt={storeName} className="w-8 h-8 rounded-lg object-contain shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
              <Store className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
          {!collapsed && (
            <span className="text-sidebar-accent-foreground font-semibold text-sm tracking-tight truncate">
              {storeName}
            </span>
          )}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.to === "/shop"
                ? location.pathname === "/shop" || location.pathname === "/" || location.pathname === "/store"
                : location.pathname.startsWith(item.to);
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

        <div className="border-t border-sidebar-border p-2 space-y-1">
          {!collapsed && (
            <div className="px-3 py-1">
              <LanguageSwitcher variant="ghost" />
            </div>
          )}
          {!collapsed && profile && (
            <div className="px-3 py-2">
              <p className="text-xs text-sidebar-accent-foreground font-medium truncate">
                {profile.full_name || profile.email}
              </p>
              <p className="text-xs text-sidebar-muted truncate">{profile.email}</p>
            </div>
          )}
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{t("common.logout")}</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full h-8 text-sidebar-muted hover:text-sidebar-accent-foreground transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default StorefrontLayout;
