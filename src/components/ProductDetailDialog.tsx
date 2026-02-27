import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Heart, Layers, Check, Minus, Package, Plus, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";
import BrandedProductImage from "@/components/BrandedProductImage";
import { useTranslation } from "react-i18next";

interface PriceTier {
  min_qty: number;
  unit_price: number;
}

interface ProductDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  price: number;
  storeType: "staff" | "bulk";
  primaryColor: string;
  logoUrl?: string | null;
  tiers: PriceTier[];
  isFree: boolean;
  inCartQty: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onAddToCart: (qty: number, unitPrice: number) => void;
  onUpdateQty: (qty: number) => void;
  onOpenVariantMatrix?: () => void;
  hasVariants: boolean;
}

export default function ProductDetailDialog({
  open, onOpenChange, product, price, storeType, primaryColor, logoUrl,
  tiers, isFree, inCartQty, isFavorite, onToggleFavorite,
  onAddToCart, onUpdateQty, onOpenVariantMatrix, hasVariants,
}: ProductDetailDialogProps) {
  const { t } = useTranslation();
  const minQty = storeType === "bulk" ? Math.max(1, product.min_bulk_qty || 1) : 1;
  const [qty, setQty] = useState<number>(inCartQty || minQty);

  const sortedTiers = useMemo(() => [...tiers].sort((a, b) => a.min_qty - b.min_qty), [tiers]);
  const hasTiers = storeType === "bulk" && sortedTiers.length > 0;

  const activeTier = useMemo(() => {
    let active: PriceTier | null = null;
    for (const tier of sortedTiers) {
      if (qty >= tier.min_qty) active = tier;
    }
    return active;
  }, [qty, sortedTiers]);

  const unitPrice = isFree ? 0 : (hasTiers && activeTier ? Number(activeTier.unit_price) : price);
  const totalPrice = unitPrice * qty;
  const savings = price > 0 && unitPrice < price ? Math.round((1 - unitPrice / price) * 100) : 0;

  const isEditing = inCartQty > 0;

  const handleConfirm = () => {
    if (qty <= 0) return;
    if (isEditing) {
      onUpdateQty(qty);
    } else {
      onAddToCart(qty, unitPrice);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-auto p-0">
        <div className="grid sm:grid-cols-[65%_35%] gap-0">
          {/* Image */}
          <div className="relative aspect-square sm:aspect-auto sm:min-h-[500px] bg-muted/30 overflow-hidden sm:rounded-l-lg">
            <BrandedProductImage
              imageUrl={product.image_url}
              logoUrl={logoUrl}
              logoPlacement={product.logo_placement}
              alt={product.name}
              className="w-full h-full"
            />
            <button
              onClick={onToggleFavorite}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? "text-destructive fill-destructive" : "text-muted-foreground"}`} />
            </button>
          </div>

          {/* Info */}
          <div className="p-5 flex flex-col">
            <DialogHeader className="text-left mb-0 space-y-1">
              <Badge variant="secondary" className="w-fit capitalize text-[10px]">
                {product.category || "general"}
              </Badge>
              <DialogTitle className="text-lg leading-tight">{product.name}</DialogTitle>
              <p className="text-xs text-muted-foreground font-mono">SKU: {product.sku}</p>
            </DialogHeader>

            {product.description && (
              <p className="text-xs text-muted-foreground mt-3 line-clamp-3 leading-relaxed">{product.description}</p>
            )}

            {/* Price */}
            <div className="mt-4">
              {isFree ? (
                <div className="flex items-center gap-2">
                  <span className="line-through text-sm text-muted-foreground">{formatCurrency(price)}</span>
                  <span className="text-xl font-bold" style={{ color: primaryColor }}>{t("storefront.free")}</span>
                </div>
              ) : (
                <p className="text-xl font-bold" style={{ color: primaryColor }}>{formatCurrency(unitPrice)}</p>
              )}
            </div>

            {/* Price Tiers */}
            {hasTiers && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Layers className="w-3.5 h-3.5" /> Prix dégressifs
                </div>
                <div className="rounded-lg border border-border overflow-hidden text-xs">
                  <div className="grid grid-cols-3 bg-muted/50 px-3 py-1.5 border-b border-border font-semibold text-muted-foreground">
                    <span>À partir de</span>
                    <span className="text-center">Prix/u</span>
                    <span className="text-right">Économie</span>
                  </div>
                  {sortedTiers.map((tier, idx) => {
                    const firstTierPrice = Number(sortedTiers[0].unit_price);
                    const tierPrice = Number(tier.unit_price);
                    const tierSavings = idx > 0 && firstTierPrice > 0 ? Math.round((1 - tierPrice / firstTierPrice) * 100) : 0;
                    const isActive = activeTier?.min_qty === tier.min_qty;
                    return (
                      <button
                        key={tier.min_qty}
                        onClick={() => setQty(tier.min_qty)}
                        className={`grid grid-cols-3 px-3 py-2 border-b border-border/50 last:border-0 w-full text-left transition-colors hover:bg-muted/50 ${isActive ? "bg-primary/5" : ""}`}
                      >
                        <span className="font-medium flex items-center gap-1">
                          {isActive && <Check className="w-3 h-3 text-primary" />}
                          {tier.min_qty} pcs
                        </span>
                        <span className="text-center font-semibold">{formatCurrency(tierPrice)}</span>
                        <span className="text-right flex justify-end">
                          {tierSavings > 0 ? (
                            <span className="inline-flex items-center px-1.5 py-0 h-4 rounded-full text-[9px] font-semibold bg-success/15 text-success">
                              -{tierSavings}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Variants button */}
            {hasVariants && onOpenVariantMatrix && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full gap-1.5"
                onClick={() => { onOpenChange(false); onOpenVariantMatrix(); }}
              >
                {t("storefront.choose")} ({((product.product_variants as any[])?.filter((v: any) => v.active) || []).length} variantes)
              </Button>
            )}

            {/* Quantity + Add to cart (only for non-variant products) */}
            {!hasVariants && (
              <>
                <Separator className="my-3" />
                <div className="space-y-2">
                  <label className="text-xs font-medium">{t("storefront.quantity") || "Quantité"}</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQty(Math.max(minQty, qty - 1))}
                      className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <Input
                      type="number"
                      min={minQty}
                      value={qty}
                      onChange={(e) => setQty(Math.max(minQty, parseInt(e.target.value) || minQty))}
                      className="w-20 h-9 text-center text-sm font-semibold"
                    />
                    <button
                      onClick={() => setQty(qty + 1)}
                      className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {storeType === "bulk" && product.min_bulk_qty > 1 && qty < product.min_bulk_qty && (
                    <p className="text-[10px] text-destructive font-medium">
                      Minimum : {product.min_bulk_qty} pièces
                    </p>
                  )}
                </div>

                {/* Total + Button */}
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  {!isFree && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {qty} × {formatCurrency(unitPrice)}
                        {savings > 0 && (
                          <Badge variant="secondary" className="ml-1.5 text-[9px] px-1 py-0 h-4 bg-success/10 text-success border-success/20">
                            -{savings}%
                          </Badge>
                        )}
                      </span>
                      <span className="text-base font-bold">{formatCurrency(totalPrice)}</span>
                    </div>
                  )}
                  <Button
                    onClick={handleConfirm}
                    disabled={qty <= 0 || (storeType === "bulk" && product.min_bulk_qty > 1 && qty < product.min_bulk_qty)}
                    className="w-full text-white gap-1.5"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {isEditing ? t("storefront.modify") || "Modifier" : t("storefront.addToCart")}
                  </Button>
                </div>
              </>
            )}

            {/* Stock info */}
            <div className="mt-3 text-[10px] text-muted-foreground">
              {product.stock_type === "in_stock" ? (
                <span className={product.stock_qty > 0 ? "text-success" : "text-destructive"}>
                  {product.stock_qty > 0 ? `${product.stock_qty} ${t("storefront.inStock")}` : t("storefront.outOfStock")}
                </span>
              ) : (
                <span>{t("storefront.madeToOrder")}</span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
