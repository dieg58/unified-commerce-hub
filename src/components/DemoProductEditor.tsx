import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Loader2, Move, Save, X } from "lucide-react";
import { toast } from "sonner";
import BrandedProductImage, { type LogoPlacement } from "./BrandedProductImage";

interface DemoTemplate {
  id: string;
  name: string;
  sku: string;
  base_image: string;
  category: string;
  price: number;
  logo_x: number;
  logo_y: number;
  logo_width: number;
  logo_rotation: number;
  logo_blend: string;
  logo_opacity: number;
  sort_order: number;
  active: boolean;
}

interface DemoProductEditorProps {
  previewLogoUrl?: string | null;
}

const DemoProductEditor = ({ previewLogoUrl }: DemoProductEditorProps) => {
  const qc = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<DemoTemplate | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["demo-product-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demo_product_templates" as any)
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as unknown as DemoTemplate[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (t: DemoTemplate) => {
      const { error } = await supabase
        .from("demo_product_templates" as any)
        .update({
          logo_x: t.logo_x,
          logo_y: t.logo_y,
          logo_width: t.logo_width,
          logo_rotation: t.logo_rotation,
          logo_blend: t.logo_blend,
          logo_opacity: t.logo_opacity,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Cliquez sur un produit pour ajuster la position du logo. Les modifications sont appliquées lors de la prochaine régénération.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {templates?.map((t) => (
          <button
            key={t.id}
            onClick={() => setEditingTemplate({ ...t })}
            className="group relative rounded-lg border border-border overflow-hidden bg-card hover:ring-2 hover:ring-primary/50 transition-all text-left"
          >
            <div className="aspect-square relative">
              <BrandedProductImage
                imageUrl={`/demo/${t.base_image}`}
                logoUrl={previewLogoUrl}
                logoPlacement={{
                  x: Number(t.logo_x),
                  y: Number(t.logo_y),
                  width: Number(t.logo_width),
                  rotation: Number(t.logo_rotation),
                  blend: t.logo_blend,
                  opacity: Number(t.logo_opacity),
                }}
                className="w-full h-full"
              />
              {!t.active && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                  <Badge variant="secondary" className="text-[10px]">Désactivé</Badge>
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="text-xs font-medium text-foreground truncate">{t.name}</p>
              <p className="text-[10px] text-muted-foreground">{t.sku}</p>
            </div>
          </button>
        ))}
      </div>

      {editingTemplate && (
        <LogoPlacementDialog
          template={editingTemplate}
          logoUrl={previewLogoUrl}
          onClose={() => setEditingTemplate(null)}
          onSave={(t) => saveMutation.mutate(t)}
          saving={saveMutation.isPending}
        />
      )}
    </div>
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
    rotation: Number(t.logo_rotation),
    blend: t.logo_blend,
    opacity: Number(t.logo_opacity),
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="w-4 h-4" /> {t.name} — Placement du logo
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-[1fr_200px] gap-4">
          {/* Image with draggable logo */}
          <div
            ref={containerRef}
            className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/30 cursor-crosshair select-none"
          >
            <img
              src={`/demo/${t.base_image}`}
              alt={t.name}
              className="w-full h-full object-cover"
              draggable={false}
            />
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
                      mixBlendMode: placement.blend as any,
                      opacity: placement.opacity,
                      maxHeight: "100%",
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
              <Label className="text-[10px]">Largeur (%)</Label>
              <Slider
                value={[Number(t.logo_width)]}
                onValueChange={([v]) => update({ logo_width: v })}
                min={5} max={80} step={1}
              />
              <span className="text-[10px] text-muted-foreground">{Number(t.logo_width).toFixed(0)}%</span>
            </div>

            <Separator />

            <div className="space-y-1">
              <Label className="text-[10px]">Rotation (°)</Label>
              <Slider
                value={[Number(t.logo_rotation)]}
                onValueChange={([v]) => update({ logo_rotation: v })}
                min={-45} max={45} step={1}
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
