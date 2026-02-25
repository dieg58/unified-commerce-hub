import { Outlet } from "react-router-dom";
import { NavLink, useLocation } from "react-router-dom";
import { Store, ShoppingCart, User, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const StorefrontLayout = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { to: "/shop", icon: Store, label: t("nav.shop") },
    { to: "/shop/wishlist", icon: Heart, label: t("nav.myFavorites") },
    { to: "/shop/orders", icon: ShoppingCart, label: t("nav.myOrders") },
    { to: "/shop/profile", icon: User, label: t("nav.myProfile") },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-16 sm:pb-0">
        <Outlet />
      </main>

      {/* Bottom navigation bar for mobile only */}
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
};

export default StorefrontLayout;
