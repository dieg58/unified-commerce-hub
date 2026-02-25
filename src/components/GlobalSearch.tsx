import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Search, ShoppingCart, Building2, Users, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "order" | "tenant" | "user";
  label: string;
  sublabel?: string;
  path: string;
}

const GlobalSearch = () => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isSuperAdmin, isShopManager, profile } = useAuth();
  const { t } = useTranslation();
  const tenantId = profile?.tenant_id;

  // Fetch data for search
  const { data: orders } = useQuery({
    queryKey: ["search-orders", isSuperAdmin, tenantId],
    queryFn: async () => {
      let q = supabase.from("orders").select("id, status, total, created_by, tenant_id, store_type, profiles:profiles!orders_created_by_profiles_fkey(full_name, email)").order("created_at", { ascending: false }).limit(200);
      if (!isSuperAdmin && tenantId) q = q.eq("tenant_id", tenantId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: tenants } = useQuery({
    queryKey: ["search-tenants"],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("id, name, slug").order("name").limit(100);
      return data || [];
    },
    enabled: isSuperAdmin,
  });

  const { data: users } = useQuery({
    queryKey: ["search-users", isSuperAdmin, tenantId],
    queryFn: async () => {
      let q = supabase.from("profiles").select("id, full_name, email, tenant_id").order("full_name").limit(200);
      if (!isSuperAdmin && tenantId) q = q.eq("tenant_id", tenantId);
      const { data } = await q;
      return data || [];
    },
    enabled: isSuperAdmin || isShopManager,
  });

  const results = useMemo<SearchResult[]>(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    const res: SearchResult[] = [];

    // Search orders by ID
    orders?.forEach((o) => {
      const p = o.profiles as any;
      const idMatch = o.id.toLowerCase().includes(q);
      const nameMatch = p?.full_name?.toLowerCase().includes(q) || p?.email?.toLowerCase().includes(q);
      if (idMatch || nameMatch) {
        res.push({
          id: o.id,
          type: "order",
          label: `${t("common.order")} #${o.id.slice(0, 8)}`,
          sublabel: `${p?.full_name || p?.email || "—"} · ${o.total}€`,
          path: isSuperAdmin ? `/orders/${o.id}` : `/tenant/orders/${o.id}`,
        });
      }
    });

    // Search tenants
    tenants?.forEach((te) => {
      if (te.name.toLowerCase().includes(q) || te.slug.toLowerCase().includes(q)) {
        res.push({
          id: te.id,
          type: "tenant",
          label: te.name,
          sublabel: `${te.slug}.inkoo.eu`,
          path: `/tenants/${te.id}`,
        });
      }
    });

    // Search users
    users?.forEach((u) => {
      if (u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)) {
        res.push({
          id: u.id,
          type: "user",
          label: u.full_name || u.email,
          sublabel: u.email,
          path: isSuperAdmin ? `/users` : `/tenant/users`,
        });
      }
    });

    return res.slice(0, 10);
  }, [query, orders, tenants, users, isSuperAdmin, t]);

  const handleSelect = useCallback((result: SearchResult) => {
    navigate(result.path);
    setQuery("");
    setOpen(false);
  }, [navigate]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    const timeout = setTimeout(() => document.addEventListener("click", handler), 0);
    return () => { clearTimeout(timeout); document.removeEventListener("click", handler); };
  }, [open]);

  const icons = { order: ShoppingCart, tenant: Building2, user: Users };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={`${t("topbar.search")} (⌘K)`}
          className="pl-9 w-64 h-9 bg-secondary border-border text-sm"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full mt-1 right-0 w-80 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-auto">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">{t("common.noResults")}</p>
          ) : (
            <div className="py-1">
              {results.map((r) => {
                const Icon = icons[r.type];
                return (
                  <button
                    key={r.id}
                    onClick={() => handleSelect(r)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted/60 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{r.label}</p>
                      {r.sublabel && <p className="text-xs text-muted-foreground truncate">{r.sublabel}</p>}
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase">{r.type}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
