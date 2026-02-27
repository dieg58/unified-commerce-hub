import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, X, Plus, Search, Trash2, Sun, Moon, RotateCw, Eye, EyeOff, ChevronDown, MousePointer2, Move } from "lucide-react";
import { toast } from "sonner";
import BrandedProductImage, { type LogoPlacement } from "./BrandedProductImage";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

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
  catalog_product?: {
    id: string;
    name: string;
    sku: string;
    image_url: string | null;
    category: string;
    base_price: number;
    variant_colors?: { color: string; hex?: string; image_url?: string }[] | null;
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
      const { error } = await supabase.from("demo_product_templates").delete().eq("id", id);
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
        .insert({ catalog_product_id: catalogProductId, sort_order: nextOrder } as any);
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
          Sélectionnez des produits du catalogue global et définissez la zone de marquage pour chacun.
        </p>
        <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => setAddDialogOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Ajouter
        </Button>
      </div>

      {(!templates || templates.length === 0) ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Aucun produit démo configuré. Cliquez sur "Ajouter" pour commencer.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="group relative rounded-lg border border-border overflow-hidden bg-card hover:ring-2 hover:ring-primary/50 transition-all"
            >
              <button onClick={() => setEditingTemplate({ ...t })} className="w-full text-left">
                <div className="aspect-square relative">
                  <BrandedProductImage
                    imageUrl={t.catalog_product?.image_url}
                    logoUrl={previewLogoUrl}
                    logoPlacement={{
                      x: Number(t.logo_x), y: Number(t.logo_y),
                      width: Number(t.logo_width), maxHeight: Number(t.logo_max_height),
                      rotation: Number(t.logo_rotation), blend: t.logo_blend,
                      opacity: Number(t.logo_opacity), mode: t.logo_mode as "light" | "dark",
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
        <LogoPlacementEditor
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
  selectedIds, onSelect, onClose, adding,
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
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par nom, SKU ou catégorie..." className="pl-9" />
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
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

/* ─── Redesigned Logo Placement Editor ─────────────────────────────── */

interface LogoPlacementEditorProps {
  template: DemoTemplate;
  logoUrl?: string | null;
  onClose: () => void;
  onSave: (t: DemoTemplate) => void;
  saving: boolean;
}

const LogoPlacementEditor = ({ template, logoUrl, onClose, onSave, saving }: LogoPlacementEditorProps) => {
  const [t, setT] = useState<DemoTemplate>(template);
  const [selectedColorIdx, setSelectedColorIdx] = useState(-1);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<"idle" | "drag" | "resize-w" | "resize-h" | "resize-wh">("idle");
  const startRef = useRef({ mx: 0, my: 0, x: 0, y: 0, w: 0, h: 0 });

  const update = useCallback((patch: Partial<DemoTemplate>) => {
    setT((prev) => ({ ...prev, ...patch }));
  }, []);

  // Click on image to place logo center
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (interactionRef.current !== "idle") return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    update({ logo_x: Math.max(0, Math.min(100, x)), logo_y: Math.max(0, Math.min(100, y)) });
  }, [update]);

  const handleMouseDown = useCallback((e: React.MouseEvent, mode: "drag" | "resize-w" | "resize-h" | "resize-wh") => {
    e.preventDefault();
    e.stopPropagation();
    interactionRef.current = mode;
    startRef.current = {
      mx: e.clientX, my: e.clientY,
      x: Number(t.logo_x), y: Number(t.logo_y),
      w: Number(t.logo_width), h: Number(t.logo_max_height),
    };
  }, [t.logo_x, t.logo_y, t.logo_width, t.logo_max_height]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!containerRef.current || interactionRef.current === "idle") return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((e.clientX - startRef.current.mx) / rect.width) * 100;
      const dy = ((e.clientY - startRef.current.my) / rect.height) * 100;

      if (interactionRef.current === "drag") {
        update({
          logo_x: Math.max(0, Math.min(100, startRef.current.x + dx)),
          logo_y: Math.max(0, Math.min(100, startRef.current.y + dy)),
        });
      } else if (interactionRef.current === "resize-w") {
        update({ logo_width: Math.max(5, Math.min(80, startRef.current.w + dx * 2)) });
      } else if (interactionRef.current === "resize-h") {
        update({ logo_max_height: Math.max(5, Math.min(80, startRef.current.h + dy * 2)) });
      } else if (interactionRef.current === "resize-wh") {
        update({
          logo_width: Math.max(5, Math.min(80, startRef.current.w + dx * 2)),
          logo_max_height: Math.max(5, Math.min(80, startRef.current.h + dy * 2)),
        });
      }
    };

    const handleUp = () => {
      // Small delay so click handler doesn't fire after drag
      setTimeout(() => { interactionRef.current = "idle"; }, 50);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [update]);

  const placement: LogoPlacement = {
    x: Number(t.logo_x), y: Number(t.logo_y),
    width: Number(t.logo_width), maxHeight: Number(t.logo_max_height),
    rotation: Number(t.logo_rotation), blend: t.logo_blend,
    opacity: Number(t.logo_opacity), mode: t.logo_mode as "light" | "dark",
  };

  const colors = useMemo(() => {
    const vc = t.catalog_product?.variant_colors;
    if (!Array.isArray(vc)) return [];
    return vc.filter(c => c.hex || c.image_url);
  }, [t.catalog_product?.variant_colors]);

  const canvasImageUrl = useMemo(() => {
    if (selectedColorIdx >= 0 && colors[selectedColorIdx]?.image_url) {
      return colors[selectedColorIdx].image_url;
    }
    return t.catalog_product?.image_url || null;
  }, [selectedColorIdx, colors, t.catalog_product?.image_url]);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <DialogTitle className="text-sm font-semibold">{t.catalog_product?.name || "Produit"}</DialogTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">Cliquez sur l'image pour positionner · Glissez pour déplacer · Coin pour redimensionner</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => update({ active: !t.active })}
              className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-colors", t.active ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground")}
            >
              {t.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {t.active ? "Actif" : "Inactif"}
            </button>
          </div>
        </div>

        {/* Color variant swatches */}
        {colors.length > 0 && (
          <div className="px-5 py-2 flex items-center gap-2 border-b border-border overflow-x-auto">
            <span className="text-[10px] text-muted-foreground shrink-0">Couleur :</span>
            <button
              onClick={() => setSelectedColorIdx(-1)}
              className={cn("w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center text-[8px] font-bold transition-all",
                selectedColorIdx === -1 ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-muted-foreground")}
              title="Image par défaut"
            >
              <span className="text-muted-foreground">—</span>
            </button>
            {colors.map((c, i) => (
              <button
                key={i}
                onClick={() => setSelectedColorIdx(i)}
                className={cn("w-6 h-6 rounded-full border-2 shrink-0 transition-all",
                  selectedColorIdx === i ? "border-primary ring-2 ring-primary/30 scale-110" : "border-border hover:border-muted-foreground opacity-40")}
                style={{ backgroundColor: c.hex || "#ccc" }}
                title={c.color}
              />
            ))}
          </div>
        )}

        {/* Canvas — large, full width */}
        <div
          ref={containerRef}
          className="relative w-full aspect-square bg-muted/20 cursor-crosshair select-none border-b border-border"
          onClick={handleCanvasClick}
        >
          {canvasImageUrl ? (
            <img
              src={canvasImageUrl}
              alt={t.catalog_product?.name}
              className="w-full h-full object-contain"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/20 text-6xl">📦</div>
          )}

          {/* Crosshair guides */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-muted-foreground/10" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-muted-foreground/10" />
          </div>

          {/* Logo overlay zone */}
          {logoUrl && (
            <div
              className="absolute group/logo"
              style={{
                left: `${placement.x}%`,
                top: `${placement.y}%`,
                width: `${placement.width}%`,
                height: `${placement.maxHeight ?? 40}%`,
                transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
              }}
            >
              {/* Drag area */}
              <div
                className="absolute inset-0 cursor-move rounded border-2 border-dashed border-primary/50 group-hover/logo:border-primary transition-colors"
                onMouseDown={(e) => handleMouseDown(e, "drag")}
              >
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-full h-full pointer-events-none"
                  style={{
                    mixBlendMode: (placement.mode === "dark" ? "screen" : placement.blend) as any,
                    opacity: placement.opacity,
                    filter: placement.mode === "dark" ? "brightness(100)" : "none",
                    objectFit: "fill",
                  }}
                  draggable={false}
                />

                {/* Move indicator */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/logo:opacity-100 transition-opacity">
                  <div className="bg-primary/80 rounded-full p-1.5 shadow-lg">
                    <Move className="w-3 h-3 text-primary-foreground" />
                  </div>
                </div>
              </div>

              {/* Right edge resize handle */}
              <div
                className="absolute top-1/2 -right-1.5 w-3 h-8 -translate-y-1/2 bg-primary rounded-sm cursor-e-resize border border-background shadow-md opacity-0 group-hover/logo:opacity-100 transition-opacity"
                onMouseDown={(e) => handleMouseDown(e, "resize-w")}
              />
              {/* Bottom edge resize handle */}
              <div
                className="absolute left-1/2 -bottom-1.5 h-3 w-8 -translate-x-1/2 bg-primary rounded-sm cursor-s-resize border border-background shadow-md opacity-0 group-hover/logo:opacity-100 transition-opacity"
                onMouseDown={(e) => handleMouseDown(e, "resize-h")}
              />
              {/* Corner resize handle */}
              <div
                className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary rounded-full cursor-se-resize border-2 border-background shadow-md opacity-0 group-hover/logo:opacity-100 transition-opacity"
                onMouseDown={(e) => handleMouseDown(e, "resize-wh")}
              />

              {/* Size label */}
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 opacity-0 group-hover/logo:opacity-100 transition-opacity">
                <span className="text-[9px] bg-foreground/80 text-background px-1.5 py-0.5 rounded-full whitespace-nowrap font-mono">
                  {Number(t.logo_width).toFixed(0)}% × {Number(t.logo_max_height).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Controls bar below the canvas */}
        <div className="px-5 py-4 space-y-4">
          {/* Quick controls row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">Largeur</Label>
              <Slider
                value={[Number(t.logo_width)]}
                onValueChange={([v]) => update({ logo_width: v })}
                min={5} max={60} step={1}
              />
              <span className="text-[10px] text-muted-foreground font-mono">{Number(t.logo_width).toFixed(0)}%</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">Hauteur</Label>
              <Slider
                value={[Number(t.logo_max_height)]}
                onValueChange={([v]) => update({ logo_max_height: v })}
                min={5} max={60} step={1}
              />
              <span className="text-[10px] text-muted-foreground font-mono">{Number(t.logo_max_height).toFixed(0)}%</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">Fond produit</Label>
              <div className="flex gap-1">
                <button
                  onClick={() => update({ logo_mode: "light" })}
                  className={cn("flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-medium border transition-colors",
                    t.logo_mode === "light" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50")}
                >
                  <Sun className="w-3 h-3" /> Clair
                </button>
                <button
                  onClick={() => update({ logo_mode: "dark" })}
                  className={cn("flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-medium border transition-colors",
                    t.logo_mode === "dark" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50")}
                >
                  <Moon className="w-3 h-3" /> Foncé
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">Rotation</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[Number(t.logo_rotation)]}
                  onValueChange={([v]) => update({ logo_rotation: v })}
                  min={0} max={360} step={1}
                  className="flex-1"
                />
                <button
                  onClick={() => update({ logo_rotation: 0 })}
                  className="p-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors"
                  title="Réinitialiser"
                >
                  <RotateCw className="w-3 h-3" />
                </button>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">{Number(t.logo_rotation).toFixed(0)}°</span>
            </div>
          </div>

          {/* Advanced settings (collapsible) */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className={cn("w-3 h-3 transition-transform", advancedOpen && "rotate-180")} />
              Paramètres avancés
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-muted-foreground">Opacité</Label>
                  <Slider
                    value={[Number(t.logo_opacity) * 100]}
                    onValueChange={([v]) => update({ logo_opacity: v / 100 })}
                    min={10} max={100} step={5}
                  />
                  <span className="text-[10px] text-muted-foreground font-mono">{(Number(t.logo_opacity) * 100).toFixed(0)}%</span>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-muted-foreground">Mode de fusion</Label>
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
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1 border-t border-border">
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-3.5 h-3.5 mr-1" /> Annuler
            </Button>
            <Button size="sm" onClick={() => onSave(t)} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              Sauvegarder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DemoProductEditor;
