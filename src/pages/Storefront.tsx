import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShoppingCart, Plus, Minus, Trash2, Loader2, Package, CheckCircle,
  AlertTriangle, Search, Store, Users, Sparkles
} from "lucide-react";
import { toast } from "sonner";

const Storefront = () => {
  const { profile } = useAuth();
  const { items, addItem, removeItem, updateQty, clear, total, count } = useCart();
  const [storeType, setStoreType] = useState<"staff" | "bulk">("bulk");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [entityId, setEntityId] = useState<string>("");

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
        .select("*, product_prices(*)")
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

  const branding = tenant?.tenant_branding as any;
  const primaryColor = branding?.primary_color || "#0ea5e9";
  const accentColor = branding?.accent_color || "#10b981";
  const tenantName = tenant?.name || "Boutique";
  const headTitle = branding?.head_title || tenantName;
  const logoUrl = branding?.logo_url;

  // No product billing: products are free, only shipping is charged
  const noProductBilling = storeType === "bulk"
    ? !!tenant?.no_product_billing_bulk
    : !!tenant?.no_product_billing_staff;

  // Categories from products
  const categories = useMemo(() => {
    if (!products) return ["Tous"];
    const cats = [...new Set(products.map((p) => p.category || "general"))];
    return ["Tous", ...cats.map((c) => c.charAt(0).toUpperCase() + c.slice(1))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products?.filter((p) => {
      const isActiveForStore = storeType === "bulk" ? p.active_bulk : p.active_staff;
      if (!isActiveForStore) return false;
      const prices = p.product_prices as any[];
      const hasPrice = prices?.some((pr: any) => pr.store_type === storeType);
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === "Tous" || (p.category || "general").toLowerCase() === activeCategory.toLowerCase();
      return hasPrice && matchesSearch && matchesCategory;
    }) || [];
  }, [products, storeType, search, activeCategory]);

  const getPrice = (product: any) => {
    const prices = product.product_prices as any[];
    const price = prices?.find((pr: any) => pr.store_type === storeType);
    return price ? Number(price.price) : 0;
  };

  const selectedBudget = budgets?.find((b) => b.entity_id === entityId && b.store_type === storeType);
  const budgetRemaining = selectedBudget ? Number(selectedBudget.amount) - Number(selectedBudget.spent) : null;
  const effectiveTotal = noProductBilling ? 0 : total;
  const isBudgetExceeded = storeType === "staff" && budgetRemaining !== null && effectiveTotal > budgetRemaining;
  const selectedEntity = entities?.find((e) => e.id === entityId);
  const requiresApproval = storeType === "bulk" && selectedEntity?.requires_approval;

  const handleCheckout = async () => {
    if (!entityId || !profile || !tenantId) return;
    if (isBudgetExceeded) { toast.error("Budget dépassé"); return; }
    setPlacing(true);
    try {
      const { data: order, error: oErr } = await supabase
        .from("orders")
        .insert({
          tenant_id: tenantId, entity_id: entityId, created_by: profile.id,
          store_type: storeType, total: effectiveTotal, status: requiresApproval ? "pending_approval" : "pending",
        })
        .select().single();
      if (oErr) throw oErr;
      const orderItems = items.map((item) => ({
        order_id: order.id, tenant_id: tenantId, product_id: item.productId,
        qty: item.qty, unit_price: noProductBilling ? 0 : item.price,
      }));
      const { error: iErr } = await supabase.from("order_items").insert(orderItems);
      if (iErr) throw iErr;
      toast.success(requiresApproval ? "Commande soumise pour approbation" : "Commande confirmée !");
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
            <Sheet>
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
                  primaryColor={primaryColor} noProductBilling={noProductBilling}
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
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit..." className="pl-9 h-9 text-sm" />
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
              const inCart = items.find((i) => i.productId === product.id);
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
                    {storeType === "bulk" && (
                      <div className="absolute top-3 right-3">
                        <Badge className="text-[10px] text-white border-0 gap-1" style={{ backgroundColor: primaryColor }}>
                          <Package className="w-2.5 h-2.5" /> Min. 10 pcs
                        </Badge>
                      </div>
                    )}
                  </div>
                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">{product.name}</h3>
                    {product.description && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{product.description}</p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <p className="text-lg font-bold" style={{ color: primaryColor }}>
                        {noProductBilling ? (
                          <span className="flex items-center gap-1.5">
                            <span className="line-through text-sm text-muted-foreground font-normal">{formatCurrency(price)}</span>
                            <span>Offert</span>
                          </span>
                        ) : formatCurrency(price)}
                      </p>
                      {inCart ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQty(product.id, inCart.qty - 1)}
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
                      ) : (
                        <Button
                          size="sm"
                          className="gap-1.5 text-white rounded-lg"
                          style={{ backgroundColor: primaryColor }}
                          onClick={() => addItem({ productId: product.id, name: product.name, sku: product.sku, price, storeType })}
                        >
                          <Plus className="w-3.5 h-3.5" /> Ajouter
                        </Button>
                      )}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Finaliser la commande</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Entité *</label>
              <Select value={entityId} onValueChange={setEntityId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une entité" /></SelectTrigger>
                <SelectContent>
                  {entities?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {entityId && storeType === "staff" && budgetRemaining !== null && (
              <div className={`rounded-lg border p-3 ${isBudgetExceeded ? "border-destructive bg-destructive/5" : "border-border bg-muted/30"}`}>
                <div className="flex items-center gap-2">
                  {isBudgetExceeded ? <AlertTriangle className="w-4 h-4 text-destructive" /> : <CheckCircle className="w-4 h-4 text-success" />}
                  <span className="text-sm font-medium">Budget restant : {formatCurrency(budgetRemaining)}</span>
                </div>
                {isBudgetExceeded && <p className="text-xs text-destructive mt-1">Le total ({formatCurrency(effectiveTotal)}) dépasse le budget.</p>}
              </div>
            )}
            {requiresApproval && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                <p className="text-xs text-warning">Cette commande nécessite une approbation.</p>
              </div>
            )}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-sm font-medium">Résumé</p>
              {noProductBilling && (
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Produits offerts — seule la livraison sera facturée
                </div>
              )}
              {items.map((item) => (
                <div key={item.productId} className="flex justify-between text-xs text-muted-foreground">
                  <span>{item.name} × {item.qty}</span>
                  <span>{noProductBilling ? <span className="line-through">{formatCurrency(item.price * item.qty)}</span> : formatCurrency(item.price * item.qty)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
                <span>Total produits</span>
                <span>{noProductBilling ? "Offert" : formatCurrency(effectiveTotal)}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Annuler</Button>
            <Button
              onClick={handleCheckout}
              disabled={!entityId || placing || isBudgetExceeded}
              className="text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {placing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
              {requiresApproval ? "Soumettre" : "Confirmer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─── Cart Panel Component ─── */
function CartPanel({
  items, updateQty, removeItem, total, onCheckout, primaryColor, noProductBilling = false,
}: {
  items: any[]; updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void; total: number;
  onCheckout: () => void; primaryColor: string; noProductBilling?: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto py-4 space-y-3">
        {noProductBilling && items.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium p-2 rounded-md bg-primary/5 border border-primary/20">
            <CheckCircle className="w-3.5 h-3.5" />
            Produits offerts — seule la livraison sera facturée
          </div>
        )}
        {items.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Votre panier est vide</p>
          </div>
        ) : (
          items.map((item: any) => (
            <div key={item.productId} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              <div className="w-12 h-12 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-muted-foreground/30" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {noProductBilling ? (
                    <><span className="line-through">{formatCurrency(item.price)}</span> <span className="text-primary font-medium">Offert</span> × {item.qty}</>
                  ) : (
                    <>{formatCurrency(item.price)} × {item.qty}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item.productId, item.qty - 1)} className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
                <button onClick={() => updateQty(item.productId, item.qty + 1)} className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted">
                  <Plus className="w-3 h-3" />
                </button>
                <button onClick={() => removeItem(item.productId)} className="w-7 h-7 rounded flex items-center justify-center text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {items.length > 0 && (
        <div className="border-t border-border pt-4 pb-6 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total produits</span>
            <span className="text-xl font-bold text-foreground">{noProductBilling ? "Offert" : formatCurrency(total)}</span>
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
