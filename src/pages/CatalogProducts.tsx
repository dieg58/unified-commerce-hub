import { useState, useMemo } from "react";
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
import { Plus, Search, Loader2, MoreHorizontal, Pencil, Trash2, Package, Upload, Eye, RefreshCw, Filter, Gift, Shirt, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

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
};

// ── Parse hierarchical categories (uses ">" separator) ──
function getParentCategory(category: string): string {
  const parts = category.split(">").map((s) => s.trim());
  return parts[0] || category;
}

function getSubCategory(category: string): string | null {
  const parts = category.split(">").map((s) => s.trim());
  return parts.length > 1 ? parts[1] : null;
}

const emptyCp = {
  name: "", name_en: "", name_nl: "", sku: "", category: "general",
  base_price: 0, description: "", description_en: "", description_nl: "",
  image_url: "", active: true,
};

const CatalogProducts = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"goodies" | "textile">("goodies");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterSubCategory, setFilterSubCategory] = useState<string>("all");
  
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [filterNew, setFilterNew] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogProduct | null>(null);
  const [form, setForm] = useState(emptyCp);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
    if (activeTab === "goodies") {
      return products.filter((p) => !p.midocean_id?.startsWith("SS-") && !p.midocean_id?.startsWith("TT-"));
    }
    // textile = Stanley/Stella + TopTex
    return products.filter((p) => !!p.midocean_id?.startsWith("SS-") || !!p.midocean_id?.startsWith("TT-"));
  }, [products, activeTab]);

  // Parent categories with counts
  const parentCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    tabProducts.forEach((p) => {
      const parent = getParentCategory(p.category);
      counts[parent] = (counts[parent] || 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [tabProducts]);

  // Sub-categories within selected parent
  const subCategories = useMemo(() => {
    if (filterGroup === "all") return [];
    const subs: Record<string, number> = {};
    tabProducts
      .filter((p) => getParentCategory(p.category) === filterGroup)
      .forEach((p) => {
        const sub = getSubCategory(p.category);
        if (sub) subs[sub] = (subs[sub] || 0) + 1;
      });
    return Object.entries(subs).sort(([a], [b]) => a.localeCompare(b));
  }, [tabProducts, filterGroup]);

  const newCount = tabProducts.filter((p) => (p as any).is_new).length;

  const filtered = tabProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = filterGroup === "all" || getParentCategory(p.category) === filterGroup;
    const matchesSubCat = filterSubCategory === "all" || (getSubCategory(p.category) === filterSubCategory);
    const matchesActive = filterActive === null || p.active === filterActive;
    const matchesNew = !filterNew || (p as any).is_new;
    return matchesSearch && matchesGroup && matchesSubCat && matchesActive && matchesNew;
  });

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

  const activeCount = tabProducts.filter((p) => p.active).length;
  const goodiesCount = products?.filter((p) => !p.midocean_id?.startsWith("SS-") && !p.midocean_id?.startsWith("TT-")).length || 0;
  const textileCount = products?.filter((p) => !!p.midocean_id?.startsWith("SS-") || !!p.midocean_id?.startsWith("TT-")).length || 0;

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

  return (
    <>
      <TopBar title={t("catalogAdmin.title")} subtitle={t("catalogAdmin.subtitle")} />
      <div className="p-6 space-y-6 overflow-auto">
        {/* Stats */}
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "goodies" | "textile"); setFilterGroup("all"); setFilterSubCategory("all"); setSearch(""); }}>
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
            </TabsList>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{tabProducts.length} produits</span>
              <span>·</span>
              <span>{activeCount} actifs</span>
            </div>
          </div>
        </Tabs>

        {/* Parent category pills → click reveals sub-categories */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              size="sm"
              variant={filterGroup === "all" ? "default" : "outline"}
              className="h-7 text-xs rounded-full px-3"
              onClick={() => { setFilterGroup("all"); setFilterSubCategory("all"); }}
            >
              Tout ({tabProducts.length})
            </Button>
            {parentCategories.map(([parent, count]) => (
              <Button
                key={parent}
                size="sm"
                variant={filterGroup === parent ? "default" : "outline"}
                className="h-7 text-xs rounded-full px-3"
                onClick={() => { setFilterGroup(parent); setFilterSubCategory("all"); }}
              >
                {parent} ({count})
              </Button>
            ))}
          </div>

          {/* Sub-categories revealed on parent click */}
          {filterGroup !== "all" && subCategories.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pl-4 border-l-2 border-primary/30">
              <Button
                size="sm"
                variant={filterSubCategory === "all" ? "secondary" : "ghost"}
                className="h-6 text-[11px] rounded-full px-2.5"
                onClick={() => setFilterSubCategory("all")}
              >
                Tout ({tabProducts.filter((p) => getParentCategory(p.category) === filterGroup).length})
              </Button>
              {subCategories.map(([sub, count]) => (
                <Button
                  key={sub}
                  size="sm"
                  variant={filterSubCategory === sub ? "secondary" : "ghost"}
                  className="h-6 text-[11px] rounded-full px-2.5"
                  onClick={() => setFilterSubCategory(sub)}
                >
                  {sub} ({count})
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Nouveautés + Active filter + reset */}
        <div className="flex items-center gap-2">
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
          {(filterGroup !== "all" || filterActive !== null || filterNew) && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => { setFilterGroup("all"); setFilterSubCategory("all"); setFilterActive(null); setFilterNew(false); }}>
              Réinitialiser
            </Button>
          )}
        </div>

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
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => syncMidocean.mutate()} disabled={syncMidocean.isPending}>
                      {syncMidocean.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Sync Midocean
                    </Button>
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
                    <TableRow key={product.id} className={`text-sm animate-fade-in ${selected.has(product.id) ? "bg-primary/5" : ""}`} style={{ animationDelay: `${i * 30}ms` }}>
                      <TableCell>
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
                        <Badge variant="outline" className="text-[10px] capitalize">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(product.base_price)}</TableCell>
                      <TableCell className="text-xs font-medium">{product.stock_qty}</TableCell>
                      <TableCell>
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
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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
    </>
  );
};

export default CatalogProducts;
