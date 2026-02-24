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
import { Plus, Search, Loader2, MoreHorizontal, Pencil, Trash2, Package, Upload, Eye, RefreshCw, Filter } from "lucide-react";
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
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogProduct | null>(null);
  const [form, setForm] = useState(emptyCp);
  const [uploading, setUploading] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["catalog-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CatalogProduct[];
    },
  });

  const categories = useMemo(() => {
    if (!products) return [];
    return [...new Set(products.map((p) => p.category))].sort();
  }, [products]);

  const filtered = products?.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "all" || p.category === filterCategory;
    const matchesSource =
      filterSource === "all" ||
      (filterSource === "midocean" && !!p.midocean_id) ||
      (filterSource === "manual" && !p.midocean_id);
    const matchesActive = filterActive === null || p.active === filterActive;
    return matchesSearch && matchesCategory && matchesSource && matchesActive;
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

  const activeCount = products?.filter((p) => p.active).length || 0;
  const syncedCount = products?.filter((p) => p.midocean_id).length || 0;

  const syncMidocean = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-midocean");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Synchronisation terminée : ${data.created} créés, ${data.updated} mis à jour`);
      qc.invalidateQueries({ queryKey: ["catalog-products"] });
    },
    onError: (err: any) => toast.error(`Erreur sync Midocean : ${err.message}`),
  });

  return (
    <>
      <TopBar title={t("catalogAdmin.title")} subtitle={t("catalogAdmin.subtitle")} />
      <div className="p-6 space-y-6 overflow-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{products?.length || 0}</p>
              <p className="text-xs text-muted-foreground">{t("catalogAdmin.totalProducts")}</p>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeCount}</p>
              <p className="text-xs text-muted-foreground">{t("catalogAdmin.activeProducts")}</p>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{(products?.length || 0) - activeCount}</p>
              <p className="text-xs text-muted-foreground">{t("catalogAdmin.inactiveProducts")}</p>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{syncedCount}</p>
              <p className="text-xs text-muted-foreground">Midocean</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border border-border p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            Filtres
          </div>
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="h-8 w-40 text-sm">
              <SelectValue placeholder="Fournisseur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les fournisseurs</SelectItem>
              <SelectItem value="midocean">Midocean</SelectItem>
              <SelectItem value="manual">Manuel</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-8 w-52 text-sm">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  <span className="capitalize">{cat}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <ToggleGroupItem value="all" className="text-xs px-3">Tous</ToggleGroupItem>
            <ToggleGroupItem value="active" className="text-xs px-3">Actifs</ToggleGroupItem>
            <ToggleGroupItem value="inactive" className="text-xs px-3">Inactifs</ToggleGroupItem>
          </ToggleGroup>
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
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => syncMidocean.mutate()} disabled={syncMidocean.isPending}>
                    {syncMidocean.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Sync Midocean
                  </Button>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t("common.product")}</TableHead>
                  <TableHead className="text-xs">SKU</TableHead>
                  <TableHead className="text-xs">{t("common.category")}</TableHead>
                  <TableHead className="text-xs">{t("catalogAdmin.basePrice")}</TableHead>
                  <TableHead className="text-xs">Stock</TableHead>
                  <TableHead className="text-xs">{t("common.status")}</TableHead>
                  <TableHead className="text-xs">Source</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product, i) => (
                  <TableRow key={product.id} className="text-sm animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
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
                          <p className="font-medium text-foreground">{product.name}</p>
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
                      <Badge variant="outline" className={`text-[10px] ${product.active ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}`}>
                        {product.active ? t("common.active") : t("common.inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {product.midocean_id ? (
                        <Badge variant="secondary" className="text-[9px]">Midocean</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Manuel</span>
                      )}
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
    </>
  );
};

export default CatalogProducts;
