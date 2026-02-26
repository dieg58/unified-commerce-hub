import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Loader2, Move, Save, X, Plus, Search, Trash2, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import BrandedProductImage, { type LogoPlacement } from "./BrandedProductImage";

interface DemoTemplate {
  id: string;
  catalog_product_id: string;
  logo_x: number;
  logo_y: number;
  logo_width: number;
  logo_rotation: number;
  logo_blend: string;
  logo_opacity: number;
  logo_mode: string;
  logo_max_height: number;
  sort_order: number;
  active: boolean;
  // joined
  catalog_product?: {
    id: string;
    name: string;
    sku: string;
    image_url: string | null;
    category: string;
    base_price: number;
  };
}

interface DemoProductEditorProps {
  previewLogoUrl?: string | null;
}

const DemoProductEditor = ({ previewLogoUrl }: DemoProductEditorProps) => {
  const qc = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<DemoTemplate | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["demo-product-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demo_product_templates")
        .select("*, catalog_products(*)")
        .order("sort_order");
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        catalog_product: d.catalog_products,
      })) as DemoTemplate[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (t: DemoTemplate) => {
      const { error } = await supabase
        .from("demo_product_templates")
        .update({
          logo_x: t.logo_x,
          logo_y: t.logo_y,
          logo_width: t.logo_width,
          logo_rotation: t.logo_rotation,
          logo_blend: t.logo_blend,
          logo_opacity: t.logo_opacity,
          logo_mode: t.logo_mode,
          logo_max_height: t.logo_max_height,
          active: t.active,
        } as any)
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Placement sauvegardé");
      qc.invalidateQueries({ queryKey: ["demo-product-templates"] });
      setEditingTemplate(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("demo_product_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template supprimé");
      qc.invalidateQueries({ queryKey: ["demo-product-templates"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addMutation = useMutation({
    mutationFn: async (catalogProductId: string) => {
      const nextOrder = (templates?.length || 0) + 1;
      const { error } = await supabase
        .from("demo_product_templates")
        .insert({
          catalog_product_id: catalogProductId,
          sort_order: nextOrder,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produit démo ajouté");
      qc.invalidateQueries({ queryKey: ["demo-product-templates"] });
      setAddDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const selectedIds = new Set(templates?.map((t) => t.catalog_product_id) || []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Sélectionnez des produits du catalogue global et définissez la zone de marquage pour chacun. Ces templates sont appliqués à toutes les nouvelles boutiques.
        </p>
        <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => setAddDialogOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Ajouter
        </Button>
      </div>

      {(!templates || templates.length === 0) ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Aucun produit démo configuré. Cliquez sur "Ajouter" pour sélectionner des produits du catalogue.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="group relative rounded-lg border border-border overflow-hidden bg-card hover:ring-2 hover:ring-primary/50 transition-all text-left"
            >
              <button
                onClick={() => setEditingTemplate({ ...t })}
                className="w-full text-left"
              >
                <div className="aspect-square relative">
                  <BrandedProductImage
                    imageUrl={t.catalog_product?.image_url}
                    logoUrl={previewLogoUrl}
                    logoPlacement={{
                      x: Number(t.logo_x),
                      y: Number(t.logo_y),
                      width: Number(t.logo_width),
                      maxHeight: Number(t.logo_max_height),
                      rotation: Number(t.logo_rotation),
                      blend: t.logo_blend,
                      opacity: Number(t.logo_opacity),
                      mode: t.logo_mode as "light" | "dark",
                    }}
                    className="w-full h-full"
                  />
                  {!t.active && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                      <Badge variant="secondary" className="text-[10px]">Désactivé</Badge>
                    </div>
                  )}
                  <div className="absolute top-1.5 right-1.5">
                    {t.logo_mode === "dark" ? (
                      <Moon className="w-3.5 h-3.5 text-white drop-shadow" />
                    ) : (
                      <Sun className="w-3.5 h-3.5 text-yellow-500 drop-shadow" />
                    )}
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-foreground truncate">{t.catalog_product?.name || "—"}</p>
                  <p className="text-[10px] text-muted-foreground">{t.catalog_product?.sku}</p>
                </div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(t.id); }}
                className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-destructive/90 text-white hover:bg-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {editingTemplate && (
        <LogoPlacementDialog
          template={editingTemplate}
          logoUrl={previewLogoUrl}
          onClose={() => setEditingTemplate(null)}
          onSave={(t) => saveMutation.mutate(t)}
          saving={saveMutation.isPending}
        />
      )}

      {addDialogOpen && (
        <CatalogPickerDialog
          selectedIds={selectedIds}
          onSelect={(id) => addMutation.mutate(id)}
          onClose={() => setAddDialogOpen(false)}
          adding={addMutation.isPending}
        />
      )}
    </div>
  );
};

/* ─── Catalog Picker Dialog ──────────────────────────────────────── */

const CatalogPickerDialog = ({
  selectedIds,
  onSelect,
  onClose,
  adding,
}: {
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onClose: () => void;
  adding: boolean;
}) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: catalogProducts, isLoading } = useQuery({
    queryKey: ["catalog-products-for-demo", debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from("catalog_products")
        .select("id, name, sku, image_url, category, base_price")
        .eq("active", true)
        .order("name")
        .limit(60);

      if (debouncedSearch) {
        const q = `%${debouncedSearch}%`;
        query = query.or(`name.ilike.${q},sku.ilike.${q},category.ilike.${q}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!catalogProducts) return [];
    return catalogProducts.filter((p) => !selectedIds.has(p.id));
  }, [catalogProducts, selectedIds]);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ajouter un produit démo depuis le catalogue</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, SKU ou catégorie..."
            className="pl-9"
          />
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun produit trouvé</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  disabled={adding}
                  className="text-left rounded-lg border border-border overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all bg-card disabled:opacity-50"
                >
                  <div className="aspect-square bg-muted/30 overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/20 text-3xl">📦</div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.sku} · {p.base_price} €</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Drag & Resize Dialog ─────────────────────────────────────────── */

interface LogoPlacementDialogProps {
  template: DemoTemplate;
  logoUrl?: string | null;
  onClose: () => void;
  onSave: (t: DemoTemplate) => void;
  saving: boolean;
}

const LogoPlacementDialog = ({ template, logoUrl, onClose, onSave, saving }: LogoPlacementDialogProps) => {
  const [t, setT] = useState<DemoTemplate>(template);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const resizing = useRef(false);
  const startPos = useRef({ mx: 0, my: 0, x: 0, y: 0, w: 0 });

  const update = useCallback((patch: Partial<DemoTemplate>) => {
    setT((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, mode: "drag" | "resize") => {
    e.preventDefault();
    e.stopPropagation();
    if (mode === "drag") dragging.current = true;
    else resizing.current = true;
    startPos.current = { mx: e.clientX, my: e.clientY, x: Number(t.logo_x), y: Number(t.logo_y), w: Number(t.logo_width) };
  }, [t.logo_x, t.logo_y, t.logo_width]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      if (dragging.current) {
        const dx = ((e.clientX - startPos.current.mx) / rect.width) * 100;
        const dy = ((e.clientY - startPos.current.my) / rect.height) * 100;
        update({
          logo_x: Math.max(0, Math.min(100, startPos.current.x + dx)),
          logo_y: Math.max(0, Math.min(100, startPos.current.y + dy)),
        });
      }
      if (resizing.current) {
        const dx = ((e.clientX - startPos.current.mx) / rect.width) * 100;
        update({
          logo_width: Math.max(5, Math.min(80, startPos.current.w + dx)),
        });
      }
    };

    const handleUp = () => {
      dragging.current = false;
      resizing.current = false;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [update]);

  const placement: LogoPlacement = {
    x: Number(t.logo_x),
    y: Number(t.logo_y),
    width: Number(t.logo_width),
    maxHeight: Number(t.logo_max_height),
    rotation: Number(t.logo_rotation),
    blend: t.logo_blend,
    opacity: Number(t.logo_opacity),
    mode: t.logo_mode as "light" | "dark",
  };

  const imageUrl = t.catalog_product?.image_url;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="w-4 h-4" /> {t.catalog_product?.name || "Produit"} — Placement du logo
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-[1fr_200px] gap-4">
          {/* Image with draggable logo */}
          <div
            ref={containerRef}
            className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/30 cursor-crosshair select-none"
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={t.catalog_product?.name}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/20 text-6xl">📦</div>
            )}
            {logoUrl && (
              <div
                className="absolute cursor-move"
                style={{
                  left: `${placement.x}%`,
                  top: `${placement.y}%`,
                  width: `${placement.width}%`,
                  transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
                }}
                onMouseDown={(e) => handleMouseDown(e, "drag")}
              >
                <div className="relative border-2 border-dashed border-primary/60 rounded p-0.5">
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-full object-contain pointer-events-none"
                    style={{
                      mixBlendMode: (placement.mode === "dark" ? "screen" : placement.blend) as any,
                      opacity: placement.opacity,
                      filter: placement.mode === "dark" ? "brightness(100)" : "none",
                      maxHeight: `${placement.maxHeight ?? 40}%`,
                      objectFit: "contain" as const,
                    }}
                    draggable={false}
                  />
                  {/* Resize handle */}
                  <div
                    className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-primary rounded-full cursor-se-resize border-2 border-background shadow"
                    onMouseDown={(e) => handleMouseDown(e, "resize")}
                  />
                  {/* Move indicator */}
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-primary rounded px-1">
                    <GripVertical className="w-3 h-3 text-primary-foreground" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[10px]">Position X (%)</Label>
              <Slider
                value={[Number(t.logo_x)]}
                onValueChange={([v]) => update({ logo_x: v })}
                min={0} max={100} step={1}
              />
              <span className="text-[10px] text-muted-foreground">{Number(t.logo_x).toFixed(0)}%</span>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Position Y (%)</Label>
              <Slider
                value={[Number(t.logo_y)]}
                onValueChange={([v]) => update({ logo_y: v })}
                min={0} max={100} step={1}
              />
              <span className="text-[10px] text-muted-foreground">{Number(t.logo_y).toFixed(0)}%</span>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Largeur max (%)</Label>
              <Slider
                value={[Number(t.logo_width)]}
                onValueChange={([v]) => update({ logo_width: v })}
                min={5} max={80} step={1}
              />
              <span className="text-[10px] text-muted-foreground">{Number(t.logo_width).toFixed(0)}%</span>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Hauteur max (%)</Label>
              <Slider
                value={[Number(t.logo_max_height)]}
                onValueChange={([v]) => update({ logo_max_height: v })}
                min={5} max={80} step={1}
              />
              <span className="text-[10px] text-muted-foreground">{Number(t.logo_max_height).toFixed(0)}%</span>
            </div>

            <Separator />

            <div className="space-y-1">
              <Label className="text-[10px]">Rotation (°)</Label>
              <Slider
                value={[Number(t.logo_rotation)]}
                onValueChange={([v]) => update({ logo_rotation: v })}
                min={0} max={360} step={1}
              />
              <span className="text-[10px] text-muted-foreground">{Number(t.logo_rotation).toFixed(0)}°</span>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Opacité</Label>
              <Slider
                value={[Number(t.logo_opacity) * 100]}
                onValueChange={([v]) => update({ logo_opacity: v / 100 })}
                min={10} max={100} step={5}
              />
              <span className="text-[10px] text-muted-foreground">{(Number(t.logo_opacity) * 100).toFixed(0)}%</span>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-[10px]">Fond du produit</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => update({ logo_mode: "light" })}
                  className={`flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded border text-[10px] font-medium transition-colors ${t.logo_mode === "light" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                >
                  <Sun className="w-3 h-3" /> Clair
                </button>
                <button
                  onClick={() => update({ logo_mode: "dark" })}
                  className={`flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded border text-[10px] font-medium transition-colors ${t.logo_mode === "dark" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                >
                  <Moon className="w-3 h-3" /> Foncé
                </button>
              </div>
              <p className="text-[9px] text-muted-foreground">
                {t.logo_mode === "dark" ? "Le logo apparaîtra en blanc" : "Le logo apparaîtra en couleur"}
              </p>
            </div>

            <Separator />

            <div className="space-y-1">
              <Label className="text-[10px]">Blend mode</Label>
              <select
                value={t.logo_blend}
                onChange={(e) => update({ logo_blend: e.target.value })}
                className="w-full h-8 rounded border border-input bg-background px-2 text-xs"
              >
                <option value="multiply">Multiply</option>
                <option value="normal">Normal</option>
                <option value="overlay">Overlay</option>
                <option value="darken">Darken</option>
                <option value="screen">Screen</option>
              </select>
            </div>

            <Separator />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={t.active}
                onChange={(e) => update({ active: e.target.checked })}
                className="rounded"
              />
              <Label className="text-[10px]">Actif</Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-3.5 h-3.5 mr-1" /> Annuler
          </Button>
          <Button size="sm" onClick={() => onSave(t)} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Sauvegarder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DemoProductEditor;
