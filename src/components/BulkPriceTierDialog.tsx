import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart, Layers, Check } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";

interface PriceTier {
  min_qty: number;
  unit_price: number;
}

interface BulkPriceTierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    sku: string;
    image_url: string | null;
    min_bulk_qty: number;
  };
  basePrice: number;
  tiers: PriceTier[];
  primaryColor: string;
  existingQty?: number;
  onConfirm: (qty: number, unitPrice: number) => void;
}

export default function BulkPriceTierDialog({
  open, onOpenChange, product, basePrice, tiers, primaryColor, existingQty, onConfirm,
}: BulkPriceTierDialogProps) {
  const [qty, setQty] = useState<number>(existingQty || product.min_bulk_qty || 1);

  const sortedTiers = useMemo(() => {
    return [...tiers].sort((a, b) => a.min_qty - b.min_qty);
  }, [tiers]);

  const activeTier = useMemo(() => {
    let active: PriceTier | null = null;
    for (const tier of sortedTiers) {
      if (qty >= tier.min_qty) active = tier;
    }
    return active;
  }, [qty, sortedTiers]);

  const unitPrice = activeTier ? Number(activeTier.unit_price) : basePrice;
  const totalPrice = unitPrice * qty;
  const savings = basePrice > 0 && unitPrice < basePrice
    ? Math.round((1 - unitPrice / basePrice) * 100)
    : 0;

  const handleConfirm = () => {
    if (qty <= 0) return;
    onConfirm(qty, unitPrice);
    onOpenChange(false);
  };

  const isEditing = (existingQty || 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Package className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="text-base">{product.name}</p>
              <p className="text-xs text-muted-foreground font-mono font-normal">{product.sku}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Tier pricing table */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Layers className="w-4 h-4" /> Prix dégressifs
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-3 bg-muted/50 px-4 py-2 border-b border-border text-xs font-semibold text-muted-foreground">
              <span>À partir de</span>
              <span className="text-center">Prix unitaire</span>
              <span className="text-right">Économie</span>
            </div>
            {/* Base price row */}
            <div className={`grid grid-cols-3 px-4 py-2.5 border-b border-border/50 text-sm transition-colors ${!activeTier ? "bg-primary/5" : ""}`}>
              <span className="font-medium">1 pc</span>
              <span className="text-center font-semibold">{formatCurrency(basePrice)}</span>
              <span className="text-right text-muted-foreground text-xs">—</span>
            </div>
            {sortedTiers.map((tier) => {
              const tierSavings = basePrice > 0 ? Math.round((1 - Number(tier.unit_price) / basePrice) * 100) : 0;
              const isActive = activeTier?.min_qty === tier.min_qty;
              return (
                <button
                  key={tier.min_qty}
                  onClick={() => setQty(tier.min_qty)}
                  className={`grid grid-cols-3 px-4 py-2.5 border-b border-border/50 last:border-0 text-sm w-full text-left transition-colors hover:bg-muted/50 ${isActive ? "bg-primary/5" : ""}`}
                >
                  <span className="font-medium flex items-center gap-1.5">
                    {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                    {tier.min_qty} pcs
                  </span>
                  <span className="text-center font-semibold">{formatCurrency(Number(tier.unit_price))}</span>
                  <span className="text-right">
                    {tierSavings > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-success/10 text-success border-success/20">
                        -{tierSavings}%
                      </Badge>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quantity input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Quantité</label>
          <Input
            type="number"
            min={product.min_bulk_qty || 1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 0))}
            className="w-full h-10 text-center text-lg font-semibold"
          />
          {product.min_bulk_qty > 1 && qty < product.min_bulk_qty && (
            <p className="text-xs text-destructive font-medium">
              Minimum de commande : {product.min_bulk_qty} pièces
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{qty}</span> × {formatCurrency(unitPrice)}
              {savings > 0 && (
                <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 h-5 bg-success/10 text-success border-success/20">
                  -{savings}%
                </Badge>
              )}
            </span>
            <span className="text-lg font-bold text-foreground">{formatCurrency(totalPrice)}</span>
          </div>
          <Button
            onClick={handleConfirm}
            disabled={qty <= 0 || (product.min_bulk_qty > 1 && qty < product.min_bulk_qty)}
            className="w-full text-white gap-1.5"
            style={{ backgroundColor: primaryColor }}
          >
            <ShoppingCart className="w-4 h-4" />
            {isEditing ? "Modifier le panier" : "Ajouter au panier"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
