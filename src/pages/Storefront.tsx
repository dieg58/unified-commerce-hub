import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import VariantMatrixDialog from "@/components/VariantMatrixDialog";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubdomain } from "@/components/SubdomainRouter";
import { useTenantBySlug } from "@/hooks/useTenantBySlug";
import { formatCurrency } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShoppingCart, Plus, Minus, Trash2, Loader2, Package, CheckCircle,
  AlertTriangle, Search, Store, Users, Sparkles, Heart, MapPin, Building2, Truck
} from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { toast } from "sonner";

const Storefront = () => {
  const { profile } = useAuth();
  const { items, addItem, removeItem, updateQty, clear, total, count } = useCart();
  const { isFavorite, toggleFavorite } = useWishlist();
  const [storeType, setStoreType] = useState<"staff" | "bulk">("bulk");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [sortBy, setSortBy] = useState<"name" | "price_asc" | "price_desc">("name");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [billingEntityId, setBillingEntityId] = useState<string>("");
  const [shippingEntityId, setShippingEntityId] = useState<string>("");
  const [variantMatrixProduct, setVariantMatrixProduct] = useState<any | null>(null);
  const [billingAddressId, setBillingAddressId] = useState<string>("");
  const [shippingAddressId, setShippingAddressId] = useState<string>("");

  const { tenantId: paramTenantId } = useParams<{ tenantId: string }>();
  const { tenantSlug } = useSubdomain();
  const { data: subdomainTenant } = useTenantBySlug(tenantSlug);
  const tenantId = paramTenantId || subdomainTenant?.id || profile?.tenant_id;

  // Fetch tenant branding
  const { data: tenant } = useQuery({
    queryKey: ["store-tenant", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, tenant_branding(*)")
        .eq("id", tenantId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["store-products", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_prices(*), product_variants(*)")
        .eq("tenant_id", tenantId!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: entities } = useQuery({
    queryKey: ["store-entities", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("*").eq("tenant_id", tenantId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: budgets } = useQuery({
    queryKey: ["store-budgets", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("budgets").select("*").eq("tenant_id", tenantId!);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch shipping config
  const { data: shippingConfig } = useQuery({
    queryKey: ["store-shipping", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_shipping")
        .select("*")
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch addresses for selected entities
  const { data: billingAddresses } = useQuery({
    queryKey: ["store-addresses-billing", billingEntityId],
    queryFn: async () => {
      const { data, error } = await supabase.from("addresses").select("*").eq("entity_id", billingEntityId).eq("type", "billing").order("is_default", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!billingEntityId,
  });

  const { data: shippingAddresses } = useQuery({
    queryKey: ["store-addresses-shipping", shippingEntityId],
    queryFn: async () => {
      const { data, error } = await supabase.from("addresses").select("*").eq("entity_id", shippingEntityId).eq("type", "shipping").order("is_default", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!shippingEntityId,
  });

  const branding = tenant?.tenant_branding as any;
  const primaryColor = branding?.primary_color || "#0ea5e9";
  const accentColor = branding?.accent_color || "#10b981";
  const tenantName = tenant?.name || "Boutique";
  const headTitle = branding?.head_title || tenantName;
  const logoUrl = branding?.logo_url;

  // Per-product no-billing check helper
  const isProductFree = (product: any) => {
    return storeType === "bulk" ? !!product.no_billing_bulk : !!product.no_billing_staff;
  };

  // Categories from products — use product_categories if available, fallback to product.category field
  const { data: tenantCategories } = useQuery({
    queryKey: ["store-categories", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_categories").select("*").eq("tenant_id", tenantId!).order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const categories = useMemo(() => {
    if (tenantCategories?.length) {
      return ["Tous", ...tenantCategories.map((c) => c.name)];
    }
    if (!products) return ["Tous"];
    const cats = [...new Set(products.map((p) => p.category || "general"))];
    return ["Tous", ...cats.map((c) => c.charAt(0).toUpperCase() + c.slice(1))];
  }, [products, tenantCategories]);

  const filteredProducts = useMemo(() => {
    const filtered = products?.filter((p) => {
      const isActiveForStore = storeType === "bulk" ? p.active_bulk : p.active_staff;
      if (!isActiveForStore) return false;
      const prices = p.product_prices as any[];
      const hasPrice = prices?.some((pr: any) => pr.store_type === storeType);
      const q = search.toLowerCase();
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
      const matchesCategory = activeCategory === "Tous" || (p.category || "general").toLowerCase() === activeCategory.toLowerCase();
      return hasPrice && matchesSearch && matchesCategory;
    }) || [];

    // Sort
    return [...filtered].sort((a, b) => {
      if (sortBy === "price_asc") return getPrice(a) - getPrice(b);
      if (sortBy === "price_desc") return getPrice(b) - getPrice(a);
      return a.name.localeCompare(b.name);
    });
  }, [products, storeType, search, activeCategory, sortBy]);

  const getPrice = (product: any) => {
    const prices = product.product_prices as any[];
    const price = prices?.find((pr: any) => pr.store_type === storeType);
    return price ? Number(price.price) : 0;
  };

  const selectedBudget = budgets?.find((b) => b.entity_id === billingEntityId && b.store_type === storeType);
  const budgetRemaining = selectedBudget ? Number(selectedBudget.amount) - Number(selectedBudget.spent) : null;
  // Calculate effective total: exclude free products
  const freeProductIds = new Set(products?.filter((p) => isProductFree(p)).map((p) => p.id) || []);
  const effectiveTotal = items.reduce((s, i) => s + (freeProductIds.has(i.productId) ? 0 : i.price * i.qty), 0);
  const hasAnyFreeItems = items.some((i) => freeProductIds.has(i.productId));

  // Calculate shipping fee
  const shippingFee = useMemo(() => {
    if (!shippingConfig || shippingConfig.mode === "none") return 0;
    if (shippingConfig.mode === "fixed") return Number(shippingConfig.fixed_amount) || 0;
    if (shippingConfig.mode === "threshold") {
      const threshold = Number(shippingConfig.threshold_amount) || 0;
      return effectiveTotal >= threshold ? 0 : (Number(shippingConfig.threshold_fee) || 0);
    }
    if (shippingConfig.mode === "per_store_type") {
      return storeType === "bulk" ? (Number(shippingConfig.bulk_fee) || 0) : (Number(shippingConfig.staff_fee) || 0);
    }
    return 0;
  }, [shippingConfig, effectiveTotal, storeType]);

  const orderTotal = effectiveTotal + shippingFee;
  const isBudgetExceeded = storeType === "staff" && budgetRemaining !== null && orderTotal > budgetRemaining;
  const selectedEntity = entities?.find((e) => e.id === billingEntityId);
  const requiresApproval = selectedEntity?.requires_approval || isBudgetExceeded;
  const needsApproval = requiresApproval;

  const handleCheckout = async () => {
    if (!billingEntityId || !shippingEntityId || !profile || !tenantId) return;
    setPlacing(true);
    try {
      const { data: order, error: oErr } = await supabase
        .from("orders")
        .insert({
          tenant_id: tenantId, entity_id: billingEntityId, shipping_entity_id: shippingEntityId, created_by: profile.id,
          store_type: storeType, total: orderTotal, shipping_fee: shippingFee, status: needsApproval ? "pending_approval" : "pending",
          billing_address_id: billingAddressId || null, shipping_address_id: shippingAddressId || null,
        })
        .select().single();
      if (oErr) throw oErr;
      const orderItems = items.map((item) => ({
        order_id: order.id, tenant_id: tenantId, product_id: item.productId,
        qty: item.qty, unit_price: freeProductIds.has(item.productId) ? 0 : item.price,
        variant_id: item.variantId || null,
        variant_label: item.variantLabel || null,
      }));
      const { error: iErr } = await supabase.from("order_items").insert(orderItems);
      if (iErr) throw iErr;
      // Send email notification (fire and forget)
      const emailEvent = needsApproval ? "approval_required" : "order_confirmed";
      supabase.functions.invoke("send-order-email", { body: { order_id: order.id, event_type: emailEvent } })
        .catch((e) => console.warn("Email send failed:", e));
      toast.success(needsApproval ? "Commande soumise pour approbation" : "Commande confirmée !");
      clear(); setCheckoutOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally { setPlacing(false); }
  };

  if (!tenantId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Aucun tenant assigné</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto bg-background">
      {/* ─── Top Nav Bar ─── */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={tenantName} className="h-8 object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: primaryColor }}>
                {tenantName.charAt(0)}
              </div>
            )}
            <span className="font-semibold text-foreground text-sm hidden sm:inline">{tenantName}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setStoreType("bulk"); clear(); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${storeType === "bulk" ? "text-white" : "text-muted-foreground hover:text-foreground"}`}
              style={storeType === "bulk" ? { backgroundColor: primaryColor } : {}}
            >
              Boutique Interne
            </button>
            <button
              onClick={() => { setStoreType("staff"); clear(); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${storeType === "staff" ? "text-white" : "text-muted-foreground hover:text-foreground"}`}
              style={storeType === "staff" ? { backgroundColor: primaryColor } : {}}
            >
              Merch Employé
            </button>
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <button className="relative p-2 rounded-md hover:bg-muted transition-colors ml-2">
                  <ShoppingCart className="w-5 h-5 text-foreground" />
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: primaryColor }}>
                      {count}
                    </span>
                  )}
                </button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader><SheetTitle>Panier ({count})</SheetTitle></SheetHeader>
                <CartPanel
                  items={items} updateQty={updateQty} removeItem={removeItem}
                  total={effectiveTotal} onCheckout={() => setCheckoutOpen(true)}
                  primaryColor={primaryColor} freeProductIds={freeProductIds}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* ─── Hero Banner ─── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd, ${accentColor}99)`,
        }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/20 -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/10 translate-y-1/3 -translate-x-1/4" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-12 md:py-16">
          <div className="flex items-center gap-2 mb-4">
            <Badge className="bg-white/20 text-white border-white/30 text-xs gap-1 backdrop-blur-sm">
              <Sparkles className="w-3 h-3" /> Nouvelle collection disponible
            </Badge>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight max-w-xl">
            Boutique Merch<br />{headTitle}
          </h1>
          <p className="text-white/80 mt-4 max-w-lg text-sm md:text-base leading-relaxed">
            Découvrez notre sélection exclusive de merchandising pour les collaborateurs. Commandez et récupérez au bureau.
          </p>
        </div>
      </section>

      {/* ─── Store Type Selector ─── */}
      <div className="max-w-7xl mx-auto px-6 -mt-6 relative z-10">
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden grid grid-cols-2">
          <button
            onClick={() => { setStoreType("bulk"); clear(); }}
            className={`flex flex-col items-center gap-1 py-4 transition-colors ${storeType === "bulk" ? "bg-card" : "bg-muted/30"}`}
            style={storeType === "bulk" ? { borderBottom: `3px solid ${primaryColor}` } : { borderBottom: "3px solid transparent" }}
          >
            <Store className="w-5 h-5" style={{ color: storeType === "bulk" ? primaryColor : undefined }} />
            <span className="text-sm font-semibold" style={{ color: storeType === "bulk" ? primaryColor : undefined }}>Merch Interne</span>
            <span className="text-[10px] text-muted-foreground">Commandes en volume</span>
          </button>
          <button
            onClick={() => { setStoreType("staff"); clear(); }}
            className={`flex flex-col items-center gap-1 py-4 transition-colors ${storeType === "staff" ? "bg-card" : "bg-muted/30"}`}
            style={storeType === "staff" ? { borderBottom: `3px solid ${primaryColor}` } : { borderBottom: "3px solid transparent" }}
          >
            <Users className="w-5 h-5" style={{ color: storeType === "staff" ? primaryColor : undefined }} />
            <span className="text-sm font-semibold" style={{ color: storeType === "staff" ? primaryColor : undefined }}>Merch Employé</span>
            <span className="text-[10px] text-muted-foreground">Commandes individuelles</span>
          </button>
        </div>
      </div>

      {/* ─── Store type description ─── */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
          <p className="text-sm font-semibold text-foreground flex items-center justify-center gap-2">
            <Package className="w-4 h-4" style={{ color: primaryColor }} />
            {storeType === "bulk"
              ? "Commandes en volume pour équipes & événements"
              : "Commandes individuelles pour employés"
            }
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {storeType === "bulk"
              ? "Quantités minimales requises • Livraison sous 2-3 semaines • Idéal pour séminaires et événements"
              : "Commandez librement dans la limite de votre budget • Récupération au bureau"
            }
          </p>
        </div>
      </div>

      {/* ─── Category filters + Search ─── */}
      <div className="max-w-7xl mx-auto px-6 mt-6 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeCategory === cat
                  ? "text-white border-transparent"
                  : "text-foreground border-border hover:border-foreground/30 bg-card"
              }`}
              style={activeCategory === cat ? { backgroundColor: primaryColor } : {}}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit..." className="pl-9 h-9 text-sm" />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nom A-Z</SelectItem>
              <SelectItem value="price_asc">Prix croissant</SelectItem>
              <SelectItem value="price_desc">Prix décroissant</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── Product Grid ─── */}
      <div className="max-w-7xl mx-auto px-6 mt-6 pb-12">
        {!filteredProducts.length ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Aucun produit disponible dans cette catégorie</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map((product) => {
              const price = getPrice(product);
              const productVariants = (product as any).product_variants as any[] || [];
              const activeVariants = productVariants.filter((v: any) => v.active);
              const hasVariants = activeVariants.length > 0;
              const inCart = items.find((i) => i.productId === product.id && !i.variantId);
              const variantItemsInCart = items.filter((i) => i.productId === product.id && i.variantId);
              const totalInCart = (inCart?.qty || 0) + variantItemsInCart.reduce((s, i) => s + i.qty, 0);
              const imageUrl = product.image_url;
              return (
                <div key={product.id} className="group bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden flex flex-col">
                  {/* Image */}
                  <div className="relative aspect-square bg-muted/30 overflow-hidden">
                    {imageUrl ? (
                      <img src={imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-16 h-16 text-muted-foreground/15" />
                      </div>
                    )}
                    {/* Category badge */}
                    <div className="absolute top-3 left-3">
                      <Badge className="text-[10px] bg-white/90 text-foreground border-0 backdrop-blur-sm shadow-sm capitalize">
                        {product.category || "general"}
                      </Badge>
                    </div>
                    {storeType === "bulk" && product.min_bulk_qty > 1 ? (
                      <div className="absolute top-3 right-3">
                        <Badge className="text-[10px] text-white border-0 gap-1" style={{ backgroundColor: primaryColor }}>
                          <Package className="w-2.5 h-2.5" /> Min. {product.min_bulk_qty} pcs
                        </Badge>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                      >
                        <Heart className={`w-4 h-4 ${isFavorite(product.id) ? "text-red-500 fill-red-500" : "text-muted-foreground"}`} />
                      </button>
                    )}
                  </div>
                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">{product.name}</h3>
                    {product.description && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{product.description}</p>
                    )}
                    <div className="mt-auto pt-2 space-y-2">
                      <p className="text-lg font-bold" style={{ color: primaryColor }}>
                        {isProductFree(product) ? (
                          <span className="flex items-center gap-1.5">
                            <span className="line-through text-sm text-muted-foreground font-normal">{formatCurrency(price)}</span>
                            <span>Offert</span>
                          </span>
                        ) : formatCurrency(price)}
                      </p>
                      <div className="flex items-center justify-between">
                      {hasVariants ? (
                        totalInCart > 0 ? (
                          <>
                            <span className="text-xs font-medium text-muted-foreground">{totalInCart} dans le panier</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs rounded-lg"
                              onClick={() => setVariantMatrixProduct(product)}
                            >
                              <Plus className="w-3 h-3" /> Modifier
                            </Button>
                          </>
                        ) : (
                          <>
                            <span />
                            <Button
                              size="sm"
                              className="gap-1.5 text-white rounded-lg"
                              style={{ backgroundColor: primaryColor }}
                              onClick={() => setVariantMatrixProduct(product)}
                            >
                              <Plus className="w-3.5 h-3.5" /> Choisir
                            </Button>
                          </>
                        )
                      ) : inCart ? (
                        <>
                          <span />
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                const minQty = storeType === "bulk" ? product.min_bulk_qty : 1;
                                const newQty = inCart.qty - 1;
                                updateQty(product.id, newQty < minQty ? 0 : newQty);
                              }}
                              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-bold w-6 text-center">{inCart.qty}</span>
                            <button
                              onClick={() => updateQty(product.id, inCart.qty + 1)}
                              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span />
                          <Button
                            size="sm"
                            className="gap-1.5 text-white rounded-lg"
                            style={{ backgroundColor: primaryColor }}
                            onClick={() => { addItem({ productId: product.id, name: product.name, sku: product.sku, price, storeType }, storeType === "bulk" ? Math.max(1, product.min_bulk_qty) : 1); setCartOpen(true); }}
                          >
                            <Plus className="w-3.5 h-3.5" /> Ajouter
                          </Button>
                        </>
                      )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Checkout Dialog ─── */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-auto">
          <DialogHeader><DialogTitle>Finaliser la commande</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Billing entity + address */}
            <div className="space-y-3">
              <label className="text-sm font-semibold flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-primary" /> Facturation</label>
              <div className="space-y-2">
                <Select value={billingEntityId} onValueChange={(v) => { setBillingEntityId(v); setBillingAddressId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner l'entité à facturer" /></SelectTrigger>
                  <SelectContent>
                    {entities?.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name} ({e.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {billingEntityId && billingAddresses && billingAddresses.length > 0 && (
                  <Select value={billingAddressId} onValueChange={setBillingAddressId}>
                    <SelectTrigger className="text-xs">
                      <MapPin className="w-3 h-3 mr-1 shrink-0 text-muted-foreground" />
                      <SelectValue placeholder="Adresse de facturation (optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                      {billingAddresses.map((a) => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">
                          {a.label} — {a.address_line1}, {a.postal_code} {a.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <Separator />

            {/* Shipping entity + address */}
            <div className="space-y-3">
              <label className="text-sm font-semibold flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-primary" /> Livraison</label>
              <div className="space-y-2">
                <Select value={shippingEntityId} onValueChange={(v) => { setShippingEntityId(v); setShippingAddressId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner l'entité de livraison" /></SelectTrigger>
                  <SelectContent>
                    {entities?.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name} ({e.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {shippingEntityId && shippingAddresses && shippingAddresses.length > 0 && (
                  <Select value={shippingAddressId} onValueChange={setShippingAddressId}>
                    <SelectTrigger className="text-xs">
                      <MapPin className="w-3 h-3 mr-1 shrink-0 text-muted-foreground" />
                      <SelectValue placeholder="Adresse de livraison (optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                      {shippingAddresses.map((a) => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">
                          {a.label} — {a.address_line1}, {a.postal_code} {a.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            {billingEntityId && storeType === "staff" && budgetRemaining !== null && (
              <div className={`rounded-lg border p-3 ${isBudgetExceeded ? "border-warning bg-warning/5" : "border-border bg-muted/30"}`}>
                <div className="flex items-center gap-2">
                  {isBudgetExceeded ? <AlertTriangle className="w-4 h-4 text-warning" /> : <CheckCircle className="w-4 h-4 text-success" />}
                  <span className="text-sm font-medium">Budget restant : {formatCurrency(budgetRemaining)}</span>
                </div>
                {isBudgetExceeded && <p className="text-xs text-warning mt-1">Le total ({formatCurrency(orderTotal)}) dépasse le budget. La commande nécessitera une approbation.</p>}
              </div>
            )}
            {needsApproval && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                <p className="text-xs text-warning">
                  {isBudgetExceeded ? "Budget dépassé — cette commande sera soumise à approbation." : "Cette entité nécessite une approbation pour les commandes."}
                </p>
              </div>
            )}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-sm font-medium">Résumé</p>
              {hasAnyFreeItems && (
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Certains produits sont offerts — seule la livraison sera facturée
                </div>
              )}
              {items.map((item) => {
                const isFree = freeProductIds.has(item.productId);
                return (
                  <div key={`${item.productId}__${item.variantId || ''}`} className="flex justify-between text-xs text-muted-foreground">
                    <span>{item.name}{item.variantLabel ? ` (${item.variantLabel})` : ""} × {item.qty}</span>
                    <span>{isFree ? <><span className="line-through">{formatCurrency(item.price * item.qty)}</span> <span className="text-primary font-medium">Offert</span></> : formatCurrency(item.price * item.qty)}</span>
                  </div>
                );
              })}
              {shippingFee > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Frais de port</span>
                  <span>{formatCurrency(shippingFee)}</span>
                </div>
              )}
              {shippingFee === 0 && shippingConfig && shippingConfig.mode !== "none" && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Frais de port</span>
                  <span className="text-primary font-medium">Offert</span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
                <span>Total</span>
                <span>{formatCurrency(orderTotal)}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Annuler</Button>
            <Button
              onClick={handleCheckout}
              disabled={!billingEntityId || !shippingEntityId || placing}
              className="text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {placing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
              {needsApproval ? "Soumettre pour approbation" : "Confirmer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Variant Matrix Dialog ─── */}
      {variantMatrixProduct && (
        <VariantMatrixDialog
          open={!!variantMatrixProduct}
          onOpenChange={(v) => { if (!v) setVariantMatrixProduct(null); }}
          product={variantMatrixProduct}
          variants={((variantMatrixProduct as any).product_variants as any[]) || []}
          basePrice={getPrice(variantMatrixProduct)}
          primaryColor={primaryColor}
          storeType={storeType}
          existingSelections={
            items
              .filter((i) => i.productId === variantMatrixProduct.id && i.variantId)
              .map((i) => ({ variantId: i.variantId!, qty: i.qty }))
          }
          onConfirm={(selections) => {
            // Remove all existing variant items for this product first
            const existingVariantItems = items.filter((i) => i.productId === variantMatrixProduct.id && i.variantId);
            for (const item of existingVariantItems) {
              removeItem(item.productId, item.variantId);
            }
            // Then add all new selections
            for (const sel of selections) {
              addItem({
                productId: variantMatrixProduct.id,
                variantId: sel.variantId,
                variantLabel: sel.variantValue,
                name: variantMatrixProduct.name,
                sku: variantMatrixProduct.sku,
                price: getPrice(variantMatrixProduct),
                storeType,
              }, sel.qty);
            }
            setCartOpen(true);
          }}
        />
      )}
    </div>
  );
};

/* ─── Cart Panel Component ─── */
function CartPanel({
  items, updateQty, removeItem, total, onCheckout, primaryColor, freeProductIds = new Set(),
}: {
  items: any[]; updateQty: (id: string, qty: number, variantId?: string) => void;
  removeItem: (id: string, variantId?: string) => void; total: number;
  onCheckout: () => void; primaryColor: string; freeProductIds?: Set<string>;
}) {
  const hasAnyFree = items.some((i) => freeProductIds.has(i.productId));
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto py-4 space-y-3">
        {hasAnyFree && items.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium p-2 rounded-md bg-primary/5 border border-primary/20">
            <CheckCircle className="w-3.5 h-3.5" />
            Certains produits sont offerts
          </div>
        )}
        {items.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Votre panier est vide</p>
          </div>
        ) : (
          items.map((item: any) => {
            const isFree = freeProductIds.has(item.productId);
            return (
            <div key={`${item.productId}__${item.variantId || ''}`} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              <div className="w-12 h-12 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-muted-foreground/30" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                {item.variantLabel && (
                  <p className="text-[11px] text-primary font-medium truncate">{item.variantLabel}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {isFree ? (<><span className="line-through">{formatCurrency(item.price)}</span> <span className="text-primary font-medium">Offert</span> × {item.qty}</>) : (<>{formatCurrency(item.price)} × {item.qty}</>)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item.productId, item.qty - 1, item.variantId)} className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
                <button onClick={() => updateQty(item.productId, item.qty + 1, item.variantId)} className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted">
                  <Plus className="w-3 h-3" />
                </button>
                <button onClick={() => removeItem(item.productId, item.variantId)} className="w-7 h-7 rounded flex items-center justify-center text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            );
          })
        )}
      </div>
      {items.length > 0 && (
        <div className="border-t border-border pt-4 pb-6 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-bold text-foreground">{formatCurrency(total)}</span>
          </div>
          <Button className="w-full text-white" style={{ backgroundColor: primaryColor }} onClick={onCheckout}>
            Passer commande
          </Button>
        </div>
      )}
    </div>
  );
}

export default Storefront;
