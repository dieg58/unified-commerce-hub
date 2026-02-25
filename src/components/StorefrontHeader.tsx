import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubdomain } from "@/components/SubdomainRouter";
import { useTenantBySlug } from "@/hooks/useTenantBySlug";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Store, Heart, ShoppingCart, User, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";

const StorefrontHeader = ({ children }: { children?: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { count } = useCart();
  const { t } = useTranslation();

  const { tenantSlug } = useSubdomain();
  const { data: subdomainTenant } = useTenantBySlug(tenantSlug);
  const tenantId = subdomainTenant?.id || profile?.tenant_id;

  const { data: tenant } = useQuery({
    queryKey: ["store-tenant", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, tenant_branding(*)")
        .eq("id", tenantId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const branding = tenant?.tenant_branding as any;
  const primaryColor = branding?.primary_color || "#0ea5e9";
  const tenantName = tenant?.name || t("nav.shop");
  const logoUrl = branding?.logo_url;

  const navLinks = [
    { to: "/shop", label: t("nav.shop"), icon: Store, exact: true },
    { to: "/shop/wishlist", label: t("nav.myFavorites"), icon: Heart },
    { to: "/shop/orders", label: t("nav.myOrders"), icon: ShoppingCart },
  ];

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return location.pathname === to || location.pathname === "/" || location.pathname === "/store";
    return location.pathname.startsWith(to);
  };

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Left: logo + nav links (desktop) */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/shop")} className="flex items-center gap-2 shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={tenantName} className="h-8 object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: primaryColor }}>
                {tenantName.charAt(0)}
              </div>
            )}
            <span className="font-semibold text-foreground text-sm hidden sm:inline">{tenantName}</span>
          </button>

          {/* Desktop nav links */}
          <nav className="hidden sm:flex items-center gap-1 ml-2">
            {navLinks.map((link) => (
              <button
                key={link.to}
                onClick={() => navigate(link.to)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  isActive(link.to, link.exact)
                    ? "text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                style={isActive(link.to, link.exact) ? { backgroundColor: primaryColor } : {}}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right: children (store-type toggle etc.) + language + profile + cart */}
        <div className="flex items-center gap-2">
          {children}
          <LanguageSwitcher variant="ghost" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative p-2 rounded-md hover:bg-muted transition-colors">
                {profile?.full_name ? (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ backgroundColor: primaryColor }}>
                    {profile.full_name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                ) : (
                  <User className="w-5 h-5 text-foreground" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {profile && (
                <>
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium truncate">{profile.full_name || profile.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => navigate("/shop/profile")}>
                <User className="w-4 h-4 mr-2" /> {t("nav.myProfile")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" /> {t("common.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button onClick={() => navigate("/shop")} className="relative p-2 rounded-md hover:bg-muted transition-colors">
            <ShoppingCart className="w-5 h-5 text-foreground" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default StorefrontHeader;
