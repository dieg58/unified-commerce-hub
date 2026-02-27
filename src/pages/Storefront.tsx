import { useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import VariantMatrixDialog from "@/components/VariantMatrixDialog";
import BulkPriceTierDialog from "@/components/BulkPriceTierDialog";
import ProductDetailDialog from "@/components/ProductDetailDialog";
import BrandedProductImage from "@/components/BrandedProductImage";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShoppingCart, Plus, Minus, Trash2, Loader2, Package, CheckCircle,
  AlertTriangle, Search, Store, Users, Sparkles, Heart, MapPin, Building2, Truck, User, LogOut
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useWishlist } from "@/hooks/useWishlist";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const Storefront = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isTenantView = location.pathname.startsWith("/tenant/");
  const { profile, signOut } = useAuth();
  const { items, addItem, removeItem, updateQty, clear, total, count } = useCart();
  const { isFavorite, toggleFavorite } = useWishlist();
  const [storeType, setStoreType] = useState<"staff" | "bulk">("bulk");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("__all__");
  const [sortBy, setSortBy] = useState<"name" | "price_asc" | "price_desc">("name");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<{ id: string; total: number; itemCount: number; needsApproval: boolean } | null>(null);
  const [billingEntityId, setBillingEntityId] = useState<string>("");
  const [shippingEntityId, setShippingEntityId] = useState<string>("");
  const [variantMatrixProduct, setVariantMatrixProduct] = useState<any | null>(null);
  const [billingAddressId, setBillingAddressId] = useState<string>("");
  const [shippingAddressId, setShippingAddressId] = useState<string>("");
  const [switchStoreTarget, setSwitchStoreTarget] = useState<"bulk" | "staff" | null>(null);
  const [checkoutError, setCheckoutError] = useState<string>("");
  const [tierDialogProduct, setTierDialogProduct] = useState<any | null>(null);
  const [detailDialogProduct, setDetailDialogProduct] = useState<any | null>(null);
  const { t } = useTranslation();

  const { tenantId: paramTenantId } = useParams<{ tenantId: string }>();
  const { tenantSlug } = useSubdomain();
  const { data: subdomainTenant } = useTenantBySlug(tenantSlug);
  const tenantId = paramTenantId || subdomainTenant?.id || profile?.tenant_id;

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

  const { data: userBudget } = useQuery({
    queryKey: ["user-budget", profile?.id, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_budgets")
        .select("*")
        .eq("user_id", profile!.id)
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && !!tenantId,
  });

  const { data: shippingConfig } = useQuery({
    queryKey: ["store-shipping", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_shipping").select("*").eq("tenant_id", tenantId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

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

  // Fetch price tiers for all products
  const { data: allPriceTiers } = useQuery({
    queryKey: ["store-price-tiers", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_price_tiers")
        .select("product_id, min_qty, unit_price")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const priceTiersByProduct = useMemo(() => {
    const map = new Map<string, { min_qty: number; unit_price: number }[]>();
    for (const tier of allPriceTiers || []) {
      if (!map.has(tier.product_id)) map.set(tier.product_id, []);
      map.get(tier.product_id)!.push({ min_qty: tier.min_qty, unit_price: Number(tier.unit_price) });
    }
    return map;
  }, [allPriceTiers]);

  const branding = tenant?.tenant_branding as any;
  const primaryColor = branding?.primary_color || "#0ea5e9";
  const accentColor = branding?.accent_color || "#10b981";
  const tenantName = tenant?.name || t("nav.shop");
  const headTitle = branding?.head_title || tenantName;
  const logoUrl = branding?.logo_url;

  const isProductFree = (product: any) => {
    return storeType === "bulk" ? !!product.no_billing_bulk : !!product.no_billing_staff;
  };

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
      return [{ value: "__all__", label: t("storefront.allCategories") }, ...tenantCategories.map((c) => ({ value: c.name, label: c.name }))];
    }
    if (!products) return [{ value: "__all__", label: t("storefront.allCategories") }];
    const cats = [...new Set(products.map((p) => p.category || "general"))];
    return [{ value: "__all__", label: t("storefront.allCategories") }, ...cats.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))];
  }, [products, tenantCategories, t]);

  const filteredProducts = useMemo(() => {
    const filtered = products?.filter((p) => {
      const isActiveForStore = storeType === "bulk" ? p.active_bulk : p.active_staff;
      if (!isActiveForStore) return false;
      const prices = p.product_prices as any[];
      const hasPrice = prices?.some((pr: any) => pr.store_type === storeType);
      const q = search.toLowerCase();
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
      const matchesCategory = activeCategory === "__all__" || (p.category || "general").toLowerCase() === activeCategory.toLowerCase();
      return hasPrice && matchesSearch && matchesCategory;
    }) || [];

    return [...filtered].sort((a, b) => {
      if (sortBy === "price_asc") return getPrice(a) - getPrice(b);
      if (sortBy === "price_desc") return getPrice(b) - getPrice(a);
      return a.name.localeCompare(b.name);
    });
  }, [products, storeType, search, activeCategory, sortBy, t]);

  const getPrice = (product: any) => {
    const prices = product.product_prices as any[];
    const price = prices?.find((pr: any) => pr.store_type === storeType);
    return price ? Number(price.price) : 0;
  };

  const selectedBudget = budgets?.find((b) => b.entity_id === billingEntityId && b.store_type === storeType);
  const budgetRemaining = selectedBudget ? Number(selectedBudget.amount) - Number(selectedBudget.spent) : null;
  const freeProductIds = new Set(products?.filter((p) => isProductFree(p)).map((p) => p.id) || []);
  const effectiveTotal = items.reduce((s, i) => s + (freeProductIds.has(i.productId) ? 0 : i.price * i.qty), 0);
  const hasAnyFreeItems = items.some((i) => freeProductIds.has(i.productId));

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

  const handleSwitchStore = (target: "bulk" | "staff") => {
    if (storeType === target) return;
    if (count > 0) {
      setSwitchStoreTarget(target);
    } else {
      setStoreType(target);
    }
  };

  const confirmSwitchStore = () => {
    if (switchStoreTarget) {
      setStoreType(switchStoreTarget);
      clear();
      setSwitchStoreTarget(null);
    }
  };

  const handleCheckout = async () => {
    if (!billingEntityId || !shippingEntityId) {
      setCheckoutError(t("storefront_extra.selectEntityError"));
      return;
    }
    setCheckoutError("");
    if (!profile || !tenantId) return;
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
      const emailEvent = needsApproval ? "approval_required" : "order_confirmed";
      supabase.functions.invoke("send-order-email", { body: { order_id: order.id, event_type: emailEvent } }).catch((e) => console.warn("Email send failed:", e));
      setConfirmedOrder({ id: order.id, total: orderTotal, itemCount: items.length, needsApproval: !!needsApproval });
      clear(); setCheckoutOpen(false); setCartOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally { setPlacing(false); }
  };

  if (!tenantId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("storefront.noTenant")}</p>
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
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={tenantName} className="h-8 object-contain" />
            ) : (
              <span className="font-semibold text-foreground text-sm">{tenantName}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSwitchStore("bulk")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${storeType === "bulk" ? "text-white" : "text-muted-foreground hover:text-foreground"}`}
              style={storeType === "bulk" ? { backgroundColor: primaryColor } : {}}
            >
              {t("storefront.bulkStore")}
            </button>
            <button
              onClick={() => handleSwitchStore("staff")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${storeType === "staff" ? "text-white" : "text-muted-foreground hover:text-foreground"}`}
              style={storeType === "staff" ? { backgroundColor: primaryColor } : {}}
            >
              {t("storefront.staffStore")}
            </button>
            {storeType === "staff" && userBudget && userBudget.length > 0 && (() => {
              const ub = userBudget[0];
              const remaining = Number(ub.amount) - Number(ub.spent);
              const pct = Number(ub.amount) > 0 ? (Number(ub.spent) / Number(ub.amount)) * 100 : 0;
              return (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-md bg-muted text-xs">
                  <span className="text-muted-foreground">{t("storefront.budgetRemaining")}:</span>
                  <span className={`font-semibold ${remaining <= 0 ? "text-destructive" : pct > 80 ? "text-warning" : "text-success"}`}>
                    {formatCurrency(remaining)}
                  </span>
                </div>
              );
            })()}
            <LanguageSwitcher variant="ghost" />
            {!isTenantView && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative p-2 rounded-md hover:bg-muted transition-colors">
                    {profile?.full_name ? (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ backgroundColor: primaryColor }}>
                        {profile.full_name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                    ) : (
                      <User className="w-5 h-5 text-foreground" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {profile && (
                    <>
                      <DropdownMenuLabel className="font-normal">
                        <p className="text-sm font-medium truncate">{profile.full_name || profile.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => navigate("/shop")}>
                    <Store className="w-4 h-4 mr-2" /> {t("nav.shop")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/shop/wishlist")}>
                    <Heart className="w-4 h-4 mr-2" /> {t("nav.myFavorites")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/shop/orders")}>
                    <ShoppingCart className="w-4 h-4 mr-2" /> {t("nav.myOrders")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/shop/profile")}>
                    <User className="w-4 h-4 mr-2" /> {t("nav.myProfile")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" /> {t("common.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <button className="relative p-2 rounded-md hover:bg-muted transition-colors">
                  <ShoppingCart className="w-5 h-5 text-foreground" />
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: primaryColor }}>
                      {count}
                    </span>
                  )}
                </button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader><SheetTitle>{t("storefront.cart")} ({count})</SheetTitle></SheetHeader>
                <CartPanel
                  items={items} updateQty={updateQty} removeItem={removeItem}
                  total={effectiveTotal} onCheckout={() => setCheckoutOpen(true)}
                  primaryColor={primaryColor} freeProductIds={freeProductIds} t={t}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd, ${accentColor}99)` }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/20 -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/10 translate-y-1/3 -translate-x-1/4" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-12 md:py-16">
          <div className="flex items-center gap-2 mb-4">
            <Badge className="bg-white/20 text-white border-white/30 text-xs gap-1 backdrop-blur-sm">
              <Sparkles className="w-3 h-3" /> {t("storefront.newCollection")}
            </Badge>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight max-w-xl">
            {t("storefront.merchBoutique")}<br />{headTitle}
          </h1>
          <p className="text-white/80 mt-4 max-w-lg text-sm md:text-base leading-relaxed">
            {t("storefront.heroDesc")}
          </p>
        </div>
      </section>

      {/* Store type hint banner (replaces the double selector) */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
          <p className="text-sm font-semibold text-foreground flex items-center justify-center gap-2">
            <Package className="w-4 h-4" style={{ color: primaryColor }} />
            {storeType === "bulk" ? t("storefront.bulkDesc") : t("storefront.staffDesc")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {storeType === "bulk" ? t("storefront.bulkHint") : t("storefront.staffHint")}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-6 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${activeCategory === cat.value ? "text-white border-transparent" : "text-foreground border-border hover:border-foreground/30 bg-card"}`}
              style={activeCategory === cat.value ? { backgroundColor: primaryColor } : {}}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("storefront.searchProduct")} className="pl-9 h-9 text-sm" />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name">{t("storefront.sortNameAZ")}</SelectItem>
              <SelectItem value="price_asc">{t("storefront.sortPriceAsc")}</SelectItem>
              <SelectItem value="price_desc">{t("storefront.sortPriceDesc")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-6 pb-12">
        {!filteredProducts.length ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">{t("storefront.noProducts")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map((product) => {
              const price = getPrice(product);
              const productVariants = (product as any).product_variants as any[] || [];
              const activeVariants = productVariants.filter((v: any) => v.active);
              const hasVariants = activeVariants.length > 0;
              const productTiers = priceTiersByProduct.get(product.id) || [];
              const hasTiers = storeType === "bulk" && productTiers.length > 0;
              const inCart = items.find((i) => i.productId === product.id && !i.variantId);
              const variantItemsInCart = items.filter((i) => i.productId === product.id && i.variantId);
              const totalInCart = (inCart?.qty || 0) + variantItemsInCart.reduce((s, i) => s + i.qty, 0);
              const imageUrl = product.image_url;
              // Best discount % from tiers
              const bestTierSavings = hasTiers && price > 0
                ? Math.max(...productTiers.map(t => Math.round((1 - Number(t.unit_price) / price) * 100)))
                : 0;
              return (
                <div key={product.id} className="group bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden flex flex-col cursor-pointer" onClick={() => setDetailDialogProduct(product)}>
                  <div className="relative aspect-square bg-muted/30 overflow-hidden">
                    <BrandedProductImage
                      imageUrl={imageUrl}
                      logoUrl={logoUrl}
                      logoPlacement={(product as any).logo_placement}
                      alt={product.name}
                      className="w-full h-full"
                      innerClassName="group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex flex-col gap-1">
                      <Badge className="text-[10px] bg-white/90 text-foreground border-0 backdrop-blur-sm shadow-sm capitalize">
                        {product.category || "general"}
                      </Badge>
                      {bestTierSavings > 0 && (
                        <Badge className="text-[10px] border-0 shadow-sm bg-success/90 text-white backdrop-blur-sm">
                          Jusqu'à -{bestTierSavings}%
                        </Badge>
                      )}
                    </div>
                    {storeType === "bulk" && product.min_bulk_qty > 1 ? (
                      <div className="absolute top-3 right-3">
                        <Badge className="text-[10px] text-white border-0 gap-1" style={{ backgroundColor: primaryColor }}>
                          <Package className="w-2.5 h-2.5" /> {t("storefront.minPcs", { qty: product.min_bulk_qty })}
                        </Badge>
                      </div>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform">
                        <Heart className={`w-4 h-4 ${isFavorite(product.id) ? "text-destructive fill-destructive" : "text-muted-foreground"}`} />
                      </button>
                    )}
                    {totalInCart > 0 && (
                      <div className="absolute bottom-3 right-3">
                        <Badge className="text-[10px] text-white border-0 gap-1" style={{ backgroundColor: primaryColor }}>
                          <ShoppingCart className="w-2.5 h-2.5" /> {totalInCart}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">{product.name}</h3>
                    {product.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{product.description}</p>}
                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold" style={{ color: primaryColor }}>
                          {isProductFree(product) ? (
                            <span className="flex items-center gap-1.5"><span className="line-through text-sm text-muted-foreground font-normal">{formatCurrency(price)}</span><span>{t("storefront.free")}</span></span>
                          ) : formatCurrency(price)}
                        </p>
                        {bestTierSavings > 0 && (
                          <p className="text-[11px] font-medium text-success flex items-center gap-1">
                            Économisez jusqu'à {bestTierSavings}%
                          </p>
                        )}
                      </div>
                      <Button size="sm" className="gap-1.5 text-white rounded-lg" style={{ backgroundColor: primaryColor }} onClick={(e) => { e.stopPropagation(); setDetailDialogProduct(product); }}>
                        <Plus className="w-3.5 h-3.5" /> {totalInCart > 0 ? t("storefront.modify") : t("storefront.addToCart")}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-auto">
          <DialogHeader><DialogTitle>{t("storefront.finalizeOrder")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <label className="text-sm font-semibold flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-primary" /> {t("storefront.billing")}</label>
              <div className="space-y-2">
                <Select value={billingEntityId} onValueChange={(v) => { setBillingEntityId(v); setBillingAddressId(""); setCheckoutError(""); }}>
                  <SelectTrigger className={!billingEntityId && checkoutError ? "border-destructive" : ""}><SelectValue placeholder={t("storefront.selectBillingEntity")} /></SelectTrigger>
                  <SelectContent>
                    {entities?.map((e) => (<SelectItem key={e.id} value={e.id}>{e.name} ({e.code})</SelectItem>))}
                  </SelectContent>
                </Select>
                {billingEntityId && billingAddresses && billingAddresses.length > 0 && (
                  <Select value={billingAddressId} onValueChange={setBillingAddressId}>
                    <SelectTrigger className="text-xs"><MapPin className="w-3 h-3 mr-1 shrink-0 text-muted-foreground" /><SelectValue placeholder={t("storefront.billingAddress")} /></SelectTrigger>
                    <SelectContent>
                      {billingAddresses.map((a) => (<SelectItem key={a.id} value={a.id} className="text-xs">{a.label} — {a.address_line1}, {a.postal_code} {a.city}</SelectItem>))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <label className="text-sm font-semibold flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-primary" /> {t("storefront.shipping")}</label>
              <div className="space-y-2">
                <Select value={shippingEntityId} onValueChange={(v) => { setShippingEntityId(v); setShippingAddressId(""); setCheckoutError(""); }}>
                  <SelectTrigger className={!shippingEntityId && checkoutError ? "border-destructive" : ""}><SelectValue placeholder={t("storefront.selectShippingEntity")} /></SelectTrigger>
                  <SelectContent>
                    {entities?.map((e) => (<SelectItem key={e.id} value={e.id}>{e.name} ({e.code})</SelectItem>))}
                  </SelectContent>
                </Select>
                {shippingEntityId && shippingAddresses && shippingAddresses.length > 0 && (
                  <Select value={shippingAddressId} onValueChange={setShippingAddressId}>
                    <SelectTrigger className="text-xs"><MapPin className="w-3 h-3 mr-1 shrink-0 text-muted-foreground" /><SelectValue placeholder={t("storefront.shippingAddress")} /></SelectTrigger>
                    <SelectContent>
                      {shippingAddresses.map((a) => (<SelectItem key={a.id} value={a.id} className="text-xs">{a.label} — {a.address_line1}, {a.postal_code} {a.city}</SelectItem>))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            {checkoutError && (
              <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {checkoutError}
              </p>
            )}
            {billingEntityId && storeType === "staff" && budgetRemaining !== null && (
              <div className={`rounded-lg border p-3 ${isBudgetExceeded ? "border-warning bg-warning/5" : "border-border bg-muted/30"}`}>
                <div className="flex items-center gap-2">
                  {isBudgetExceeded ? <AlertTriangle className="w-4 h-4 text-warning" /> : <CheckCircle className="w-4 h-4 text-success" />}
                  <span className="text-sm font-medium">{t("storefront.budgetRemaining")}: {formatCurrency(budgetRemaining)}</span>
                </div>
                {isBudgetExceeded && <p className="text-xs text-warning mt-1">{t("storefront.budgetExceeded", { total: formatCurrency(orderTotal) })}</p>}
              </div>
            )}
            {needsApproval && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                <p className="text-xs text-warning">{isBudgetExceeded ? t("storefront.budgetExceededShort") : t("storefront.entityRequiresApproval")}</p>
              </div>
            )}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-sm font-medium">{t("common.summary")}</p>
              {hasAnyFreeItems && (
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                  <CheckCircle className="w-3.5 h-3.5" /> {t("storefront.freeProductsNote")}
                </div>
              )}
              {items.map((item) => {
                const isFree = freeProductIds.has(item.productId);
                return (
                  <div key={`${item.productId}__${item.variantId || ''}`} className="flex justify-between text-xs text-muted-foreground">
                    <span>{item.name}{item.variantLabel ? ` (${item.variantLabel})` : ""} × {item.qty}</span>
                    <span>{isFree ? <><span className="line-through">{formatCurrency(item.price * item.qty)}</span> <span className="text-primary font-medium">{t("common.free")}</span></> : formatCurrency(item.price * item.qty)}</span>
                  </div>
                );
              })}
              {shippingFee > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {t("storefront.shippingFee")}</span>
                  <span>{formatCurrency(shippingFee)}</span>
                </div>
              )}
              {shippingFee === 0 && shippingConfig && shippingConfig.mode !== "none" && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {t("storefront.shippingFee")}</span>
                  <span className="text-primary font-medium">{t("common.free")}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
                <span>{t("common.total")}</span>
                <span>{formatCurrency(orderTotal)}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleCheckout} disabled={placing} className="text-white" style={{ backgroundColor: primaryColor }}>
              {placing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
              {needsApproval ? t("storefront.submitForApproval") : t("common.confirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {variantMatrixProduct && (
        <VariantMatrixDialog
          open={!!variantMatrixProduct}
          onOpenChange={(v) => { if (!v) setVariantMatrixProduct(null); }}
          product={variantMatrixProduct}
          variants={((variantMatrixProduct as any).product_variants as any[]) || []}
          basePrice={getPrice(variantMatrixProduct)}
          primaryColor={primaryColor}
          storeType={storeType}
          existingSelections={items.filter((i) => i.productId === variantMatrixProduct.id && i.variantId).map((i) => ({ variantId: i.variantId!, qty: i.qty }))}
          onConfirm={(selections) => {
            const existingVariantItems = items.filter((i) => i.productId === variantMatrixProduct.id && i.variantId);
            for (const item of existingVariantItems) { removeItem(item.productId, item.variantId); }
            for (const sel of selections) {
              addItem({ productId: variantMatrixProduct.id, variantId: sel.variantId, variantLabel: sel.variantValue, name: variantMatrixProduct.name, sku: variantMatrixProduct.sku, price: getPrice(variantMatrixProduct), storeType, imageUrl: variantMatrixProduct.image_url || undefined }, sel.qty);
            }
            setCartOpen(true);
          }}
        />
      )}

      {tierDialogProduct && (
        <BulkPriceTierDialog
          open={!!tierDialogProduct}
          onOpenChange={(v) => { if (!v) setTierDialogProduct(null); }}
          product={tierDialogProduct}
          basePrice={getPrice(tierDialogProduct)}
          tiers={priceTiersByProduct.get(tierDialogProduct.id) || []}
          primaryColor={primaryColor}
          existingQty={items.find((i) => i.productId === tierDialogProduct.id && !i.variantId)?.qty}
          onConfirm={(qty, unitPrice) => {
            const existing = items.find((i) => i.productId === tierDialogProduct.id && !i.variantId);
            if (existing) {
              removeItem(tierDialogProduct.id);
            }
            addItem({
              productId: tierDialogProduct.id,
              name: tierDialogProduct.name,
              sku: tierDialogProduct.sku,
              price: unitPrice,
              storeType,
              imageUrl: tierDialogProduct.image_url || undefined,
            }, qty);
            setCartOpen(true);
          }}
        />
      )}

      {/* Product Detail Dialog */}
      {detailDialogProduct && (
        <ProductDetailDialog
          open={!!detailDialogProduct}
          onOpenChange={(v) => { if (!v) setDetailDialogProduct(null); }}
          product={detailDialogProduct}
          price={getPrice(detailDialogProduct)}
          storeType={storeType}
          primaryColor={primaryColor}
          logoUrl={logoUrl}
          tiers={priceTiersByProduct.get(detailDialogProduct.id) || []}
          isFree={isProductFree(detailDialogProduct)}
          inCartQty={items.find((i) => i.productId === detailDialogProduct.id && !i.variantId)?.qty || 0}
          isFavorite={isFavorite(detailDialogProduct.id)}
          onToggleFavorite={() => toggleFavorite(detailDialogProduct.id)}
          hasVariants={((detailDialogProduct.product_variants as any[]) || []).filter((v: any) => v.active).length > 0}
          onOpenVariantMatrix={() => { setDetailDialogProduct(null); setVariantMatrixProduct(detailDialogProduct); }}
          onAddToCart={(qty, unitPrice) => {
            addItem({
              productId: detailDialogProduct.id,
              name: detailDialogProduct.name,
              sku: detailDialogProduct.sku,
              price: unitPrice,
              storeType,
              imageUrl: detailDialogProduct.image_url || undefined,
            }, qty);
            setCartOpen(true);
          }}
          onUpdateQty={(qty) => {
            const tiers = priceTiersByProduct.get(detailDialogProduct.id) || [];
            const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);
            let unitPrice = getPrice(detailDialogProduct);
            for (const tier of sorted) {
              if (qty >= tier.min_qty) unitPrice = Number(tier.unit_price);
            }
            removeItem(detailDialogProduct.id);
            addItem({
              productId: detailDialogProduct.id,
              name: detailDialogProduct.name,
              sku: detailDialogProduct.sku,
              price: isProductFree(detailDialogProduct) ? 0 : unitPrice,
              storeType,
              imageUrl: detailDialogProduct.image_url || undefined,
            }, qty);
            setCartOpen(true);
          }}
        />
      )}

      <Dialog open={!!confirmedOrder} onOpenChange={(v) => { if (!v) setConfirmedOrder(null); }}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {confirmedOrder?.needsApproval ? t("storefront.orderSubmitted") : t("storefront.orderConfirmed")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("storefront.orderNumber")}: <span className="font-mono font-semibold">{confirmedOrder?.id?.slice(0, 8)}</span>
            </p>
            <div className="rounded-lg border border-border p-4 w-full text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("common.total")}</span>
                <span className="font-bold">{formatCurrency(confirmedOrder?.total || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("storefront.itemCount")}</span>
                <span>{confirmedOrder?.itemCount}</span>
              </div>
            </div>
            {confirmedOrder?.needsApproval && (
              <p className="text-xs text-warning flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {t("storefront.pendingApprovalNote")}
              </p>
            )}
            <div className="flex gap-2 w-full pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setConfirmedOrder(null); navigate("/shop/orders"); }}>
                {t("nav.myOrders")}
              </Button>
              <Button className="flex-1" style={{ backgroundColor: primaryColor }} onClick={() => setConfirmedOrder(null)}>
                {t("storefront.continueShopping")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog for store switch confirmation */}
      <AlertDialog open={!!switchStoreTarget} onOpenChange={(v) => { if (!v) setSwitchStoreTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("storefront_extra.switchStoreTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("storefront_extra.switchStoreDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("storefront_extra.switchStoreCancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitchStore}>{t("storefront_extra.switchStoreConfirmBtn")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function CartPanel({ items, updateQty, removeItem, total, onCheckout, primaryColor, freeProductIds = new Set(), t }: { items: any[]; updateQty: (id: string, qty: number, variantId?: string) => void; removeItem: (id: string, variantId?: string) => void; total: number; onCheckout: () => void; primaryColor: string; freeProductIds?: Set<string>; t: any; }) {
  const hasAnyFree = items.some((i) => freeProductIds.has(i.productId));
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto py-4 space-y-3">
        {hasAnyFree && items.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium p-2 rounded-md bg-primary/5 border border-primary/20">
            <CheckCircle className="w-3.5 h-3.5" /> {t("storefront.freeProductsNote")}
          </div>
        )}
        {items.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t("storefront.emptyCart")}</p>
          </div>
        ) : (
          items.map((item: any) => {
            const isFree = freeProductIds.has(item.productId);
            return (
            <div key={`${item.productId}__${item.variantId || ''}`} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              <div className="w-12 h-12 rounded-md bg-muted/50 overflow-hidden flex items-center justify-center shrink-0">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-5 h-5 text-muted-foreground/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                {item.variantLabel && <p className="text-[11px] text-primary font-medium truncate">{item.variantLabel}</p>}
                <p className="text-xs text-muted-foreground">
                  {isFree ? (<><span className="line-through">{formatCurrency(item.price)}</span> <span className="text-primary font-medium">{t("common.free")}</span> × {item.qty}</>) : (<>{formatCurrency(item.price)} × {item.qty}</>)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item.productId, item.qty - 1, item.variantId)} className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted"><Minus className="w-3 h-3" /></button>
                <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
                <button onClick={() => updateQty(item.productId, item.qty + 1, item.variantId)} className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted"><Plus className="w-3 h-3" /></button>
                <button onClick={() => removeItem(item.productId, item.variantId)} className="w-7 h-7 rounded flex items-center justify-center text-destructive hover:bg-destructive/10"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
            );
          })
        )}
      </div>
      {items.length > 0 && (
        <div className="border-t border-border pt-4 pb-6 space-y-3">
          <div className="flex justify-between"><span className="text-sm text-muted-foreground">{t("common.total")}</span><span className="text-xl font-bold text-foreground">{formatCurrency(total)}</span></div>
          <Button className="w-full text-white" style={{ backgroundColor: primaryColor }} onClick={onCheckout}>{t("storefront.checkout")}</Button>
        </div>
      )}
    </div>
  );
}

export default Storefront;
