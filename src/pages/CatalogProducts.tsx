import { useState, useMemo } from "react";
import CatalogProductDetailDialog from "@/components/CatalogProductDetailDialog";
import TopBar from "@/components/TopBar";
import { SectionHeader } from "@/components/DashboardWidgets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Loader2, MoreHorizontal, Pencil, Trash2, Package, Upload, Eye, RefreshCw, Filter, Gift, Shirt, CheckCircle, XCircle, Sparkles, Printer, ChevronDown, ChevronUp, Palette, Ruler } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { getSimplifiedCategory } from "@/lib/catalog-category-map";
import { getColorFamily, getColorFamilyHex, getSizeGroup, getSizeGroupOrder } from "@/lib/catalog-filter-groups";



type VariantColor = { color: string; hex: string | null; image_url: string | null };

type CatalogProduct = {
  id: string;
  name: string;
  name_en: string | null;
  name_nl: string | null;
  sku: string;
  category: string;
  base_price: number;
  description: string | null;
  description_en: string | null;
  description_nl: string | null;
  image_url: string | null;
  active: boolean;
  created_at: string;
  midocean_id: string | null;
  stock_qty: number;
  last_synced_at: string | null;
  is_new: boolean;
  release_date: string | null;
  variant_colors?: VariantColor[] | null;
  variant_sizes?: string[] | null;
};
const normalizeSourceValue = (value: string | null | undefined) => (value ?? "").trim().toUpperCase();

const getCatalogTab = (product: Pick<CatalogProduct, "midocean_id" | "sku">): "goodies" | "textile" | "autre" => {
  const sourceId = normalizeSourceValue(product.midocean_id);
  const sku = normalizeSourceValue(product.sku);

  if (sourceId.startsWith("PRINT-")) return "autre";
  if (sourceId.startsWith("SS-") || sourceId.startsWith("TT-")) return "textile";

  // Safety net: Midocean SKUs (MOxxxx) are goodies and must never leak into textile.
  if (sourceId.startsWith("MO") || sku.startsWith("MO")) return "goodies";

  return "goodies";
};

const emptyCp = {
  name: "", name_en: "", name_nl: "", sku: "", category: "general",
  base_price: 0, description: "", description_en: "", description_nl: "",
  image_url: "", active: true,
};

const CatalogProducts = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"goodies" | "textile" | "autre">("goodies");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterColors, setFilterColors] = useState<Set<string>>(new Set());
  const [filterSizes, setFilterSizes] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [filterNew, setFilterNew] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogProduct | null>(null);
  const [form, setForm] = useState(emptyCp);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewProduct, setPreviewProduct] = useState<any>(null);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  };

  const bulkActivateMutation = useMutation({
    mutationFn: async (activate: boolean) => {
      const ids = Array.from(selected);
      const { error } = await supabase.from("catalog_products").update({ active: activate }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, activate) => {
      toast.success(`${selected.size} produit(s) ${activate ? "activé(s)" : "désactivé(s)"}`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["catalog-products"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["catalog-products"],
    queryFn: async () => {
      const all: CatalogProduct[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("catalog_products")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...(data as CatalogProduct[]));
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
  });

  const tabProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => getCatalogTab(p) === activeTab);
  }, [products, activeTab]);

  // Goodies supplier filter
  const [goodiesSupplier, setGoodiesSupplier] = useState<"all" | "midocean" | "pfconcept" | "manual">("all");
  const [autreSupplier, setAutreSupplier] = useState<"all" | "printcom" | "manual">("all");

  // Filter by supplier within goodies tab
  const supplierFilteredProducts = useMemo(() => {
    if (activeTab === "goodies") {
      if (goodiesSupplier === "all") return tabProducts;
      if (goodiesSupplier === "midocean") return tabProducts.filter((p) => p.midocean_id && !p.midocean_id.startsWith("PFC-"));
      if (goodiesSupplier === "pfconcept") return tabProducts.filter((p) => p.midocean_id?.startsWith("PFC-"));
      return tabProducts.filter((p) => !p.midocean_id);
    }
    if (activeTab === "autre") {
      if (autreSupplier === "all") return tabProducts;
      if (autreSupplier === "printcom") return tabProducts.filter((p) => p.midocean_id?.startsWith("PRINT-"));
      return tabProducts.filter((p) => !p.midocean_id);
    }
    return tabProducts;
  }, [tabProducts, goodiesSupplier, autreSupplier, activeTab]);

  // Simplified categories with counts
  const simplifiedCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    supplierFilteredProducts.forEach((p) => {
      const simplified = getSimplifiedCategory(p.category, activeTab);
      counts[simplified] = (counts[simplified] || 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [supplierFilteredProducts, activeTab]);

  // Available color FAMILIES across current filtered products
  const availableColorFamilies = useMemo(() => {
    const familyMap = new Map<string, number>();
    supplierFilteredProducts.forEach((p) => {
      const colors = p.variant_colors as VariantColor[] | null;
      if (!Array.isArray(colors)) return;
      // Track families already counted for this product to avoid double-counting
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
  }, [supplierFilteredProducts]);

  // Available size GROUPS across current filtered products
  const availableSizeGroups = useMemo(() => {
    const groupMap = new Map<string, number>();
    supplierFilteredProducts.forEach((p) => {
      const sizes = p.variant_sizes as string[] | null;
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
  }, [supplierFilteredProducts]);

  const newCount = supplierFilteredProducts.filter((p) => p.is_new).length;

  const filtered = useMemo(() => {
    return supplierFilteredProducts.filter((p) => {
      // Double-check tab membership as safety net
      if (getCatalogTab(p) !== activeTab) return false;

      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchesGroup = filterGroup === "all" || getSimplifiedCategory(p.category, activeTab) === filterGroup;
      const matchesActive = filterActive === null || p.active === filterActive;
      const matchesNew = !filterNew || p.is_new;
      // Color filter (by family)
      const matchesColor = filterColors.size === 0 || (() => {
        const colors = p.variant_colors as VariantColor[] | null;
        if (!Array.isArray(colors)) return false;
        return colors.some((c) => filterColors.has(getColorFamily(c.color)));
      })();
      // Size filter (by group)
      const matchesSize = filterSizes.size === 0 || (() => {
        const sizes = p.variant_sizes as string[] | null;
        if (!Array.isArray(sizes)) return false;
        return sizes.some((s) => filterSizes.has(getSizeGroup(s)));
      })();
      return matchesSearch && matchesGroup && matchesActive && matchesNew && matchesColor && matchesSize;
    });
  }, [supplierFilteredProducts, activeTab, search, filterGroup, filterActive, filterNew, filterColors, filterSizes]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyCp);
    setDialogOpen(true);
  };

  const openEdit = (p: CatalogProduct) => {
    setEditing(p);
    setForm({
      name: p.name, name_en: p.name_en || "", name_nl: p.name_nl || "",
      sku: p.sku, category: p.category, base_price: p.base_price,
      description: p.description || "", description_en: p.description_en || "",
      description_nl: p.description_nl || "", image_url: p.image_url || "",
      active: p.active,
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `catalog/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
    setUploading(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        name_en: form.name_en.trim() || null,
        name_nl: form.name_nl.trim() || null,
        sku: form.sku.trim(),
        category: form.category.trim() || "general",
        base_price: Number(form.base_price) || 0,
        description: form.description.trim() || null,
        description_en: form.description_en.trim() || null,
        description_nl: form.description_nl.trim() || null,
        image_url: form.image_url.trim() || null,
        active: form.active,
      };
      if (editing) {
        const { error } = await supabase.from("catalog_products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("catalog_products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? t("catalogAdmin.productUpdated") : t("catalogAdmin.productCreated"));
      qc.invalidateQueries({ queryKey: ["catalog-products"] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("catalog_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("catalogAdmin.productDeleted"));
      qc.invalidateQueries({ queryKey: ["catalog-products"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const activeCount = supplierFilteredProducts.filter((p) => p.active).length;
  const goodiesCount = products?.filter((p) => getCatalogTab(p) === "goodies").length || 0;
  const textileCount = products?.filter((p) => getCatalogTab(p) === "textile").length || 0;
  const autreCount = products?.filter((p) => getCatalogTab(p) === "autre").length || 0;

  const syncPfConcept = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-pfconcept");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`PF Concept : ${data.created} créés, ${data.updated} mis à jour${data.authenticated ? "" : " (sans prix authentifiés)"}`);
      qc.invalidateQueries({ queryKey: ["catalog-products"] });
    },
    onError: (err: any) => toast.error(`Erreur sync PF Concept : ${err.message}`),
  });

  const syncMidocean = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-midocean");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Midocean : ${data.created} créés, ${data.updated} mis à jour`);
      qc.invalidateQueries({ queryKey: ["catalog-products"] });
    },
    onError: (err: any) => toast.error(`Erreur sync Midocean : ${err.message}`),
  });

  const syncStanleyStella = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-stanleystella");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Stanley/Stella : ${data.created} créés, ${data.updated} mis à jour`);
      qc.invalidateQueries({ queryKey: ["catalog-products"] });
    },
    onError: (err: any) => toast.error(`Erreur sync Stanley/Stella : ${err.message}`),
  });

  // TopTex
  const [toptexBrandDialogOpen, setToptexBrandDialogOpen] = useState(false);
  const [toptexBrands, setToptexBrands] = useState<string[]>([]);
  const [toptexSelectedBrands, setToptexSelectedBrands] = useState<Set<string>>(new Set());
  const [toptexLoadingBrands, setToptexLoadingBrands] = useState(false);

  const loadToptexBrands = async () => {
    setToptexLoadingBrands(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-toptex", {
        body: { action: "brands" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setToptexBrands(data.brands || []);
      setToptexBrandDialogOpen(true);
    } catch (err: any) {
      toast.error(`Erreur chargement marques TopTex : ${err.message}`);
    } finally {
      setToptexLoadingBrands(false);
    }
  };

  const syncToptex = useMutation({
    mutationFn: async () => {
      const brands = Array.from(toptexSelectedBrands);
      const { data, error } = await supabase.functions.invoke("sync-toptex", {
        body: { action: "sync", brands },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`TopTex : ${data.created} créés, ${data.updated} mis à jour`);
      qc.invalidateQueries({ queryKey: ["catalog-products"] });
      setToptexBrandDialogOpen(false);
    },
    onError: (err: any) => toast.error(`Erreur sync TopTex : ${err.message}`),
  });

  const syncPrintcom = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-printcom");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Print.com : ${data.created} créés, ${data.updated} mis à jour`);
      qc.invalidateQueries({ queryKey: ["catalog-products"] });
    },
    onError: (err: any) => toast.error(`Erreur sync Print.com : ${err.message}`),
  });

  const enrichPrintcom = useMutation({
    mutationFn: async () => {
      let totalEnriched = 0;
      let offset = 0;
      const batchSize = 30;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase.functions.invoke("sync-printcom", {
          body: { action: "enrich", batchSize, offset },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        totalEnriched += data.enriched || 0;
        if (!data.enriched || data.enriched === 0 || data.total < batchSize) {
          hasMore = false;
        } else {
          offset = data.nextOffset;
        }
      }
      return { enriched: totalEnriched };
    },
    onSuccess: (data) => {
      toast.success(`Print.com : ${data.enriched} produits enrichis (catégories & noms)`);
      qc.invalidateQueries({ queryKey: ["catalog-products"] });
    },
    onError: (err: any) => toast.error(`Erreur enrichissement Print.com : ${err.message}`),
  });

  return (
    <>
      <TopBar title={t("catalogAdmin.title")} subtitle={t("catalogAdmin.subtitle")} />
      <div className="p-6 space-y-6 overflow-auto">
        {/* Stats */}
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "goodies" | "textile" | "autre"); setFilterGroup("all"); setFilterColors(new Set()); setFilterSizes(new Set()); setSearch(""); }}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="goodies" className="gap-1.5">
                <Gift className="w-4 h-4" />
                Goodies ({goodiesCount})
              </TabsTrigger>
              <TabsTrigger value="textile" className="gap-1.5">
                <Shirt className="w-4 h-4" />
                Textile ({textileCount})
              </TabsTrigger>
              <TabsTrigger value="autre" className="gap-1.5">
                <Printer className="w-4 h-4" />
                Signalétique ({autreCount})
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{supplierFilteredProducts.length} produits</span>
              <span>·</span>
              <span>{activeCount} actifs</span>
            </div>
          </div>
        </Tabs>

        {/* Supplier filter for goodies tab */}
        {activeTab === "goodies" && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Fournisseur :</span>
            {([
              ["all", "Tous", tabProducts.length],
              ["midocean", "Midocean", tabProducts.filter(p => p.midocean_id && !p.midocean_id.startsWith("PFC-")).length],
              ["pfconcept", "PF Concept", tabProducts.filter(p => p.midocean_id?.startsWith("PFC-")).length],
              ["manual", "Manuel", tabProducts.filter(p => !p.midocean_id).length],
            ] as [string, string, number][]).filter(([, , count]) => count > 0).map(([key, label, count]) => (
              <Button
                key={key}
                size="sm"
                variant={goodiesSupplier === key ? "default" : "outline"}
                className="h-7 text-xs rounded-full px-3"
                onClick={() => { setGoodiesSupplier(key as any); setFilterGroup("all"); }}
              >
                {label} ({count})
              </Button>
            ))}
          </div>
        )}

        {/* Supplier filter for autre tab */}
        {activeTab === "autre" && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Fournisseur :</span>
            {([
              ["all", "Tous", tabProducts.length],
              ["printcom", "Print.com", tabProducts.filter(p => p.midocean_id?.startsWith("PRINT-")).length],
              ["manual", "Manuel", tabProducts.filter(p => !p.midocean_id).length],
            ] as [string, string, number][]).filter(([, , count]) => count > 0).map(([key, label, count]) => (
              <Button
                key={key}
                size="sm"
                variant={autreSupplier === key ? "default" : "outline"}
                className="h-7 text-xs rounded-full px-3"
                onClick={() => { setAutreSupplier(key as any); setFilterGroup("all"); }}
              >
                {label} ({count})
              </Button>
            ))}
          </div>
        )}

        {/* Simplified category pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            size="sm"
            variant={filterGroup === "all" ? "default" : "outline"}
            className="h-7 text-xs rounded-full px-3"
            onClick={() => setFilterGroup("all")}
          >
            Tout ({supplierFilteredProducts.length})
          </Button>
          {simplifiedCategories.map(([cat, count]) => (
            <Button
              key={cat}
              size="sm"
              variant={filterGroup === cat ? "default" : "outline"}
              className="h-7 text-xs rounded-full px-3"
              onClick={() => setFilterGroup(cat)}
            >
              {cat} ({count})
            </Button>
          ))}
        </div>

        {/* Nouveautés + Active filter + Filters toggle + reset */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={filterNew ? "default" : "outline"}
            className="h-7 text-xs rounded-full px-3 gap-1.5"
            onClick={() => setFilterNew(!filterNew)}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Nouveautés ({newCount})
          </Button>
          <ToggleGroup
            type="single"
            value={filterActive === null ? "all" : filterActive ? "active" : "inactive"}
            onValueChange={(val) => {
              if (val === "active") setFilterActive(true);
              else if (val === "inactive") setFilterActive(false);
              else setFilterActive(null);
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="all" className="text-xs px-3 h-7">Tous</ToggleGroupItem>
            <ToggleGroupItem value="active" className="text-xs px-3 h-7">Actifs</ToggleGroupItem>
            <ToggleGroupItem value="inactive" className="text-xs px-3 h-7">Inactifs</ToggleGroupItem>
          </ToggleGroup>

          {/* Color/Size filter toggle */}
          {(availableColorFamilies.length > 0 || availableSizeGroups.length > 0) && (
            <Button
              size="sm"
              variant={showFilters ? "secondary" : "outline"}
              className="h-7 text-xs rounded-full px-3 gap-1.5"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-3.5 h-3.5" />
              Filtres
              {(filterColors.size + filterSizes.size) > 0 && (
                <Badge className="ml-1 h-4 px-1.5 text-[9px] bg-primary text-primary-foreground">{filterColors.size + filterSizes.size}</Badge>
              )}
              {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          )}

          {(filterGroup !== "all" || filterActive !== null || filterNew || filterColors.size > 0 || filterSizes.size > 0) && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => { setFilterGroup("all"); setFilterActive(null); setFilterNew(false); setFilterColors(new Set()); setFilterSizes(new Set()); }}>
              Réinitialiser
            </Button>
          )}
        </div>

        {/* Collapsible color/size filter panel */}
        {showFilters && (
          <div className="bg-card rounded-lg border border-border p-4 space-y-4 animate-fade-in">
            {/* Color families */}
            {availableColorFamilies.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">Couleurs</span>
                  {filterColors.size > 0 && (
                    <button className="text-[10px] text-primary hover:underline ml-auto" onClick={() => setFilterColors(new Set())}>
                      Effacer
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {availableColorFamilies.map((c) => {
                    const isActive = filterColors.has(c.family);
                    const isGradient = c.hex.startsWith("linear");
                    return (
                      <button
                        key={c.family}
                        onClick={() => {
                          setFilterColors((prev) => {
                            const next = new Set(prev);
                            if (next.has(c.family)) next.delete(c.family); else next.add(c.family);
                            return next;
                          });
                        }}
                        className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] transition-all ${
                          isActive
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border hover:border-primary/50 text-muted-foreground"
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-border/50 shrink-0"
                          style={isGradient ? { background: c.hex } : { backgroundColor: c.hex }}
                        />
                        <span>{c.family}</span>
                        <span className="text-[9px] text-muted-foreground">({c.count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size groups */}
            {availableSizeGroups.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Ruler className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">Tailles</span>
                  {filterSizes.size > 0 && (
                    <button className="text-[10px] text-primary hover:underline ml-auto" onClick={() => setFilterSizes(new Set())}>
                      Effacer
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {availableSizeGroups.map((s) => {
                    const isActive = filterSizes.has(s.group);
                    return (
                      <button
                        key={s.group}
                        onClick={() => {
                          setFilterSizes((prev) => {
                            const next = new Set(prev);
                            if (next.has(s.group)) next.delete(s.group); else next.add(s.group);
                            return next;
                          });
                        }}
                        className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-md border text-[11px] transition-all ${
                          isActive
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border hover:border-primary/50 text-muted-foreground"
                        }`}
                      >
                        {s.group}
                        <span className="text-[9px] text-muted-foreground">({s.count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          <div className="p-5 border-b border-border">
            <SectionHeader
              title={`${t("catalogAdmin.title")} (${filtered?.length || 0})`}
              action={
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 w-52 text-sm" />
                  </div>
                  {activeTab === "goodies" && (
                    <>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => syncMidocean.mutate()} disabled={syncMidocean.isPending}>
                        {syncMidocean.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Sync Midocean
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => syncPfConcept.mutate()} disabled={syncPfConcept.isPending}>
                        {syncPfConcept.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Sync PF Concept
                      </Button>
                    </>
                  )}
                  {activeTab === "textile" && (
                    <>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => syncStanleyStella.mutate()} disabled={syncStanleyStella.isPending}>
                        {syncStanleyStella.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Sync Stanley/Stella
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={loadToptexBrands} disabled={toptexLoadingBrands || syncToptex.isPending}>
                        {(toptexLoadingBrands || syncToptex.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Sync TopTex
                      </Button>
                    </>
                  )}
                  {activeTab === "autre" && (
                    <>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => syncPrintcom.mutate()} disabled={syncPrintcom.isPending}>
                        {syncPrintcom.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Sync Print.com
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => enrichPrintcom.mutate()} disabled={enrichPrintcom.isPending}>
                        {enrichPrintcom.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Enrichir catégories
                      </Button>
                    </>
                  )}
                  <Button size="sm" className="gap-1.5" onClick={openCreate}>
                    <Plus className="w-4 h-4" /> {t("catalogAdmin.addProduct")}
                  </Button>
                </div>
              }
            />
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !filtered?.length ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{search ? t("catalogAdmin.noProductFound") : t("catalogAdmin.noProduct")}</p>
            </div>
          ) : (
            <>
              {selected.size > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border">
                  <span className="text-sm font-medium">{selected.size} sélectionné(s)</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => bulkActivateMutation.mutate(true)} disabled={bulkActivateMutation.isPending}>
                    <CheckCircle className="w-3.5 h-3.5" /> Activer
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => bulkActivateMutation.mutate(false)} disabled={bulkActivateMutation.isPending}>
                    <XCircle className="w-3.5 h-3.5" /> Désactiver
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(new Set())}>Annuler</Button>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filtered.length > 0 && selected.size === filtered.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-xs">{t("common.product")}</TableHead>
                    <TableHead className="text-xs">SKU</TableHead>
                    <TableHead className="text-xs">{t("common.category")}</TableHead>
                    <TableHead className="text-xs">{t("catalogAdmin.basePrice")}</TableHead>
                    <TableHead className="text-xs">Stock</TableHead>
                    <TableHead className="text-xs">{t("common.status")}</TableHead>
                    <TableHead className="text-xs w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((product, i) => (
                    <TableRow key={product.id} className={`text-sm animate-fade-in cursor-pointer ${selected.has(product.id) ? "bg-primary/5" : ""}`} style={{ animationDelay: `${i * 30}ms` }} onClick={() => setPreviewProduct(product)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(product.id)}
                          onCheckedChange={() => toggleSelect(product.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded-md object-cover border border-border" />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center">
                              <Package className="w-4 h-4 text-muted-foreground/30" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-foreground">{product.name}</p>
                              {(product as any).is_new && (
                                <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[9px] px-1.5 py-0 h-4 gap-0.5">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  Nouveau
                                </Badge>
                              )}
                            </div>
                            {product.description && <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{product.description}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize" title={product.category}>{getSimplifiedCategory(product.category, activeTab)}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(product.base_price)}</TableCell>
                      <TableCell className="text-xs font-medium">{product.stock_qty}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={product.active}
                          onCheckedChange={async (checked) => {
                            const { error } = await supabase.from("catalog_products").update({ active: checked }).eq("id", product.id);
                            if (error) { toast.error(error.message); return; }
                            qc.invalidateQueries({ queryKey: ["catalog-products"] });
                            toast.success(checked ? "Produit activé" : "Produit désactivé");
                          }}
                        />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setPreviewProduct(product)}>
                              <Eye className="w-4 h-4 mr-2" /> Aperçu
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(product)}>
                              <Pencil className="w-4 h-4 mr-2" /> {t("common.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(product.id)}>
                              <Trash2 className="w-4 h-4 mr-2" /> {t("common.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("catalogAdmin.editProduct") : t("catalogAdmin.addProduct")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Image */}
            <div className="space-y-2">
              <Label>{t("common.image")}</Label>
              <div className="flex items-center gap-4">
                {form.image_url ? (
                  <img src={form.image_url} alt="" className="w-20 h-20 rounded-lg object-cover border border-border" />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-secondary flex items-center justify-center">
                    <Package className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="inline-flex items-center gap-1.5 text-sm text-primary cursor-pointer hover:underline">
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? t("common.loading") : t("catalogAdmin.uploadImage")}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                  {form.image_url && (
                    <button className="text-xs text-destructive hover:underline block" onClick={() => setForm((f) => ({ ...f, image_url: "" }))}>
                      {t("common.delete")}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Name FR */}
            <div className="space-y-2">
              <Label>{t("common.name")} (FR) *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="T-shirt Premium" required />
            </div>

            {/* Name EN & NL */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("common.name")} (EN)</Label>
                <Input value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} placeholder="Premium T-Shirt" />
              </div>
              <div className="space-y-2">
                <Label>{t("common.name")} (NL)</Label>
                <Input value={form.name_nl} onChange={(e) => setForm((f) => ({ ...f, name_nl: e.target.value }))} placeholder="Premium T-Shirt" />
              </div>
            </div>

            {/* SKU & Category */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>SKU *</Label>
                <Input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} placeholder="TSH-PREM-001" required />
              </div>
              <div className="space-y-2">
                <Label>{t("common.category")}</Label>
                <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="textile" />
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label>{t("catalogAdmin.basePrice")} (€)</Label>
              <Input type="number" min={0} step={0.01} value={form.base_price} onChange={(e) => setForm((f) => ({ ...f, base_price: parseFloat(e.target.value) || 0 }))} />
            </div>

            {/* Description FR */}
            <div className="space-y-2">
              <Label>{t("common.description")} (FR)</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>

            {/* Description EN & NL */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("common.description")} (EN)</Label>
                <Textarea value={form.description_en} onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>{t("common.description")} (NL)</Label>
                <Textarea value={form.description_nl} onChange={(e) => setForm((f) => ({ ...f, description_nl: e.target.value }))} rows={2} />
              </div>
            </div>

            {/* Active */}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">{t("catalogAdmin.visibleInCatalog")}</p>
                <p className="text-xs text-muted-foreground">{t("catalogAdmin.visibleDesc")}</p>
              </div>
              <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name.trim() || !form.sku.trim()}>
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {editing ? t("common.update") : t("common.create")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* TopTex Brand Selection Dialog */}
      <Dialog open={toptexBrandDialogOpen} onOpenChange={setToptexBrandDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Sélectionner les marques TopTex à importer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => setToptexSelectedBrands(new Set(toptexBrands))}
              >
                Tout sélectionner
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => setToptexSelectedBrands(new Set())}
              >
                Tout désélectionner
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">
                {toptexSelectedBrands.size} / {toptexBrands.length} marques
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-[50vh] overflow-y-auto pr-2">
              {toptexBrands.map((brand) => (
                <label
                  key={brand}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={toptexSelectedBrands.has(brand)}
                    onCheckedChange={(checked) => {
                      setToptexSelectedBrands((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(brand); else next.delete(brand);
                        return next;
                      });
                    }}
                  />
                  {brand}
                </label>
              ))}
            </div>
            <Button
              className="w-full gap-1.5"
              disabled={toptexSelectedBrands.size === 0 || syncToptex.isPending}
              onClick={() => syncToptex.mutate()}
            >
              {syncToptex.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Importer {toptexSelectedBrands.size} marque(s)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <CatalogProductDetailDialog
        product={previewProduct}
        open={!!previewProduct}
        onOpenChange={(open) => !open && setPreviewProduct(null)}
        hideRequestButton
      />
    </>
  );
};

export default CatalogProducts;
