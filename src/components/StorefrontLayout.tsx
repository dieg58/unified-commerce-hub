import { Outlet } from "react-router-dom";
import { NavLink, useLocation } from "react-router-dom";
import { Store, ShoppingCart, User, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { to: "/shop", icon: Store, label: "Boutique" },
  { to: "/shop/orders", icon: ShoppingCart, label: "Mes commandes" },
  { to: "/shop/profile", icon: User, label: "Mon profil" },
];

const StorefrontLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut, profile } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
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
              Ma Boutique
            </span>
          )}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.to === "/shop"
                ? location.pathname === "/shop" || location.pathname === "/store"
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
      <main className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default StorefrontLayout;
