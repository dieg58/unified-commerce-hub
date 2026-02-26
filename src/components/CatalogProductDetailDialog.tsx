import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Sparkles, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";

interface VariantColor {
  color: string;
  hex: string | null;
  image_url: string | null;
}

interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  base_price: number;
  image_url: string | null;
  description: string | null;
  sku: string;
  stock_qty: number;
  is_new: boolean;
  variant_colors?: VariantColor[] | null;
  variant_sizes?: string[] | null;
}

interface Props {
  product: CatalogProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alreadyRequested?: boolean;
  hideRequestButton?: boolean;
}

const CatalogProductDetailDialog = ({ product, open, onOpenChange, alreadyRequested, hideRequestButton }: Props) => {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [selectedColor, setSelectedColor] = useState<VariantColor | null>(null);

  const colors = useMemo(() => {
    if (!product?.variant_colors || !Array.isArray(product.variant_colors)) return [];
    return product.variant_colors as VariantColor[];
  }, [product?.variant_colors]);

  const sizes = useMemo(() => {
    if (!product?.variant_sizes || !Array.isArray(product.variant_sizes)) return [];
    return product.variant_sizes as string[];
  }, [product?.variant_sizes]);

  const displayImage = selectedColor?.image_url || product?.image_url || null;

  const categoryParts = useMemo(() => {
    return product?.category?.split(">").map((s: string) => s.trim()).filter(Boolean) || [];
  }, [product?.category]);

  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!product || !profile?.tenant_id || !profile?.id) throw new Error("Données manquantes");
      const { error } = await supabase.from("product_requests").insert({
        catalog_product_id: product.id,
        tenant_id: profile.tenant_id,
        requested_by: profile.id,
        note: note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demande d'ajout envoyée !");
      qc.invalidateQueries({ queryKey: ["tenant-product-requests"] });
      setNote("");
      setSelectedColor(null);
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(`Erreur : ${err.message}`),
  });

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setSelectedColor(null); setNote(""); } onOpenChange(o); }}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[85vh] overflow-hidden">
        <div className="flex flex-col sm:flex-row max-h-[85vh]">
          {/* Left: Image */}
          <div className="sm:w-1/2 bg-muted flex items-center justify-center shrink-0 relative aspect-square">
            {displayImage ? (
              <img
                src={displayImage}
                alt={product.name}
                className="w-full h-full object-contain sm:absolute sm:inset-0 transition-all duration-200 p-2"
              />
            ) : (
              <Package className="w-16 h-16 text-muted-foreground/20" />
            )}
            {product.is_new && (
              <div className="absolute top-3 left-3">
                <Badge className="bg-warning text-warning-foreground text-[10px] gap-1">
                  <Sparkles className="w-3 h-3" /> Nouveau
                </Badge>
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="sm:w-1/2 overflow-y-auto p-5 space-y-4">
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

            {/* Name */}
            <div>
              <h3 className="text-base font-semibold text-foreground leading-tight">{product.name}</h3>
              <p className="text-xs text-muted-foreground font-mono mt-1">Réf. {product.sku}</p>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">{product.description}</p>
            )}

            {/* Price & stock */}
            <div className="flex items-baseline gap-3">
              <span className="text-lg font-bold text-primary">{formatCurrency(Number(product.base_price))}</span>
              <span className="text-xs text-muted-foreground">Stock : {product.stock_qty}</span>
            </div>

            {/* Colors */}
            {colors.length > 0 && (
              <div>
                <p className="text-xs font-medium text-foreground mb-2">
                  Couleurs disponibles
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
                        className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${
                          isActive ? "border-primary ring-2 ring-primary/30 scale-110" : "border-border hover:border-primary/50"
                        }`}
                      >
                        {c.hex ? (
                          <span
                            className="w-5 h-5 rounded-full block"
                            style={{ backgroundColor: c.hex.startsWith("#") ? c.hex : `#${c.hex}` }}
                          />
                        ) : c.image_url ? (
                          <img
                            src={c.image_url}
                            alt={c.color}
                            className="w-5 h-5 rounded-full object-cover block"
                          />
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
                <p className="text-xs font-medium text-foreground mb-2">Tailles disponibles</p>
                <div className="flex flex-wrap gap-1.5">
                  {sizes.map((s, idx) => (
                    <span key={idx} className="px-2.5 py-1 text-[11px] font-medium bg-secondary text-foreground rounded-md border border-border">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Request form (hidden for super admin) */}
            {!hideRequestButton && (
              <>
                {alreadyRequested ? (
                  <div className="rounded-lg border border-border p-3 bg-muted/50">
                    <span className="text-sm font-medium text-muted-foreground">Déjà demandé</span>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Note (optionnel)</label>
                      <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Couleurs souhaitées, quantités, emplacement du logo…"
                        rows={2}
                        className="text-xs"
                      />
                    </div>
                    <Button className="w-full gap-2" size="sm" onClick={() => requestMutation.mutate()} disabled={requestMutation.isPending}>
                      {requestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Demander l'ajout
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CatalogProductDetailDialog;
