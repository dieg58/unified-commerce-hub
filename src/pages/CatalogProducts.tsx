import { useState, useMemo, useCallback, useRef } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { Plus, Search, Loader2, MoreHorizontal, Pencil, Trash2, Package, Upload, Eye, RefreshCw, Filter, Gift, Shirt, CheckCircle, XCircle, Sparkles, Printer, ChevronDown, ChevronUp, Palette, Ruler, Layers, FileSpreadsheet } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mock-data";
import { read, utils } from "xlsx";

/** TopTex products store purchase price — apply 1.81× markup for selling price */
function getSellingPrice(basePrice: number, midoceanId?: string | null): number {
  if (midoceanId && midoceanId.startsWith("TT-")) return basePrice * 1.81;
  return basePrice;
}
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { getSimplifiedCategory, getCatalogTabByCategory, getSimplifiedSubCategory } from "@/lib/catalog-category-map";
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
  brand?: string | null;
  product_family?: string[] | null;
  tags?: string[] | null;
};
const getCatalogTab = (product: Pick<CatalogProduct, "midocean_id" | "category">): "goodies" | "textile" | "autre" => {
  return getCatalogTabByCategory(product.category, product.midocean_id);
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
  const [filterSubCategory, setFilterSubCategory] = useState<string>("all");
  const [filterColors, setFilterColors] = useState<Set<string>>(new Set());
  const [filterSizes, setFilterSizes] = useState<Set<string>>(new Set());
  const [filterFamilies, setFilterFamilies] = useState<Set<string>>(new Set());
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set());
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

  const openPreview = useCallback(async (product: CatalogProduct) => {
    try {
      const { data, error } = await supabase
        .from("catalog_products")
        .select("variant_colors,variant_sizes")
        .eq("id", product.id)
        .single();
      if (error) throw error;
      setPreviewProduct({
        ...product,
        variant_colors: (data?.variant_colors as VariantColor[] | null) ?? null,
        variant_sizes: (data?.variant_sizes as string[] | null) ?? null,
      });
    } catch {
      setPreviewProduct(product);
    }
  }, []);

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
      const batchSize = 500;
      for (let i = 0; i < ids.length; i += batchSize) {
        const { error } = await supabase.from("catalog_products").update({ active: activate }).in("id", ids.slice(i, i + batchSize));
        if (error) throw error;
      }
    },
    onSuccess: (_, activate) => {
      toast.success(`${selected.size} produit(s) ${activate ? "activé(s)" : "désactivé(s)"}`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["catalog-products"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Lightweight listing query: skip heavy JSONB columns for speed
  const LISTING_COLUMNS = "id,name,name_en,name_nl,sku,category,base_price,description,description_en,description_nl,image_url,active,created_at,midocean_id,stock_qty,last_synced_at,is_new,release_date,brand,product_family,tags" as const;

  const { data: products, isLoading } = useQuery({
    queryKey: ["catalog-products"],
    queryFn: async () => {
      const all: CatalogProduct[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("catalog_products")
          .select(LISTING_COLUMNS)
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
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });

  // Precompute tab assignment ONCE per product set (avoid repeated regex per product)
  const productsByTab = useMemo(() => {
    if (!products) return { goodies: [] as CatalogProduct[], textile: [] as CatalogProduct[], autre: [] as CatalogProduct[] };
    const result = { goodies: [] as CatalogProduct[], textile: [] as CatalogProduct[], autre: [] as CatalogProduct[] };
    for (const p of products) {
      result[getCatalogTab(p)].push(p);
    }
    return result;
  }, [products]);

  const tabProducts = productsByTab[activeTab];

  // Fetch variant data lazily only when filter panel is open
  const { data: variantData } = useQuery({
    queryKey: ["catalog-variants"],
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
    enabled: showFilters, // Only fetch when filter panel is open
    staleTime: 5 * 60 * 1000,
  });

  // Goodies supplier filter
  const [goodiesSupplier, setGoodiesSupplier] = useState<"all" | "midocean" | "pfconcept" | "xdconnects" | "manual">("all");
  const [autreSupplier, setAutreSupplier] = useState<"all" | "printcom" | "manual">("all");
  const [textileSupplier, setTextileSupplier] = useState<"all" | "stanleystella" | "toptex" | "newwave" | "manual">("all");
  const [toptexBrandFilter, setToptexBrandFilter] = useState<string>("all");
  const [toptexBrandManageOpen, setToptexBrandManageOpen] = useState(false);
  const [newwaveImportOpen, setNewwaveImportOpen] = useState(false);
  const [newwaveImporting, setNewwaveImporting] = useState(false);
  const newwaveFileRef = useRef<HTMLInputElement>(null);

  // Extract unique TopTex brands from products (including null-brand products)
  const toptexBrandsInCatalog = useMemo(() => {
    if (!products) return [];
    const brandMap = new Map<string, { total: number; active: number }>();
    for (const p of products) {
      if (!p.midocean_id?.startsWith("TT-")) continue;
      const brandKey = p.brand || "__no_brand__";
      const entry = brandMap.get(brandKey) || { total: 0, active: 0 };
      entry.total++;
      if (p.active) entry.active++;
      brandMap.set(brandKey, entry);
    }
    return Array.from(brandMap.entries())
      .map(([brand, stats]) => ({ brand, ...stats }))
      .sort((a, b) => {
        // Put "(Sans marque)" at the top
        if (a.brand === "__no_brand__") return -1;
        if (b.brand === "__no_brand__") return 1;
        return a.brand.localeCompare(b.brand);
      });
  }, [products]);

  // Filter by supplier within goodies tab
  const supplierFilteredProducts = useMemo(() => {
    if (activeTab === "goodies") {
      if (goodiesSupplier === "all") return tabProducts;
      if (goodiesSupplier === "midocean") return tabProducts.filter((p) => p.midocean_id && !p.midocean_id.startsWith("PFC-") && !p.midocean_id.startsWith("XDC-"));
      if (goodiesSupplier === "pfconcept") return tabProducts.filter((p) => p.midocean_id?.startsWith("PFC-"));
      if (goodiesSupplier === "xdconnects") return tabProducts.filter((p) => p.midocean_id?.startsWith("XDC-"));
      return tabProducts.filter((p) => !p.midocean_id);
    }
    if (activeTab === "textile") {
      let filtered = tabProducts;
      if (textileSupplier === "stanleystella") filtered = tabProducts.filter((p) => p.midocean_id?.startsWith("SS-"));
      else if (textileSupplier === "toptex") filtered = tabProducts.filter((p) => p.midocean_id?.startsWith("TT-"));
      else if (textileSupplier === "newwave") filtered = tabProducts.filter((p) => p.midocean_id?.startsWith("NW-"));
      else if (textileSupplier === "manual") filtered = tabProducts.filter((p) => !p.midocean_id);
      // Further filter by TopTex brand
      if (textileSupplier === "toptex" && toptexBrandFilter !== "all") {
        filtered = filtered.filter((p) => toptexBrandFilter === "__no_brand__" ? !p.brand : p.brand === toptexBrandFilter);
      }
      return filtered;
    }
    if (activeTab === "autre") {
      if (autreSupplier === "all") return tabProducts;
      if (autreSupplier === "printcom") return tabProducts.filter((p) => p.midocean_id?.startsWith("PRINT-"));
      return tabProducts.filter((p) => !p.midocean_id);
    }
    return tabProducts;
  }, [tabProducts, goodiesSupplier, autreSupplier, textileSupplier, toptexBrandFilter, activeTab]);

  // Helper: does a product pass search + active + new + color + size filters (everything EXCEPT category/subcategory)?
  const passesNonCategoryFilters = useCallback((p: CatalogProduct, skipFilter?: "new" | "color" | "size" | "family" | "tag") => {
    if (search) {
      const sl = search.toLowerCase();
      if (!p.name.toLowerCase().includes(sl) && !p.sku.toLowerCase().includes(sl) && !p.category.toLowerCase().includes(sl)) return false;
    }
    if (filterActive !== null && p.active !== filterActive) return false;
    if (skipFilter !== "new" && filterNew && !p.is_new) return false;
    if (skipFilter !== "color" && filterColors.size > 0) {
      const vd = variantData?.get(p.id);
      const colors = vd?.variant_colors;
      if (!Array.isArray(colors) || !colors.some((c) => filterColors.has(getColorFamily(c.color)))) return false;
    }
    if (skipFilter !== "size" && filterSizes.size > 0) {
      const vd = variantData?.get(p.id);
      const sizes = vd?.variant_sizes;
      if (!Array.isArray(sizes) || !sizes.some((s) => filterSizes.has(getSizeGroup(s)))) return false;
    }
    if (skipFilter !== "family" && filterFamilies.size > 0) {
      const families = p.product_family;
      if (!Array.isArray(families) || !families.some((f) => filterFamilies.has(f))) return false;
    }
    if (skipFilter !== "tag" && filterTags.size > 0) {
      const tags = p.tags;
      if (!Array.isArray(tags) || !tags.some((t) => filterTags.has(t))) return false;
    }
    return true;
  }, [search, filterActive, filterNew, filterColors, filterSizes, filterFamilies, filterTags, variantData]);

  // Base filtered (no category/subcategory filter) — used for category counts
  const baseFiltered = useMemo(() => {
    return supplierFilteredProducts.filter((p) => passesNonCategoryFilters(p));
  }, [supplierFilteredProducts, passesNonCategoryFilters]);

  // Simplified categories with counts (from baseFiltered)
  const simplifiedCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    baseFiltered.forEach((p) => {
      const simplified = getSimplifiedCategory(p.category, activeTab);
      counts[simplified] = (counts[simplified] || 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [baseFiltered, activeTab]);

  // categFiltered = baseFiltered + category (for subcategory/color/size counts)
  const categFiltered = useMemo(() => {
    if (filterGroup === "all") return baseFiltered;
    return baseFiltered.filter((p) => getSimplifiedCategory(p.category, activeTab) === filterGroup);
  }, [baseFiltered, filterGroup, activeTab]);

  // Available color FAMILIES (from categFiltered, ignoring current color filter)
  const availableColorFamilies = useMemo(() => {
    if (!variantData) return [];
    const familyMap = new Map<string, number>();
    const source = supplierFilteredProducts.filter((p) => passesNonCategoryFilters(p, "color") && (filterGroup === "all" || getSimplifiedCategory(p.category, activeTab) === filterGroup));
    source.forEach((p) => {
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
  }, [supplierFilteredProducts, variantData, passesNonCategoryFilters, filterGroup, activeTab]);

  // Available size GROUPS (from categFiltered, ignoring current size filter)
  const availableSizeGroups = useMemo(() => {
    if (!variantData) return [];
    const groupMap = new Map<string, number>();
    const source = supplierFilteredProducts.filter((p) => passesNonCategoryFilters(p, "size") && (filterGroup === "all" || getSimplifiedCategory(p.category, activeTab) === filterGroup));
    source.forEach((p) => {
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
  }, [supplierFilteredProducts, variantData, passesNonCategoryFilters, filterGroup, activeTab]);

  // Subcategories for the selected simplified category (from categFiltered)
  const subCategories = useMemo(() => {
    if (filterGroup === "all") return [];
    const counts: Record<string, number> = {};
    categFiltered.forEach((p) => {
      const sub = getSimplifiedSubCategory(p.category, filterGroup);
      counts[sub] = (counts[sub] || 0) + 1;
    });
    const entries = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
    return entries.length >= 2 ? entries : [];
  }, [categFiltered, filterGroup]);

  // newCount from products passing all filters except "new" itself
  const newCount = useMemo(() => {
    return supplierFilteredProducts.filter((p) => p.is_new && passesNonCategoryFilters(p, "new") && (filterGroup === "all" || getSimplifiedCategory(p.category, activeTab) === filterGroup)).length;
  }, [supplierFilteredProducts, passesNonCategoryFilters, filterGroup, activeTab]);

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase();
    return supplierFilteredProducts.filter((p) => {
      const matchesSearch = !search ||
        p.name.toLowerCase().includes(searchLower) ||
        p.sku.toLowerCase().includes(searchLower) ||
        p.category.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
      const matchesGroup = filterGroup === "all" || getSimplifiedCategory(p.category, activeTab) === filterGroup;
      if (!matchesGroup) return false;
      if (filterSubCategory !== "all") {
        const sub = getSimplifiedSubCategory(p.category, filterGroup);
        if (sub !== filterSubCategory) return false;
      }
      const matchesActive = filterActive === null || p.active === filterActive;
      if (!matchesActive) return false;
      const matchesNew = !filterNew || p.is_new;
      if (!matchesNew) return false;
      if (filterColors.size > 0) {
        const vd = variantData?.get(p.id);
        const colors = vd?.variant_colors;
        if (!Array.isArray(colors) || !colors.some((c) => filterColors.has(getColorFamily(c.color)))) return false;
      }
      if (filterSizes.size > 0) {
        const vd = variantData?.get(p.id);
        const sizes = vd?.variant_sizes;
        if (!Array.isArray(sizes) || !sizes.some((s) => filterSizes.has(getSizeGroup(s)))) return false;
      }
      if (filterFamilies.size > 0) {
        const families = p.product_family;
        if (!Array.isArray(families) || !families.some((f) => filterFamilies.has(f))) return false;
      }
      if (filterTags.size > 0) {
        const tags = p.tags;
        if (!Array.isArray(tags) || !tags.some((t) => filterTags.has(t))) return false;
      }
      return true;
    });
  }, [supplierFilteredProducts, activeTab, search, filterGroup, filterSubCategory, filterActive, filterNew, filterColors, filterSizes, filterFamilies, filterTags, variantData]);

  // Available product families (from supplier-filtered products)
  const availableFamilies = useMemo(() => {
    const familyMap = new Map<string, number>();
    const source = supplierFilteredProducts.filter((p) => passesNonCategoryFilters(p, "family") && (filterGroup === "all" || getSimplifiedCategory(p.category, activeTab) === filterGroup));
    source.forEach((p) => {
      const families = p.product_family;
      if (!Array.isArray(families)) return;
      for (const f of families) {
        familyMap.set(f, (familyMap.get(f) || 0) + 1);
      }
    });
    return Array.from(familyMap.entries()).sort(([, a], [, b]) => b - a);
  }, [supplierFilteredProducts, passesNonCategoryFilters, filterGroup, activeTab]);

  // Available product tags/labels
  const availableTags = useMemo(() => {
    const tagMap = new Map<string, number>();
    const source = supplierFilteredProducts.filter((p) => passesNonCategoryFilters(p, "tag") && (filterGroup === "all" || getSimplifiedCategory(p.category, activeTab) === filterGroup));
    source.forEach((p) => {
      const tags = p.tags;
      if (!Array.isArray(tags)) return;
      for (const t of tags) {
        tagMap.set(t, (tagMap.get(t) || 0) + 1);
      }
    });
    return Array.from(tagMap.entries()).sort(([, a], [, b]) => b - a);
  }, [supplierFilteredProducts, passesNonCategoryFilters, filterGroup, activeTab]);

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
  const goodiesCount = productsByTab.goodies.length;
  const textileCount = productsByTab.textile.length;
  const autreCount = productsByTab.autre.length;

  // Client-side pagination for performance
  const PAGE_SIZE = 100;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Reset visible count when filters change
  const filteredKey = `${activeTab}-${filterGroup}-${filterSubCategory}-${search}-${filterActive}-${filterNew}-${filterColors.size}-${filterSizes.size}-${filterFamilies.size}-${filterTags.size}`;
  const prevFilteredKey = useRef(filteredKey);
  if (prevFilteredKey.current !== filteredKey) {
    prevFilteredKey.current = filteredKey;
    if (visibleCount !== PAGE_SIZE) setVisibleCount(PAGE_SIZE);
  }
  const visibleProducts = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  const syncXdConnects = useMutation({
    mutationFn: async () => {
      toast.info("Synchronisation XD Connects…");
      let totalCreated = 0, totalUpdated = 0, totalErrors = 0;
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase.functions.invoke("sync-xdconnects", {
          body: { offset },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        totalCreated += data.created || 0;
        totalUpdated += data.updated || 0;
        totalErrors += data.errors || 0;
        hasMore = !!data.hasMore;
        offset = data.nextOffset || offset + 150;
        if (hasMore) toast.info(`XD Connects : ${offset}/${data.total || "?"} traités…`);
      }
      return { created: totalCreated, updated: totalUpdated, errors: totalErrors };
    },
    onSuccess: (data) => {
      toast.success(`XD Connects : ${data.created} créés, ${data.updated} mis à jour`);
      qc.invalidateQueries({ queryKey: ["catalog-products"] });
    },
    onError: (err: any) => toast.error(`Erreur sync XD Connects : ${err.message}`),
  });

  const syncPfConcept = useMutation({
    mutationFn: async () => {
      toast.info("Synchronisation PF Concept…");
      let totalCreated = 0, totalUpdated = 0, totalErrors = 0;
      let offset = 0;
      let hasMore = true;
      let safety = 0;

      while (hasMore && safety < 80) {
        const { data, error } = await supabase.functions.invoke("sync-pfconcept", {
          body: { offset, limit: 40 },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        totalCreated += data.created || 0;
        totalUpdated += data.updated || 0;
        totalErrors += data.errors || 0;

        hasMore = !!data.hasMore;
        const nextOffset = Number(data?.nextOffset);
        offset = Number.isFinite(nextOffset) ? nextOffset : offset + 40;
        safety++;

        if (hasMore) {
          toast.info(`PF Concept : ${offset} traités…`);
        }
      }

      return { created: totalCreated, updated: totalUpdated, errors: totalErrors };
    },
    onSuccess: (data) => {
      toast.success(`PF Concept : ${data.created} créés, ${data.updated} mis à jour`);
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

  const fixToptexBrands = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-toptex", {
        body: { action: "fix_brands" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Marques corrigées : ${data.fixed} produits mis à jour, ${data.remaining} restants`);
      qc.invalidateQueries({ queryKey: ["catalog-products"] });
    },
    onError: (err: any) => toast.error(`Erreur fix marques : ${err.message}`),
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
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "goodies" | "textile" | "autre"); setFilterGroup("all"); setFilterColors(new Set()); setFilterSizes(new Set()); setFilterFamilies(new Set()); setFilterTags(new Set()); setSearch(""); }}>
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

        {/* Supplier filter for textile tab */}
        {activeTab === "textile" && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">Fournisseur :</span>
              {([
                ["all", "Tous", tabProducts.length],
                ["stanleystella", "Stanley/Stella", tabProducts.filter(p => p.midocean_id?.startsWith("SS-")).length],
                ["toptex", "TopTex", tabProducts.filter(p => p.midocean_id?.startsWith("TT-")).length],
                ["newwave", "New Wave", tabProducts.filter(p => p.midocean_id?.startsWith("NW-")).length],
                ["manual", "Manuel", tabProducts.filter(p => !p.midocean_id).length],
              ] as [string, string, number][]).filter(([, , count]) => count > 0).map(([key, label, count]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={textileSupplier === key ? "default" : "outline"}
                  className="h-7 text-xs rounded-full px-3"
                  onClick={() => { setTextileSupplier(key as any); setFilterGroup("all"); setToptexBrandFilter("all"); }}
                >
                  {label} ({count})
                </Button>
              ))}
            </div>
            {/* TopTex brand filter + management */}
            {textileSupplier === "toptex" && toptexBrandsInCatalog.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pl-4">
                <span className="text-xs text-muted-foreground mr-1">Marque :</span>
                <Button
                  size="sm"
                  variant={toptexBrandFilter === "all" ? "default" : "outline"}
                  className="h-6 text-[11px] rounded-full px-2.5"
                  onClick={() => setToptexBrandFilter("all")}
                >
                  Toutes ({tabProducts.filter(p => p.midocean_id?.startsWith("TT-")).length})
                </Button>
                {toptexBrandsInCatalog.map((b) => (
                  <Button
                    key={b.brand}
                    size="sm"
                    variant={toptexBrandFilter === b.brand ? "default" : "outline"}
                    className="h-6 text-[11px] rounded-full px-2.5"
                    onClick={() => setToptexBrandFilter(b.brand)}
                  >
                    {b.brand === "__no_brand__" ? "Sans marque" : b.brand} ({b.total})
                    {b.active < b.total && (
                      <span className="ml-0.5 text-[9px] text-muted-foreground">· {b.active} actifs</span>
                    )}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[11px] rounded-full px-2.5 gap-1 ml-2"
                  onClick={() => setToptexBrandManageOpen(true)}
                >
                  <Layers className="w-3 h-3" />
                  Gérer marques
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "goodies" && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Fournisseur :</span>
            {([
              ["all", "Tous", tabProducts.length],
              ["midocean", "Midocean", tabProducts.filter(p => p.midocean_id && !p.midocean_id.startsWith("PFC-") && !p.midocean_id.startsWith("XDC-")).length],
              ["pfconcept", "PF Concept", tabProducts.filter(p => p.midocean_id?.startsWith("PFC-")).length],
              ["xdconnects", "XD Connects", tabProducts.filter(p => p.midocean_id?.startsWith("XDC-")).length],
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
            onClick={() => { setFilterGroup("all"); setFilterSubCategory("all"); }}
          >
            Tout ({supplierFilteredProducts.length})
          </Button>
          {simplifiedCategories.map(([cat, count]) => (
            <Button
              key={cat}
              size="sm"
              variant={filterGroup === cat ? "default" : "outline"}
              className="h-7 text-xs rounded-full px-3"
              onClick={() => { setFilterGroup(cat); setFilterSubCategory("all"); setShowFilters(true); }}
            >
              {cat} ({count})
            </Button>
          ))}
        </div>

        {/* Subcategory pills removed – now inside filter panel */}

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

          {/* Color/Size filter toggle – always visible */}
          <Button
            size="sm"
            variant={showFilters ? "secondary" : "outline"}
            className="h-7 text-xs rounded-full px-3 gap-1.5"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtres
            {(filterColors.size + filterSizes.size + filterFamilies.size + filterTags.size + (filterSubCategory !== "all" ? 1 : 0)) > 0 && (
              <Badge className="ml-1 h-4 px-1.5 text-[9px] bg-primary text-primary-foreground">{filterColors.size + filterSizes.size + filterFamilies.size + filterTags.size + (filterSubCategory !== "all" ? 1 : 0)}</Badge>
            )}
            {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>

          {(filterGroup !== "all" || filterSubCategory !== "all" || filterActive !== null || filterNew || filterColors.size > 0 || filterSizes.size > 0 || filterFamilies.size > 0 || filterTags.size > 0) && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => { setFilterGroup("all"); setFilterSubCategory("all"); setFilterActive(null); setFilterNew(false); setFilterColors(new Set()); setFilterSizes(new Set()); setFilterFamilies(new Set()); setFilterTags(new Set()); }}>
              Réinitialiser
            </Button>
          )}
        </div>

        {/* Collapsible color/size filter panel */}
        {showFilters && (
          <div className="bg-card rounded-lg border border-border p-4 space-y-4 animate-fade-in">
            {!variantData && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Chargement des filtres…
              </div>
            )}
            {/* Subcategories – collapsible */}
            {subCategories.length > 0 && (
              <Collapsible defaultOpen>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">Sous-catégories de « {filterGroup} »</span>
                  {filterSubCategory !== "all" && (
                    <button className="text-[10px] text-primary hover:underline ml-1" onClick={() => setFilterSubCategory("all")}>
                      Effacer
                    </button>
                  )}
                  <CollapsibleTrigger asChild>
                    <button className="ml-auto text-muted-foreground hover:text-foreground">
                      <ChevronDown className="w-3.5 h-3.5 transition-transform [[data-state=open]>&]:rotate-180" />
                    </button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {subCategories.map(([sub, count]) => {
                      const isActive = filterSubCategory === sub;
                      return (
                        <button
                          key={sub}
                          onClick={() => setFilterSubCategory(isActive ? "all" : sub)}
                          className={`inline-flex items-center gap-1 h-6 px-2.5 rounded-full border text-[11px] transition-all ${
                            isActive
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border hover:border-primary/50 text-muted-foreground"
                          }`}
                        >
                          {sub}
                          <span className="text-[9px] text-muted-foreground">({count})</span>
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
                    <button className="text-[10px] text-primary hover:underline ml-1" onClick={() => setFilterColors(new Set())}>
                      Effacer
                    </button>
                  )}
                  <CollapsibleTrigger asChild>
                    <button className="ml-auto text-muted-foreground hover:text-foreground">
                      <ChevronDown className="w-3.5 h-3.5 transition-transform [[data-state=open]>&]:rotate-180" />
                    </button>
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
                    <button className="text-[10px] text-primary hover:underline ml-1" onClick={() => setFilterSizes(new Set())}>
                      Effacer
                    </button>
                  )}
                  <CollapsibleTrigger asChild>
                    <button className="ml-auto text-muted-foreground hover:text-foreground">
                      <ChevronDown className="w-3.5 h-3.5 transition-transform [[data-state=open]>&]:rotate-180" />
                    </button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
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
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Product Family / Occasion */}
            {availableFamilies.length > 0 && (
              <Collapsible defaultOpen>
                <div className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">Famille / Occasion</span>
                  {filterFamilies.size > 0 && (
                    <button className="text-[10px] text-primary hover:underline ml-1" onClick={() => setFilterFamilies(new Set())}>
                      Effacer
                    </button>
                  )}
                  <CollapsibleTrigger asChild>
                    <button className="ml-auto text-muted-foreground hover:text-foreground">
                      <ChevronDown className="w-3.5 h-3.5 transition-transform [[data-state=open]>&]:rotate-180" />
                    </button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {availableFamilies.map(([family, count]) => {
                      const isActive = filterFamilies.has(family);
                      return (
                        <button
                          key={family}
                          onClick={() => {
                            setFilterFamilies((prev) => {
                              const next = new Set(prev);
                              if (next.has(family)) next.delete(family); else next.add(family);
                              return next;
                            });
                          }}
                          className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-full border text-[11px] transition-all ${
                            isActive
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border hover:border-primary/50 text-muted-foreground"
                          }`}
                        >
                          {family}
                          <span className="text-[9px] text-muted-foreground">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Tags / Labels */}
            {availableTags.length > 0 && (
              <Collapsible defaultOpen>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">Labels</span>
                  {filterTags.size > 0 && (
                    <button className="text-[10px] text-primary hover:underline ml-1" onClick={() => setFilterTags(new Set())}>
                      Effacer
                    </button>
                  )}
                  <CollapsibleTrigger asChild>
                    <button className="ml-auto text-muted-foreground hover:text-foreground">
                      <ChevronDown className="w-3.5 h-3.5 transition-transform [[data-state=open]>&]:rotate-180" />
                    </button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {availableTags.map(([tag, count]) => {
                      const isActive = filterTags.has(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => {
                            setFilterTags((prev) => {
                              const next = new Set(prev);
                              if (next.has(tag)) next.delete(tag); else next.add(tag);
                              return next;
                            });
                          }}
                          className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-full border text-[11px] transition-all ${
                            isActive
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border hover:border-primary/50 text-muted-foreground"
                          }`}
                        >
                          {tag}
                          <span className="text-[9px] text-muted-foreground">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
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
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => syncXdConnects.mutate()} disabled={syncXdConnects.isPending}>
                        {syncXdConnects.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Sync XD Connects
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
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setNewwaveImportOpen(true)} disabled={newwaveImporting}>
                        {newwaveImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                        Import New Wave
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
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={async () => {
                    const ids = Array.from(selected);
                    const { error } = await supabase.from("catalog_products").update({ is_new: true }).in("id", ids);
                    if (error) { toast.error(error.message); return; }
                    toast.success(`${ids.length} produit(s) marqué(s) comme nouveau`);
                    setSelected(new Set());
                    qc.invalidateQueries({ queryKey: ["catalog-products"] });
                  }}>
                    <Sparkles className="w-3.5 h-3.5" /> Nouveau
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
                  {visibleProducts.map((product) => (
                    <TableRow key={product.id} className={`text-sm cursor-pointer ${selected.has(product.id) ? "bg-primary/5" : ""}`} onClick={() => openPreview(product)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(product.id)}
                          onCheckedChange={() => toggleSelect(product.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded-md object-cover border border-border" loading="lazy" />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center">
                              <Package className="w-4 h-4 text-muted-foreground/30" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-foreground">{product.name}</p>
                              {product.is_new && (
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
                      <TableCell className="font-medium">{formatCurrency(getSellingPrice(product.base_price, product.midocean_id))}</TableCell>
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
                            <DropdownMenuItem onClick={() => openPreview(product)}>
                              <Eye className="w-4 h-4 mr-2" /> Aperçu
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => {
                              const { error } = await supabase.from("catalog_products").update({ is_new: !product.is_new }).eq("id", product.id);
                              if (error) { toast.error(error.message); return; }
                              qc.invalidateQueries({ queryKey: ["catalog-products"] });
                              toast.success(product.is_new ? "Badge « Nouveau » retiré" : "Produit marqué comme nouveau");
                            }}>
                              <Sparkles className="w-4 h-4 mr-2" /> {product.is_new ? "Retirer « Nouveau »" : "Marquer « Nouveau »"}
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
              {/* Load more / pagination info */}
              {hasMore && (
                <div className="flex items-center justify-center py-4 border-t border-border">
                  <Button variant="outline" size="sm" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                    Afficher plus ({filtered.length - visibleCount} restants)
                  </Button>
                </div>
              )}
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

      {/* TopTex Brand Manage Dialog */}
      <Dialog open={toptexBrandManageOpen} onOpenChange={setToptexBrandManageOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Gérer les marques TopTex</DialogTitle>
            <p className="text-sm text-muted-foreground">Activez ou désactivez les marques pour les rendre visibles dans le catalogue.</p>
          </DialogHeader>
          <div className="flex flex-col gap-4 min-h-0 flex-1">
            {/* Global actions */}
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0 flex-wrap gap-2">
              <p className="text-sm font-medium">{toptexBrandsInCatalog.length} marques · {toptexBrandsInCatalog.reduce((s, b) => s + b.total, 0)} produits</p>
              <div className="flex items-center gap-2 flex-wrap">
                {toptexBrandsInCatalog.some(b => b.brand === "__no_brand__") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 border-amber-500 text-amber-700"
                    disabled={fixToptexBrands.isPending}
                    onClick={() => fixToptexBrands.mutate()}
                  >
                    {fixToptexBrands.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Corriger marques
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={async () => {
                    const ids = (products || []).filter(p => p.midocean_id?.startsWith("TT-")).map(p => p.id);
                    if (!ids.length) return;
                    const batchSize = 500;
                    for (let i = 0; i < ids.length; i += batchSize) {
                      await supabase.from("catalog_products").update({ active: true }).in("id", ids.slice(i, i + batchSize));
                    }
                    toast.success(`${ids.length} produits TopTex activés`);
                    qc.invalidateQueries({ queryKey: ["catalog-products"] });
                  }}
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Tout activer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={async () => {
                    const ids = (products || []).filter(p => p.midocean_id?.startsWith("TT-")).map(p => p.id);
                    if (!ids.length) return;
                    const batchSize = 500;
                    for (let i = 0; i < ids.length; i += batchSize) {
                      await supabase.from("catalog_products").update({ active: false }).in("id", ids.slice(i, i + batchSize));
                    }
                    toast.success(`${ids.length} produits TopTex désactivés`);
                    qc.invalidateQueries({ queryKey: ["catalog-products"] });
                  }}
                >
                  <XCircle className="w-3.5 h-3.5" /> Tout désactiver
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="space-y-1 pr-3">
                {toptexBrandsInCatalog.map((b) => {
                  const allActive = b.active === b.total;
                  const noneActive = b.active === 0;
                  const displayName = b.brand === "__no_brand__" ? "⚠ Sans marque (re-sync nécessaire)" : b.brand;
                  return (
                    <div
                      key={b.brand}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.total} produits · <span className={allActive ? "text-emerald-600" : noneActive ? "text-destructive" : "text-amber-600"}>{b.active} actifs</span>
                        </p>
                      </div>
                      <Switch
                        checked={allActive}
                        onCheckedChange={async (checked) => {
                          const ids = (products || []).filter(p => p.midocean_id?.startsWith("TT-") && (b.brand === "__no_brand__" ? !p.brand : p.brand === b.brand)).map(p => p.id);
                          const batchSize = 500;
                          for (let i = 0; i < ids.length; i += batchSize) {
                            await supabase.from("catalog_products").update({ active: checked }).in("id", ids.slice(i, i + batchSize));
                          }
                          toast.success(`${b.brand === "__no_brand__" ? "Sans marque" : b.brand} : ${ids.length} produits ${checked ? "activés" : "désactivés"}`);
                          qc.invalidateQueries({ queryKey: ["catalog-products"] });
                        }}
                      />
                    </div>
                  );
                })}
                {toptexBrandsInCatalog.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucune marque TopTex dans le catalogue. Lancez d'abord une synchronisation.</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Wave XLSX Import Dialog */}
      <Dialog open={newwaveImportOpen} onOpenChange={setNewwaveImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Import New Wave (XLSX)
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]');
              const brandSelect = form.querySelector<HTMLSelectElement>('select[name="brand"]');
              const file = fileInput?.files?.[0];
              const brand = brandSelect?.value || "Craft Corporate";
              if (!file) { toast.error("Sélectionne un fichier XLSX"); return; }

              setNewwaveImporting(true);
              try {
                toast.info("Lecture du fichier XLSX…");
                const buffer = await file.arrayBuffer();
                const workbook = read(new Uint8Array(buffer), { type: "array" });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows: Record<string, string>[] = utils.sheet_to_json(sheet, { defval: "" });

                if (rows.length === 0) throw new Error("Fichier vide");

                // Detect columns
                const sampleKeys = Object.keys(rows[0]);
                const findCol = (patterns: string[]): string | null => {
                  for (const p of patterns) {
                    const found = sampleKeys.find((k) => k.toLowerCase().includes(p.toLowerCase()));
                    if (found) return found;
                  }
                  return null;
                };

                const COL_FAMILY = findCol(["Family"]) || "Family";
                const COL_FAMILY_NAME = findCol(["Family Name w/o Brand"]) || "Family Name w/o Brand";
                const COL_NAME_EN = findCol(["Product Name EN With Brand"]) || "Product Name EN With Brand";
                const COL_NAME_NL = findCol(["Product Name NL With Brand"]) || "Product Name NL With Brand";
                const COL_NAME_FR = findCol(["Product Name FR With Brand"]) || "Product Name FR With Brand";
                const COL_DESC_EN = findCol(["Description EN"]) || "Description EN";
                const COL_DESC_NL = findCol(["Description NL"]) || "Description NL";
                const COL_DESC_FR = findCol(["Description FR"]) || "Description FR";
                const COL_CATEGORY = findCol(["Main Category", "Product Category"]) || "Main Category";
                const COL_CRAFT_CAT = findCol(["Category Craft"]) || "Category Craft";
                const COL_URL_PHOTO = findCol(["URL Photo", "Url photo"]) || "URL Photo";
                const COL_COLOUR_EN = findCol(["Col. EN", "Colour EN"]) || "Col. EN";
                const COL_WEB_COLOR = findCol(["WEB COLOR", "WEBcolor"]) || "WEB COLOR";
                const COL_SIZE = findCol(["Size"]) || "Size";
                const COL_PRICE = findCol(["Advice Selling Price"]) || "Advice Selling Price";
                const COL_LEVEL = findCol(["Level"]) || "Level";
                const COL_NEW = findCol(["New", "NEW"]) || "New";

                const WEB_COLOR_HEX: Record<string, string> = {
                  Black: "#000000", White: "#FFFFFF", Blue: "#0066CC", Red: "#CC0000",
                  Green: "#228B22", Yellow: "#FFD700", Orange: "#FF8C00", Pink: "#FF69B4",
                  Grey: "#808080", Gray: "#808080", Brown: "#8B4513", Navy: "#001F3F",
                  Purple: "#800080", Burgundy: "#800020", Silver: "#C0C0C0", Gold: "#FFD700",
                  Beige: "#F5F5DC", Coral: "#FF7F50", Turquoise: "#40E0D0", Teal: "#008080",
                };
                const getHex = (webColor: string): string | null => {
                  if (!webColor) return null;
                  const key = webColor.charAt(0).toUpperCase() + webColor.slice(1).toLowerCase();
                  return WEB_COLOR_HEX[key] || null;
                };
                const cleanUrl = (raw: string) => raw ? raw.replace(/\\/g, "").trim() : "";

                // Aggregate by Family
                type FamilyData = {
                  familyCode: string; familyName: string;
                  nameEN: string; nameNL: string; nameFR: string;
                  descEN: string; descNL: string; descFR: string;
                  category: string; imageUrl: string; basePrice: number;
                  colors: Map<string, { color: string; hex: string | null; image_url: string | null }>;
                  sizes: Set<string>; isNew: boolean;
                };
                const families = new Map<string, FamilyData>();

                for (const row of rows) {
                  const familyCode = String(row[COL_FAMILY] || "").trim();
                  if (!familyCode) continue;
                  const level = String(row[COL_LEVEL] || "").trim();
                  if (!level && !row[COL_FAMILY_NAME]) continue;

                  const colourEN = String(row[COL_COLOUR_EN] || "").trim();
                  const webColor = String(row[COL_WEB_COLOR] || "").trim();
                  const size = String(row[COL_SIZE] || "").trim();
                  const photoUrl = cleanUrl(String(row[COL_URL_PHOTO] || ""));

                  if (!families.has(familyCode)) {
                    const rawPrice = String(row[COL_PRICE] || "0");
                    const price = parseFloat(rawPrice.replace(/[€\s,]/g, "").replace(",", ".")) || 0;
                    const category = String(row[COL_CATEGORY] || "").trim();
                    const craftCat = String(row[COL_CRAFT_CAT] || "").trim();
                    const isNew = String(row[COL_NEW] || "").trim().toLowerCase() === "new" || String(row[COL_NEW] || "").trim() === "1";

                    families.set(familyCode, {
                      familyCode,
                      familyName: String(row[COL_FAMILY_NAME] || "").trim(),
                      nameEN: String(row[COL_NAME_EN] || "").trim(),
                      nameNL: String(row[COL_NAME_NL] || "").trim(),
                      nameFR: String(row[COL_NAME_FR] || "").trim(),
                      descEN: String(row[COL_DESC_EN] || "").trim(),
                      descNL: String(row[COL_DESC_NL] || "").trim(),
                      descFR: String(row[COL_DESC_FR] || "").trim(),
                      category: craftCat ? `${craftCat} > ${category}` : category,
                      imageUrl: photoUrl,
                      basePrice: price,
                      colors: new Map(),
                      sizes: new Set(),
                      isNew,
                    });
                  }

                  const family = families.get(familyCode)!;
                  if (colourEN && !family.colors.has(colourEN)) {
                    family.colors.set(colourEN, { color: colourEN, hex: getHex(webColor), image_url: photoUrl || null });
                  }
                  if (size) family.sizes.add(size);
                }

                toast.info(`${families.size} familles détectées, envoi par lots…`);

                // Convert to product array
                const allProducts = Array.from(families.values()).map((f) => {
                  const displayName = f.nameEN || `${brand} ${f.familyName}`;
                  const familyDisplayName = f.familyName
                    ? `${brand} ${f.familyName}`
                    : displayName.split(/\s+(xs|s|m|l|xl|xxl|3xl|4xl)\s*$/i)[0];
                  return {
                    sku: `NW-${f.familyCode}`,
                    name: familyDisplayName,
                    name_en: familyDisplayName,
                    name_nl: f.nameNL ? f.nameNL.split(/\s+(xs|s|m|l|xl|xxl|3xl|4xl)\s*$/i)[0] : null,
                    description: f.descFR || f.descEN || null,
                    description_en: f.descEN || null,
                    description_nl: f.descNL || null,
                    category: f.category || "general",
                    image_url: f.imageUrl || null,
                    base_price: f.basePrice,
                    variant_colors: Array.from(f.colors.values()),
                    variant_sizes: Array.from(f.sizes),
                    is_new: f.isNew,
                  };
                });

                // Send in batches of 100 to edge function
                let totalCreated = 0, totalUpdated = 0, totalErrors = 0;
                const BATCH_SIZE = 100;
                for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
                  const batch = allProducts.slice(i, i + BATCH_SIZE);
                  const { data, error } = await supabase.functions.invoke("sync-newwave", {
                    body: { products: batch, brand },
                  });
                  if (error) throw error;
                  if (data?.error) throw new Error(data.error);
                  totalCreated += data.created || 0;
                  totalUpdated += data.updated || 0;
                  totalErrors += data.errors || 0;
                  if (i + BATCH_SIZE < allProducts.length) {
                    toast.info(`New Wave : ${i + BATCH_SIZE}/${allProducts.length} envoyés…`);
                  }
                }

                toast.success(`New Wave : ${totalCreated} créés, ${totalUpdated} mis à jour`);
                qc.invalidateQueries({ queryKey: ["catalog-products"] });
                setNewwaveImportOpen(false);
              } catch (err: any) {
                toast.error(`Erreur import : ${err.message}`);
              } finally {
                setNewwaveImporting(false);
              }
            }}
          >
            <div className="space-y-2">
              <Label>Marque</Label>
              <select
                name="brand"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="Craft Corporate">Craft Corporate</option>
                <option value="Craft Club">Craft Club</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Fichier XLSX</Label>
              <Input type="file" accept=".xlsx,.xls" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setNewwaveImportOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={newwaveImporting} className="gap-1.5">
                {newwaveImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Importer
              </Button>
            </div>
          </form>
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
