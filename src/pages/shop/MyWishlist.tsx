import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/hooks/useCart";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart, Package, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const MyWishlist = () => {
  const { profile } = useAuth();
  const { wishlistItems, toggleFavorite, isFavorite } = useWishlist();
  const { addItem } = useCart();
  const tenantId = profile?.tenant_id;

  const { data: products, isLoading } = useQuery({
    queryKey: ["wishlist-products", tenantId, wishlistItems],
    queryFn: async () => {
      if (!wishlistItems.length) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*, product_prices(*)")
        .eq("tenant_id", tenantId!)
        .in("id", wishlistItems);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && wishlistItems.length > 0,
  });

  const getPrice = (product: any, storeType: "staff" | "bulk" = "staff") => {
    const prices = product.product_prices as any[];
    const price = prices?.find((pr: any) => pr.store_type === storeType);
    return price ? Number(price.price) : 0;
  };

  const handleAddToCart = (product: any) => {
    const price = getPrice(product);
    if (!price) {
      toast.error("Aucun prix défini pour ce produit");
      return;
    }
    addItem({ productId: product.id, name: product.name, price, sku: product.sku, storeType: "staff" });
    toast.success(`${product.name} ajouté au panier`);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-6 h-14 flex items-center gap-2">
        <Heart className="w-5 h-5 text-primary fill-primary" />
        <h1 className="text-lg font-bold text-foreground">Mes favoris</h1>
        <Badge variant="outline" className="ml-2 text-xs">{wishlistItems.length}</Badge>
      </header>

      <div className="p-6">
        {!products?.length ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Aucun produit dans vos favoris</p>
            <p className="text-muted-foreground text-xs mt-1">Ajoutez des produits depuis la boutique en cliquant sur le cœur</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {products.map((product) => {
              const price = getPrice(product);
              return (
                <div key={product.id} className="group bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden flex flex-col">
                  <div className="relative aspect-square bg-muted/30 overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-16 h-16 text-muted-foreground/15" />
                      </div>
                    )}
                    <button
                      onClick={() => toggleFavorite(product.id)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                    >
                      <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                    </button>
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">{product.name}</h3>
                    {product.description && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{product.description}</p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <p className="text-lg font-bold text-primary">
                        {price ? formatCurrency(price) : "—"}
                      </p>
                      <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => handleAddToCart(product)}>
                        <ShoppingCart className="w-3.5 h-3.5" /> Ajouter
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyWishlist;
