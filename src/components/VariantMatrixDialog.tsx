import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";

interface Variant {
  id: string;
  variant_label: string;
  variant_value: string;
  price_adjustment: number;
  stock_qty: number;
  active: boolean;
}

interface VariantMatrixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    sku: string;
    image_url: string | null;
    min_bulk_qty?: number;
  };
  variants: Variant[];
  basePrice: number;
  primaryColor: string;
  storeType?: "bulk" | "staff";
  onConfirm: (selections: { variantId: string; variantValue: string; qty: number }[]) => void;
}

export default function VariantMatrixDialog({
  open, onOpenChange, product, variants, basePrice, primaryColor, storeType, onConfirm,
}: VariantMatrixDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Parse variants into rows (sizes) and columns (colors)
  const { sizes, colors, variantMap } = useMemo(() => {
    const sizesSet = new Set<string>();
    const colorsSet = new Set<string>();
    const map = new Map<string, Variant>();

    for (const v of variants) {
      if (!v.active) continue;
      const parts = v.variant_value.split(" - ");
      let color: string, size: string;
      if (parts.length >= 2) {
        color = parts.slice(0, -1).join(" - ").trim();
        size = parts[parts.length - 1].trim();
      } else {
        color = v.variant_value;
        size = "";
      }
      colorsSet.add(color);
      sizesSet.add(size);
      map.set(`${color}__${size}`, v);
    }

    // Sort sizes logically
    const sizeOrder = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];
    const sortedSizes = [...sizesSet].sort((a, b) => {
      const ia = sizeOrder.indexOf(a.toUpperCase());
      const ib = sizeOrder.indexOf(b.toUpperCase());
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });

    return { sizes: sortedSizes, colors: [...colorsSet], variantMap: map };
  }, [variants]);

  const handleQtyChange = (key: string, value: string) => {
    const num = parseInt(value) || 0;
    setQuantities((prev) => ({ ...prev, [key]: Math.max(0, num) }));
  };

  const totalQty = Object.values(quantities).reduce((s, q) => s + q, 0);
  const totalPrice = Object.entries(quantities).reduce((s, [key, qty]) => {
    if (qty <= 0) return s;
    const variant = variantMap.get(key);
    const price = basePrice + (variant?.price_adjustment || 0);
    return s + price * qty;
  }, 0);

  const handleConfirm = () => {
    const selections = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([key, qty]) => {
        const variant = variantMap.get(key)!;
        return { variantId: variant.id, variantValue: variant.variant_value, qty };
      });
    if (selections.length === 0) return;
    onConfirm(selections);
    setQuantities({});
    onOpenChange(false);
  };

  // If only one axis (no " - " separator), show a simple list
  const isSingleAxis = sizes.length === 1 && sizes[0] === "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-auto">
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

        {isSingleAxis ? (
          /* ─── Simple list for single-axis variants ─── */
          <div className="space-y-2">
            {colors.map((color) => {
              const key = `${color}__`;
              const variant = variantMap.get(key);
              if (!variant) return null;
              return (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                  <div>
                    <p className="text-sm font-medium">{color}</p>
                    <p className="text-xs text-muted-foreground">Stock: {variant.stock_qty}</p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={variant.stock_qty}
                    value={quantities[key] || ""}
                    onChange={(e) => handleQtyChange(key, e.target.value)}
                    placeholder="0"
                    className="w-20 h-8 text-center text-sm"
                  />
                </div>
              );
            })}
          </div>
        ) : (
          /* ─── Cross-table: sizes as rows, colors as columns ─── */
          <div className="overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 text-xs font-semibold text-muted-foreground border-b border-border sticky left-0 bg-background min-w-[80px]">
                    Taille
                  </th>
                  {colors.map((color) => (
                    <th key={color} className="text-center p-2 text-xs font-semibold text-muted-foreground border-b border-border min-w-[80px]">
                      {color}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizes.map((size) => (
                  <tr key={size} className="border-b border-border/50 last:border-0">
                    <td className="p-2 font-medium text-sm sticky left-0 bg-background">
                      {size}
                    </td>
                    {colors.map((color) => {
                      const key = `${color}__${size}`;
                      const variant = variantMap.get(key);
                      if (!variant) {
                        return <td key={key} className="p-2 text-center text-muted-foreground/30">—</td>;
                      }
                      return (
                        <td key={key} className="p-2">
                          <Input
                            type="number"
                            min={0}
                            max={variant.stock_qty}
                            value={quantities[key] || ""}
                            onChange={(e) => handleQtyChange(key, e.target.value)}
                            placeholder="0"
                            className="w-16 h-8 text-center text-sm mx-auto"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Footer summary ─── */}
        {(() => {
          const minQty = storeType === "bulk" ? (product.min_bulk_qty || 1) : 1;
          const belowMin = totalQty > 0 && totalQty < minQty;
          return (
            <div className="pt-4 border-t border-border space-y-2">
              {storeType === "bulk" && minQty > 1 && (
                <p className={`text-xs ${belowMin ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  Minimum de commande : {minQty} pièces
                </p>
              )}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{totalQty}</span> article{totalQty > 1 ? "s" : ""}
                  {totalQty > 0 && (
                    <span className="ml-2">·  <span className="font-semibold text-foreground">{formatCurrency(totalPrice)}</span></span>
                  )}
                </div>
                <Button
                  onClick={handleConfirm}
                  disabled={totalQty === 0 || belowMin}
                  className="text-white gap-1.5"
                  style={{ backgroundColor: primaryColor }}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Ajouter au panier
                </Button>
              </div>
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
