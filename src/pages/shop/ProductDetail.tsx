import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { useSubdomain } from "@/components/SubdomainRouter";
import { useTenantBySlug } from "@/hooks/useTenantBySlug";
import { formatCurrency } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Heart, Loader2, Minus, Package, Plus, ShoppingCart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { toast } from "sonner";
import BrandedProductImage from "@/components/BrandedProductImage";

const ProductDetail = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { items, addItem, updateQty } = useCart();
  const { isFavorite, toggleFavorite } = useWishlist();
  const { tenantSlug } = useSubdomain();
  const { data: subdomainTenant } = useTenantBySlug(tenantSlug);
  const tenantId = subdomainTenant?.id || profile?.tenant_id;
  const { t } = useTranslation();
  const [storeType] = useState<"staff" | "bulk">("staff");
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const { data: tenantBranding } = useQuery({
    queryKey: ["tenant-branding", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_branding")
        .select("logo_url")
        .eq("tenant_id", tenantId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: product, isLoading } = useQuery({
    queryKey: ["product-detail", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_prices(*), product_variants(*)")
        .eq("id", productId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  const { data: priceTiers } = useQuery({
    queryKey: ["product-price-tiers", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_price_tiers")
        .select("min_qty, unit_price")
        .eq("product_id", productId!)
        .order("min_qty");
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
        <Package className="w-16 h-16 text-muted-foreground/20" />
        <p className="text-muted-foreground">{t("storefront.noProducts")}</p>
        <Button variant="outline" onClick={() => navigate("/shop")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> {t("common.back")}
        </Button>
      </div>
    );
  }

  const prices = product.product_prices as any[];
  const price = prices?.find((p: any) => p.store_type === storeType);
  const priceValue = price ? Number(price.price) : 0;
  const variants = ((product as any).product_variants as any[])?.filter((v: any) => v.active) || [];
  const selectedVariant = variants.find((v: any) => v.id === selectedVariantId);
  const finalPrice = priceValue + (selectedVariant?.price_adjustment || 0);

  const inCart = items.find(
    (i) => i.productId === product.id && (selectedVariantId ? i.variantId === selectedVariantId : !i.variantId)
  );

  const handleAdd = () => {
    addItem({
      productId: product.id,
      variantId: selectedVariantId || undefined,
      variantLabel: selectedVariant?.variant_value || undefined,
      name: product.name,
      sku: product.sku,
      price: finalPrice,
      storeType,
    });
    toast.success(t("storefront.addedToCart"));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" className="mb-6 gap-2" onClick={() => navigate("/shop")}>
        <ArrowLeft className="w-4 h-4" /> {t("common.back")}
      </Button>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="relative aspect-square rounded-xl overflow-hidden bg-muted/30 border border-border">
          <BrandedProductImage
            imageUrl={product.image_url}
            logoUrl={tenantBranding?.logo_url}
            logoPlacement={(product as any).logo_placement}
            alt={product.name}
            className="w-full h-full"
          />
          <button
            onClick={() => toggleFavorite(product.id)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
          >
            <Heart className={`w-5 h-5 ${isFavorite(product.id) ? "text-destructive fill-destructive" : "text-muted-foreground"}`} />
          </button>
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <Badge variant="secondary" className="w-fit capitalize mb-3">
            {product.category || "general"}
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{product.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">SKU: {product.sku}</p>

          <p className="text-3xl font-bold text-primary mt-6">{formatCurrency(finalPrice)}</p>

          {/* Bulk Price Tiers */}
          {priceTiers && priceTiers.length > 0 && (
            <div className="mt-4 rounded-lg border border-border overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b border-border">
                <h3 className="text-xs font-semibold text-foreground">Prix dégressifs (Bulk)</h3>
              </div>
              <div className="divide-y divide-border">
                {priceTiers.map((tier: any) => {
                  const tierPrice = Number(tier.unit_price);
                  const savings = finalPrice > 0 ? Math.round((1 - tierPrice / finalPrice) * 100) : 0;
                  return (
                    <div key={tier.min_qty} className="flex items-center justify-between px-4 py-2 text-sm">
                      <span className="text-muted-foreground">à partir de <span className="font-medium text-foreground">{tier.min_qty} pcs</span></span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{formatCurrency(tierPrice)}/u</span>
                        {savings > 0 && (
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-success/10 text-success">-{savings}%</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {product.description && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="text-sm font-semibold mb-2">{t("common.description")}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            </>
          )}

          {variants.length > 0 && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="text-sm font-semibold mb-3">{t("storefront.variants")}</h3>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v: any) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id === selectedVariantId ? null : v.id)}
                      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        selectedVariantId === v.id
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border text-foreground hover:border-primary/50"
                      }`}
                    >
                      {v.variant_value}
                      {v.price_adjustment !== 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({v.price_adjustment > 0 ? "+" : ""}{formatCurrency(v.price_adjustment)})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator className="my-6" />

          <div className="flex items-center gap-3 mt-auto">
            {inCart ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQty(product.id, inCart.qty - 1, selectedVariantId || undefined)}
                  className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-lg font-bold w-8 text-center">{inCart.qty}</span>
                <button
                  onClick={() => updateQty(product.id, inCart.qty + 1, selectedVariantId || undefined)}
                  className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button size="lg" className="gap-2 flex-1" onClick={handleAdd}>
                <ShoppingCart className="w-4 h-4" /> {t("storefront.addToCart")}
              </Button>
            )}
          </div>

          {/* Stock info */}
          <div className="mt-4 text-xs text-muted-foreground">
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
    </div>
  );
};

export default ProductDetail;
