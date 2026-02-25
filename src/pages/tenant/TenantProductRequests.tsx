import { useState, useMemo, useCallback, useRef } from "react";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Package,
  Search,
  Send,
  Eye,
  Sparkles,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Gift,
  Shirt,
  Printer,
  Filter,
  ChevronDown,
  ChevronUp,
  Palette,
  Ruler,
  Layers,
  X,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/mock-data";
import { getCatalogTabByCategory, getSimplifiedCategory } from "@/lib/catalog-category-map";
import { getColorFamily, getColorFamilyHex, getSizeGroup, getSizeGroupOrder } from "@/lib/catalog-filter-groups";

/* ── Status config ── */
const statusConfig: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  requested: { label: "Demandé", className: "bg-blue-500/10 text-blue-600 border-blue-200", icon: Clock },
  in_discussion: { label: "En discussion", className: "bg-amber-500/10 text-amber-600 border-amber-200", icon: MessageSquare },
  bat_sent: { label: "BAT envoyé", className: "bg-purple-500/10 text-purple-600 border-purple-200", icon: Eye },
  validated: { label: "Validé", className: "bg-green-500/10 text-green-600 border-green-200", icon: CheckCircle2 },
  added: { label: "Ajouté", className: "bg-emerald-500/10 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  rejected: { label: "Rejeté", className: "bg-red-500/10 text-red-600 border-red-200", icon: XCircle },
};

/* ── Catalog section helpers ── */
type CatalogSection = "goodies" | "textile" | "signaletique";

function getProductSection(p: { midocean_id?: string | null; category?: string }): CatalogSection {
  const tab = getCatalogTabByCategory(p.category || "", p.midocean_id);
  return tab === "autre" ? "signaletique" : tab;
}

const sectionTabs: { key: CatalogSection; label: string; icon: typeof Gift; description: string }[] = [
  { key: "goodies", label: "Goodies", icon: Gift, description: "Objets publicitaires" },
  { key: "textile", label: "Textile", icon: Shirt, description: "Vêtements & accessoires" },
  { key: "signaletique", label: "Signalétique", icon: Printer, description: "Supports imprimés" },
];

type VariantColor = { color: string; hex: string | null; image_url: string | null };

const PAGE_SIZE = 60;

const TenantProductRequests = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("catalog");
  const [catalogSection, setCatalogSection] = useState<CatalogSection>("goodies");
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterSubCategory, setFilterSubCategory] = useState<string>("all");
  const [filterColors, setFilterColors] = useState<Set<string>>(new Set());
  const [filterSizes, setFilterSizes] = useState<Set<string>>(new Set());
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [detailProduct, setDetailProduct] = useState<any>(null);
  const [selectedColor, setSelectedColor] = useState<{ color: string; hex: string | null; image_url: string | null } | null>(null);
  const [note, setNote] = useState("");
  const [viewRequest, setViewRequest] = useState<any>(null);
  const [requestSearch, setRequestSearch] = useState("");
  const [requestFilter, setRequestFilter] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  /* ── Queries ── */
  const LISTING_COLUMNS = "id,name,name_en,name_nl,sku,category,base_price,description,description_en,description_nl,image_url,active,created_at,midocean_id,stock_qty,last_synced_at,is_new,release_date" as const;

  const { data: catalogProducts, isLoading: catalogLoading } = useQuery({
    queryKey: ["catalog-for-requests"],
    queryFn: async () => {
      const all: any[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("catalog_products")
          .select(LISTING_COLUMNS)
          .eq("active", true)
          .order("name")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
  });

  // Lazy load variant data for filters + card previews
  const { data: variantData } = useQuery({
    queryKey: ["catalog-variants-requests"],
    queryFn: async () => {
      const map = new Map<string, { variant_colors: VariantColor[] | null; variant_sizes: string[] | null }>();
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("catalog_products")
          .select("id,variant_colors,variant_sizes")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        for (const d of data) {
          map.set(d.id, { variant_colors: d.variant_colors as any, variant_sizes: d.variant_sizes as any });
        }
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ["product-requests", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_requests")
        .select(
          "*, catalog_products(name, sku, image_url, base_price, category, description), profiles:requested_by(full_name, email)"
        )
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const requestMap = useMemo(() => {
    const map = new Map<string, any>();
    requests?.forEach((r) => {
      if (!["rejected"].includes(r.status)) {
        map.set(r.catalog_product_id, r);
      }
    });
    return map;
  }, [requests]);

  /* ── On-demand variant loading for detail dialog ── */
  const openDetail = useCallback(async (product: any) => {
    try {
      const { data, error } = await supabase
        .from("catalog_products")
        .select("variant_colors,variant_sizes")
        .eq("id", product.id)
        .single();
      if (error) throw error;
      setDetailProduct({
        ...product,
        variant_colors: (data?.variant_colors as VariantColor[] | null) ?? null,
        variant_sizes: (data?.variant_sizes as string[] | null) ?? null,
      });
    } catch {
      setDetailProduct(product);
    }
  }, []);

  /* ── Submit request ── */
  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!detailProduct || !tenantId || !profile) return;
      const { error } = await supabase.from("product_requests").insert({
        tenant_id: tenantId,
        catalog_product_id: detailProduct.id,
        requested_by: profile.id,
        note: note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demande envoyée avec succès !");
      qc.invalidateQueries({ queryKey: ["product-requests"] });
      setNote("");
      setDetailProduct(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  /* ── Section counts ── */
  const sectionCounts = useMemo(() => {
    const all = catalogProducts || [];
    return {
      goodies: all.filter((p) => getProductSection(p) === "goodies").length,
      textile: all.filter((p) => getProductSection(p) === "textile").length,
      signaletique: all.filter((p) => getProductSection(p) === "signaletique").length,
    };
  }, [catalogProducts]);

  /* ── Section-filtered products ── */
  const sectionProducts = useMemo(() => {
    return (catalogProducts || []).filter((p) => getProductSection(p) === catalogSection);
  }, [catalogProducts, catalogSection]);

  /* ── Simplified categories ── */
  const tabForSimplified = catalogSection === "signaletique" ? "autre" : catalogSection;
  const simplifiedCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    sectionProducts.forEach((p) => {
      const simplified = getSimplifiedCategory(p.category, tabForSimplified);
      counts[simplified] = (counts[simplified] || 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [sectionProducts, tabForSimplified]);

  /* ── Subcategories ── */
  const subCategories = useMemo(() => {
    if (filterGroup === "all") return [];
    const counts: Record<string, number> = {};
    sectionProducts.forEach((p) => {
      if (getSimplifiedCategory(p.category, tabForSimplified) === filterGroup) {
        const parts = p.category.split(">");
        const sub = parts.length > 1 ? parts.slice(1).join(">").trim() : p.category.trim();
        counts[sub] = (counts[sub] || 0) + 1;
      }
    });
    const entries = Object.entries(counts).sort(([, a], [, b]) => b - a);
    return entries.length >= 2 ? entries : [];
  }, [sectionProducts, tabForSimplified, filterGroup]);

  /* ── Color families ── */
  const availableColorFamilies = useMemo(() => {
    if (!variantData) return [];
    const familyMap = new Map<string, number>();
    sectionProducts.forEach((p) => {
      const vd = variantData.get(p.id);
      const colors = vd?.variant_colors;
      if (!Array.isArray(colors)) return;
      const seenFamilies = new Set<string>();
      colors.forEach((c) => {
        if (!c.color) return;
        const family = getColorFamily(c.color);
        if (!seenFamilies.has(family)) {
          seenFamilies.add(family);
          familyMap.set(family, (familyMap.get(family) || 0) + 1);
        }
      });
    });
    return Array.from(familyMap.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([family, count]) => ({ family, hex: getColorFamilyHex(family), count }));
  }, [sectionProducts, variantData]);

  /* ── Size groups ── */
  const availableSizeGroups = useMemo(() => {
    if (!variantData) return [];
    const groupMap = new Map<string, number>();
    sectionProducts.forEach((p) => {
      const vd = variantData.get(p.id);
      const sizes = vd?.variant_sizes;
      if (!Array.isArray(sizes)) return;
      const seenGroups = new Set<string>();
      sizes.forEach((s) => {
        const group = getSizeGroup(s);
        if (!seenGroups.has(group)) {
          seenGroups.add(group);
          groupMap.set(group, (groupMap.get(group) || 0) + 1);
        }
      });
    });
    const order = getSizeGroupOrder();
    return Array.from(groupMap.entries())
      .sort(([a], [b]) => {
        const ia = order.indexOf(a);
        const ib = order.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
      })
      .map(([group, count]) => ({ group, count }));
  }, [sectionProducts, variantData]);

  const newCount = sectionProducts.filter((p) => p.is_new).length;

  /* ── Filtered catalog ── */
  const filteredCatalog = useMemo(() => {
    let list = sectionProducts;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    if (filterGroup !== "all") {
      list = list.filter((p) => getSimplifiedCategory(p.category, tabForSimplified) === filterGroup);
    }
    if (filterSubCategory !== "all") {
      list = list.filter((p) => {
        const parts = p.category.split(">");
        const sub = parts.length > 1 ? parts.slice(1).join(">").trim() : p.category.trim();
        return sub === filterSubCategory;
      });
    }
    if (showNewOnly) {
      list = list.filter((p) => p.is_new);
    }
    if (filterColors.size > 0) {
      list = list.filter((p) => {
        const vd = variantData?.get(p.id);
        const colors = vd?.variant_colors;
        return Array.isArray(colors) && colors.some((c) => filterColors.has(getColorFamily(c.color)));
      });
    }
    if (filterSizes.size > 0) {
      list = list.filter((p) => {
        const vd = variantData?.get(p.id);
        const sizes = vd?.variant_sizes;
        return Array.isArray(sizes) && sizes.some((s) => filterSizes.has(getSizeGroup(s)));
      });
    }
    return list;
  }, [sectionProducts, search, filterGroup, filterSubCategory, showNewOnly, filterColors, filterSizes, variantData, tabForSimplified]);

  // Reset visible count when filters change
  const filteredKey = `${catalogSection}-${filterGroup}-${filterSubCategory}-${search}-${showNewOnly}-${filterColors.size}-${filterSizes.size}`;
  const prevFilteredKey = useRef(filteredKey);
  if (prevFilteredKey.current !== filteredKey) {
    prevFilteredKey.current = filteredKey;
    if (visibleCount !== PAGE_SIZE) setVisibleCount(PAGE_SIZE);
  }

  const visibleProducts = useMemo(() => filteredCatalog.slice(0, visibleCount), [filteredCatalog, visibleCount]);
  const hasMore = visibleCount < filteredCatalog.length;

  /* ── Filtered requests ── */
  const filteredRequests = useMemo(() => {
    let list = requests || [];
    if (requestSearch) {
      const q = requestSearch.toLowerCase();
      list = list.filter(
        (r) =>
          (r.catalog_products as any)?.name?.toLowerCase().includes(q) ||
          r.status.includes(q)
      );
    }
    if (requestFilter !== "all") {
      if (requestFilter === "active") {
        list = list.filter((r) => !["added", "rejected"].includes(r.status));
      } else {
        list = list.filter((r) => r.status === requestFilter);
      }
    }
    return list;
  }, [requests, requestSearch, requestFilter]);

  const activeRequestsCount = requests?.filter((r) => !["added", "rejected"].includes(r.status)).length || 0;
  const activeFilterCount = (filterGroup !== "all" ? 1 : 0) + (filterSubCategory !== "all" ? 1 : 0) + filterColors.size + filterSizes.size + (showNewOnly ? 1 : 0);

  const clearFilters = () => {
    setFilterGroup("all");
    setFilterSubCategory("all");
    setFilterColors(new Set());
    setFilterSizes(new Set());
    setShowNewOnly(false);
  };

  /* ── Active filter chips for quick removal ── */
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (filterGroup !== "all") chips.push({ key: "cat", label: filterGroup, onRemove: () => { setFilterGroup("all"); setFilterSubCategory("all"); } });
    if (filterSubCategory !== "all") chips.push({ key: "subcat", label: filterSubCategory, onRemove: () => setFilterSubCategory("all") });
    if (showNewOnly) chips.push({ key: "new", label: "Nouveautés", onRemove: () => setShowNewOnly(false) });
    filterColors.forEach((c) => chips.push({ key: `color-${c}`, label: c, onRemove: () => setFilterColors((prev) => { const n = new Set(prev); n.delete(c); return n; }) }));
    filterSizes.forEach((s) => chips.push({ key: `size-${s}`, label: s, onRemove: () => setFilterSizes((prev) => { const n = new Set(prev); n.delete(s); return n; }) }));
    return chips;
  }, [filterGroup, filterSubCategory, showNewOnly, filterColors, filterSizes]);

  return (
    <>
      <TopBar
        title="Catalogue & Demandes"
        subtitle="Parcourez le catalogue INKOO et demandez l'ajout de produits"
      />
      <div className="p-6 space-y-5 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="catalog" className="gap-2">
              <ShoppingBag className="w-4 h-4" />
              Catalogue
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <Clock className="w-4 h-4" />
              Mes demandes
              {activeRequestsCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {activeRequestsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ════════════ CATALOGUE TAB ════════════ */}
          <TabsContent value="catalog" className="space-y-5 mt-5">
            {/* Section cards */}
            <div className="grid grid-cols-3 gap-3">
              {sectionTabs.map((s) => {
                const isActive = catalogSection === s.key;
                const count = sectionCounts[s.key];
                return (
                  <button
                    key={s.key}
                    onClick={() => { setCatalogSection(s.key); clearFilters(); setSearch(""); setVisibleCount(PAGE_SIZE); }}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      isActive
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <p className={`text-sm font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
                      <p className="text-[11px] text-muted-foreground">{count} produits</p>
                    </div>
                    {isActive && <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
                  </button>
                );
              })}
            </div>

            {/* Search bar */}
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, SKU ou catégorie…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-9 h-11 text-sm rounded-xl bg-card"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {newCount > 0 && (
                  <Button
                    variant={showNewOnly ? "default" : "outline"}
                    size="sm"
                    className="gap-1.5 h-11 shrink-0 rounded-xl"
                    onClick={() => setShowNewOnly(!showNewOnly)}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="hidden sm:inline">Nouveautés</span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{newCount}</Badge>
                  </Button>
                )}
                <Button
                  variant={showFilters ? "secondary" : "outline"}
                  size="sm"
                  className="h-11 gap-1.5 shrink-0 rounded-xl"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filtres</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="default" className="h-5 px-1.5 text-[10px] rounded-full">{activeFilterCount}</Badge>
                  )}
                </Button>
              </div>
            </div>

            {/* Category pills */}
            {simplifiedCategories.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => { setFilterGroup("all"); setFilterSubCategory("all"); }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filterGroup === "all"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card border border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  Tout ({sectionProducts.length})
                </button>
                {simplifiedCategories.map(([cat, count]) => (
                  <button
                    key={cat}
                    onClick={() => { setFilterGroup(cat); setFilterSubCategory("all"); setShowFilters(true); }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                      filterGroup === cat
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-card border border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {cat} ({count})
                  </button>
                ))}
              </div>
            )}

            {/* Collapsible filter panel */}
            {showFilters && (
              <div className="bg-card rounded-xl border border-border p-4 space-y-4 animate-fade-in shadow-sm">
                {!variantData && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Chargement des filtres…
                  </div>
                )}

                {/* Subcategories */}
                {subCategories.length > 0 && (
                  <Collapsible defaultOpen>
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">Sous-catégories de « {filterGroup} »</span>
                      {filterSubCategory !== "all" && (
                        <button className="text-[10px] text-primary hover:underline ml-1" onClick={() => setFilterSubCategory("all")}>Effacer</button>
                      )}
                      <CollapsibleTrigger asChild>
                        <button className="ml-auto text-muted-foreground hover:text-foreground"><ChevronDown className="w-3.5 h-3.5 transition-transform [[data-state=open]>&]:rotate-180" /></button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {subCategories.map(([sub, count]) => {
                          const isActive = filterSubCategory === sub;
                          return (
                            <button key={sub} onClick={() => setFilterSubCategory(isActive ? "all" : sub)} className={`inline-flex items-center gap-1 h-6 px-2.5 rounded-full border text-[11px] transition-all ${isActive ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/50 text-muted-foreground"}`}>
                              {sub} <span className="text-[9px] text-muted-foreground">({count})</span>
                            </button>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Color families */}
                {availableColorFamilies.length > 0 && (
                  <Collapsible defaultOpen>
                    <div className="flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">Couleurs</span>
                      {filterColors.size > 0 && (
                        <button className="text-[10px] text-primary hover:underline ml-1" onClick={() => setFilterColors(new Set())}>Effacer</button>
                      )}
                      <CollapsibleTrigger asChild>
                        <button className="ml-auto text-muted-foreground hover:text-foreground"><ChevronDown className="w-3.5 h-3.5 transition-transform [[data-state=open]>&]:rotate-180" /></button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {availableColorFamilies.map((c) => {
                          const isActive = filterColors.has(c.family);
                          const isGradient = c.hex.startsWith("linear");
                          return (
                            <button
                              key={c.family}
                              onClick={() => { setFilterColors((prev) => { const next = new Set(prev); if (next.has(c.family)) next.delete(c.family); else next.add(c.family); return next; }); }}
                              className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] transition-all ${isActive ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/50 text-muted-foreground"}`}
                            >
                              <span className="w-3.5 h-3.5 rounded-full border border-border/50 shrink-0" style={isGradient ? { background: c.hex } : { backgroundColor: c.hex }} />
                              <span>{c.family}</span>
                              <span className="text-[9px] text-muted-foreground">({c.count})</span>
                            </button>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Size groups */}
                {availableSizeGroups.length > 0 && (
                  <Collapsible defaultOpen>
                    <div className="flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">Tailles</span>
                      {filterSizes.size > 0 && (
                        <button className="text-[10px] text-primary hover:underline ml-1" onClick={() => setFilterSizes(new Set())}>Effacer</button>
                      )}
                      <CollapsibleTrigger asChild>
                        <button className="ml-auto text-muted-foreground hover:text-foreground"><ChevronDown className="w-3.5 h-3.5 transition-transform [[data-state=open]>&]:rotate-180" /></button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {availableSizeGroups.map((s) => {
                          const isActive = filterSizes.has(s.group);
                          return (
                            <button key={s.group} onClick={() => { setFilterSizes((prev) => { const next = new Set(prev); if (next.has(s.group)) next.delete(s.group); else next.add(s.group); return next; }); }} className={`inline-flex items-center gap-1 h-6 px-2.5 rounded-full border text-[11px] transition-all ${isActive ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/50 text-muted-foreground"}`}>
                              {s.group} <span className="text-[9px] text-muted-foreground">({s.count})</span>
                            </button>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}

            {/* Active filter chips */}
            {activeChips.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Filtres actifs :</span>
                {activeChips.map((chip) => (
                  <button
                    key={chip.key}
                    onClick={chip.onRemove}
                    className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors"
                  >
                    {chip.label}
                    <X className="w-3 h-3" />
                  </button>
                ))}
                <button onClick={clearFilters} className="text-[11px] text-muted-foreground hover:text-primary transition-colors ml-1">
                  Tout effacer
                </button>
              </div>
            )}

            {/* Results count */}
            {!catalogLoading && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{filteredCatalog.length}</span> produit{filteredCatalog.length !== 1 ? "s" : ""}
                  {activeFilterCount > 0 && " correspondant aux filtres"}
                </p>
              </div>
            )}

            {/* Products grid */}
            {catalogLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Chargement du catalogue…</p>
              </div>
            ) : !filteredCatalog.length ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                  <Package className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Aucun produit trouvé</p>
                <p className="text-xs text-muted-foreground mb-4">Essayez d'ajuster vos filtres ou votre recherche</p>
                {activeFilterCount > 0 && (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={clearFilters}>
                    <X className="w-3.5 h-3.5" /> Réinitialiser les filtres
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {visibleProducts.map((p) => {
                    const existing = requestMap.get(p.id);
                    const isRequested = !!existing;
                    const st = existing ? statusConfig[existing.status] : null;
                    const vd = variantData?.get(p.id);
                    const colors: VariantColor[] = Array.isArray(vd?.variant_colors) ? vd!.variant_colors! : [];
                    const sizes: string[] = Array.isArray(vd?.variant_sizes) ? vd!.variant_sizes! : [];
                    const displayColors = colors.filter(c => c.hex || c.image_url).slice(0, 6);
                    const extraColors = Math.max(0, colors.length - 6);

                    return (
                      <button
                        key={p.id}
                        onClick={() => openDetail(p)}
                        className="group text-left bg-card border border-border rounded-xl overflow-hidden hover:shadow-card-hover hover:border-primary/20 transition-all duration-200"
                      >
                        {/* Image */}
                        <div className="relative aspect-square bg-muted overflow-hidden">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-10 h-10 text-muted-foreground/15" />
                            </div>
                          )}
                          {/* Badges */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1">
                            {p.is_new && (
                              <Badge className="bg-warning text-warning-foreground text-[10px] gap-0.5 shadow-sm">
                                <Sparkles className="w-3 h-3" /> Nouveau
                              </Badge>
                            )}
                          </div>
                          {isRequested && st && (
                            <div className="absolute top-2 right-2">
                              <Badge variant="outline" className={`text-[9px] ${st.className} bg-card/90 backdrop-blur-sm shadow-sm`}>{st.label}</Badge>
                            </div>
                          )}
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-200 flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-card/95 backdrop-blur-sm text-foreground text-xs font-medium px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
                              Voir le détail <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="p-3 space-y-2">
                          <div>
                            <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                              {p.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{p.sku}</p>
                          </div>

                          {/* Color swatches preview */}
                          {displayColors.length > 0 && (
                            <div className="flex items-center gap-0.5">
                              {displayColors.map((c, idx) => (
                                <span
                                  key={idx}
                                  title={c.color}
                                  className="w-4 h-4 rounded-full border border-border/60 shrink-0"
                                  style={c.hex ? { backgroundColor: c.hex.startsWith("#") ? c.hex : `#${c.hex}` } : undefined}
                                >
                                  {!c.hex && c.image_url && (
                                    <img src={c.image_url} alt="" className="w-full h-full rounded-full object-cover" />
                                  )}
                                </span>
                              ))}
                              {extraColors > 0 && (
                                <span className="text-[10px] text-muted-foreground ml-0.5">+{extraColors}</span>
                              )}
                            </div>
                          )}

                          {/* Sizes hint */}
                          {sizes.length > 0 && (
                            <p className="text-[10px] text-muted-foreground">{sizes.length} taille{sizes.length > 1 ? "s" : ""}</p>
                          )}

                          <p className="text-sm font-bold text-primary">
                            {formatCurrency(Number(p.base_price))}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Load more */}
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      className="gap-2 rounded-xl"
                      onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                    >
                      Afficher plus de produits
                      <Badge variant="secondary" className="text-[10px]">{filteredCatalog.length - visibleCount} restants</Badge>
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ════════════ REQUESTS TAB ════════════ */}
          <TabsContent value="requests" className="space-y-4 mt-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher dans mes demandes…"
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  className="pl-10 pr-9 h-11 rounded-xl bg-card"
                />
                {requestSearch && (
                  <button onClick={() => setRequestSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "Toutes" },
                { key: "active", label: "En cours" },
                { key: "added", label: "Ajoutés" },
                { key: "rejected", label: "Rejetés" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setRequestFilter(f.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    requestFilter === f.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card border border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {requestsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : !filteredRequests.length ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                  <Package className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Aucune demande trouvée</p>
                <p className="text-xs text-muted-foreground mb-4">Parcourez le catalogue pour demander des produits</p>
                <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => setActiveTab("catalog")}>
                  <ShoppingBag className="w-4 h-4" /> Parcourir le catalogue
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRequests.map((r) => {
                  const cp = r.catalog_products as any;
                  const st = statusConfig[r.status] || { label: r.status, className: "", icon: Clock };
                  const StatusIcon = st.icon;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setViewRequest(r)}
                      className="w-full text-left bg-card border border-border rounded-xl p-4 hover:shadow-card-hover hover:border-primary/20 transition-all flex items-center gap-4"
                    >
                      {cp?.image_url ? (
                        <img src={cp.image_url} alt={cp.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Package className="w-6 h-6 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{cp?.name}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{cp?.sku}</p>
                        {r.admin_note && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">💬 {r.admin_note}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge variant="outline" className={`text-[10px] gap-1 ${st.className}`}>
                          <StatusIcon className="w-3 h-3" />
                          {st.label}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ════════════ PRODUCT DETAIL DIALOG ════════════ */}
      <Dialog
        open={!!detailProduct}
        onOpenChange={(v) => {
          if (!v) { setDetailProduct(null); setNote(""); setSelectedColor(null); }
        }}
      >
        <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[90vh] overflow-hidden">
          {detailProduct && (() => {
            const existing = requestMap.get(detailProduct.id);
            const isRequested = !!existing;
            const st = existing ? statusConfig[existing.status] : null;
            const categoryParts = detailProduct.category?.split(">").map((s: string) => s.trim()).filter(Boolean) || [];

            const colors: VariantColor[] =
              Array.isArray(detailProduct.variant_colors) ? detailProduct.variant_colors : [];
            const sizes: string[] =
              Array.isArray(detailProduct.variant_sizes) ? detailProduct.variant_sizes : [];

            const displayImage = selectedColor?.image_url || detailProduct.image_url;

            return (
              <div className="flex flex-col sm:flex-row max-h-[90vh]">
                {/* Left: Image */}
                <div className="sm:w-1/2 bg-muted flex items-center justify-center shrink-0 relative min-h-[220px] sm:min-h-0">
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt={detailProduct.name}
                      className="w-full h-full object-cover sm:absolute sm:inset-0 transition-all duration-300"
                    />
                  ) : (
                    <Package className="w-16 h-16 text-muted-foreground/20" />
                  )}
                  {detailProduct.is_new && (
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-warning text-warning-foreground text-[10px] gap-1 shadow-sm">
                        <Sparkles className="w-3 h-3" /> Nouveau
                      </Badge>
                    </div>
                  )}
                  {/* Color thumbnail strip on image */}
                  {colors.length > 1 && (
                    <div className="absolute bottom-3 left-3 right-3 flex gap-1.5 flex-wrap">
                      {colors.slice(0, 8).map((c, idx) => {
                        const isActive = selectedColor?.color === c.color;
                        return (
                          <button
                            key={idx}
                            title={c.color}
                            onClick={() => setSelectedColor(isActive ? null : c)}
                            className={`w-8 h-8 rounded-lg border-2 overflow-hidden transition-all shadow-sm ${isActive ? "border-primary ring-2 ring-primary/40 scale-110" : "border-card/80 hover:border-primary/60"}`}
                          >
                            {c.image_url ? (
                              <img src={c.image_url} alt={c.color} className="w-full h-full object-cover" />
                            ) : c.hex ? (
                              <span className="w-full h-full block" style={{ backgroundColor: c.hex.startsWith("#") ? c.hex : `#${c.hex}` }} />
                            ) : (
                              <span className="w-full h-full block bg-muted" />
                            )}
                          </button>
                        );
                      })}
                      {colors.length > 8 && (
                        <span className="w-8 h-8 rounded-lg bg-card/80 backdrop-blur-sm flex items-center justify-center text-[10px] font-medium text-muted-foreground border-2 border-card/80">
                          +{colors.length - 8}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Details */}
                <div className="sm:w-1/2 overflow-y-auto p-6 space-y-4">
                  {/* Category breadcrumb */}
                  {categoryParts.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {categoryParts.map((part: string, idx: number) => (
                        <span key={idx} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          {idx > 0 && <span className="text-border">›</span>}
                          <span className={idx === categoryParts.length - 1 ? "font-medium text-foreground" : ""}>{part}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold text-foreground leading-tight">{detailProduct.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-1">Réf. {detailProduct.sku}</p>
                  </div>

                  {detailProduct.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{detailProduct.description}</p>
                  )}

                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-bold text-primary">{formatCurrency(Number(detailProduct.base_price))}</span>
                    <span className="text-xs text-muted-foreground">prix indicatif HT</span>
                  </div>

                  {/* Colors */}
                  {colors.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-foreground mb-2">
                        {colors.length} couleur{colors.length > 1 ? "s" : ""} disponible{colors.length > 1 ? "s" : ""}
                        {selectedColor && <span className="font-normal text-muted-foreground ml-1.5">— {selectedColor.color}</span>}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {colors.map((c, idx) => {
                          const isActive = selectedColor?.color === c.color;
                          return (
                            <button
                              key={idx}
                              title={c.color}
                              onClick={() => setSelectedColor(isActive ? null : c)}
                              className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${isActive ? "border-primary ring-2 ring-primary/30 scale-110" : "border-border hover:border-primary/50"}`}
                            >
                              {c.hex ? (
                                <span className="w-5 h-5 rounded-full block" style={{ backgroundColor: c.hex.startsWith("#") ? c.hex : `#${c.hex}` }} />
                              ) : c.image_url ? (
                                <img src={c.image_url} alt={c.color} className="w-5 h-5 rounded-full object-cover block" />
                              ) : (
                                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 block" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sizes */}
                  {sizes.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-foreground mb-2">{sizes.length} taille{sizes.length > 1 ? "s" : ""}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {sizes.map((s, idx) => (
                          <span key={idx} className="px-2.5 py-1 text-[11px] font-medium bg-secondary text-foreground rounded-md border border-border">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Request status or form */}
                  <div className="pt-2 border-t border-border">
                    {isRequested && st ? (
                      <div className={`rounded-xl border p-3.5 ${st.className}`}>
                        <div className="flex items-center gap-2">
                          <st.icon className="w-4 h-4" />
                          <span className="text-sm font-medium">Demande {st.label.toLowerCase()}</span>
                        </div>
                        {existing.admin_note && <p className="text-xs mt-2 opacity-80">💬 {existing.admin_note}</p>}
                        <Button variant="outline" size="sm" className="mt-2 gap-1.5 h-7 text-xs rounded-lg" onClick={() => { setDetailProduct(null); setViewRequest(existing); }}>
                          <Eye className="w-3.5 h-3.5" /> Voir ma demande
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Note pour INKOO (optionnel)</label>
                          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Couleurs souhaitées, quantités, emplacement du logo…" rows={2} className="text-sm rounded-xl resize-none" />
                        </div>
                        <Button className="w-full gap-2 h-10 rounded-xl" onClick={() => submitRequest.mutate()} disabled={submitRequest.isPending}>
                          {submitRequest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Demander l'ajout à ma boutique
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ════════════ VIEW REQUEST DETAIL DIALOG ════════════ */}
      <Dialog open={!!viewRequest} onOpenChange={(v) => !v && setViewRequest(null)}>
        <DialogContent className="sm:max-w-md">
          {viewRequest && (() => {
            const cp = viewRequest.catalog_products as any;
            const st = statusConfig[viewRequest.status] || { label: viewRequest.status, className: "", icon: Clock };
            const allStatuses = ["requested", "in_discussion", "bat_sent", "validated", "added"];
            const currentIdx = allStatuses.indexOf(viewRequest.status);
            const isRejected = viewRequest.status === "rejected";
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Suivi de la demande</DialogTitle>
                  <DialogDescription>{cp?.name}</DialogDescription>
                </DialogHeader>
                <div className="space-y-5">
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-secondary/50 border border-border">
                    {cp?.image_url ? (
                      <img src={cp.image_url} alt={cp.name} className="w-14 h-14 rounded-lg object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{cp?.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{cp?.sku}</p>
                      <p className="text-sm font-medium text-primary mt-0.5">{formatCurrency(Number(cp?.base_price || 0))}</p>
                    </div>
                  </div>
                  <div className="space-y-0">
                    {(isRejected
                      ? [...allStatuses.slice(0, Math.max(currentIdx, 1)), "rejected"]
                      : allStatuses
                    ).map((s, idx) => {
                      const sc = statusConfig[s];
                      if (!sc) return null;
                      const Icon = sc.icon;
                      const isActive = s === viewRequest.status;
                      const isPast = !isRejected && idx < currentIdx;
                      const isFuture = !isRejected && idx > currentIdx;
                      return (
                        <div key={s} className="flex items-center gap-3 relative">
                          {idx > 0 && (
                            <div className={`absolute left-[11px] -top-3 w-0.5 h-3 ${isPast || isActive ? "bg-primary/30" : "bg-border"}`} />
                          )}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isActive ? "bg-primary text-primary-foreground" : isPast ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                            <Icon className="w-3 h-3" />
                          </div>
                          <span className={`text-sm py-2 ${isActive ? "font-semibold text-foreground" : isFuture ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                            {sc.label}
                          </span>
                          {isActive && <Badge variant="outline" className="text-[9px] ml-auto">Étape actuelle</Badge>}
                        </div>
                      );
                    })}
                  </div>
                  {viewRequest.note && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Votre note</p>
                      <div className="text-sm bg-secondary/50 rounded-xl p-3 border border-border">{viewRequest.note}</div>
                    </div>
                  )}
                  {viewRequest.admin_note && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Réponse INKOO</p>
                      <div className="text-sm bg-primary/5 rounded-xl p-3 border border-primary/10">💬 {viewRequest.admin_note}</div>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground text-center">
                    Demande créée le {new Date(viewRequest.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TenantProductRequests;