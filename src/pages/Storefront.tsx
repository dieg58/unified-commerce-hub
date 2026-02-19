import { useState } from "react";
import { useParams } from "react-router-dom";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useCart, CartItem } from "@/hooks/useCart";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Plus, Minus, Trash2, Loader2, Package, CheckCircle, AlertTriangle, Search } from "lucide-react";
import { toast } from "sonner";

const Storefront = () => {
  const { profile } = useAuth();
  const { items, addItem, removeItem, updateQty, clear, total, count } = useCart();
  const [storeType, setStoreType] = useState<"staff" | "bulk">("staff");
  const [search, setSearch] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [entityId, setEntityId] = useState<string>("");

  const { tenantId: paramTenantId } = useParams<{ tenantId: string }>();
  const tenantId = paramTenantId || profile?.tenant_id;

  // Fetch products with prices
  const { data: products, isLoading } = useQuery({
    queryKey: ["store-products", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_prices(*)")
        .eq("tenant_id", tenantId!)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch entities for checkout
  const { data: entities } = useQuery({
    queryKey: ["store-entities", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch budgets to check limits
  const { data: budgets } = useQuery({
    queryKey: ["store-budgets", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const filteredProducts = products?.filter((p) => {
    const prices = p.product_prices as any[];
    const hasPrice = prices?.some((pr: any) => pr.store_type === storeType);
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    return hasPrice && matchesSearch;
  }) || [];

  const getPrice = (product: any) => {
    const prices = product.product_prices as any[];
    const price = prices?.find((pr: any) => pr.store_type === storeType);
    return price ? Number(price.price) : 0;
  };

  const selectedBudget = budgets?.find((b) => b.entity_id === entityId && b.store_type === storeType);
  const budgetRemaining = selectedBudget ? Number(selectedBudget.amount) - Number(selectedBudget.spent) : null;
  const isBudgetExceeded = storeType === "staff" && budgetRemaining !== null && total > budgetRemaining;

  const selectedEntity = entities?.find((e) => e.id === entityId);
  const requiresApproval = storeType === "bulk" && selectedEntity?.requires_approval;

  const handleCheckout = async () => {
    if (!entityId || !profile || !tenantId) return;
    if (isBudgetExceeded) {
      toast.error("Budget dépassé — commande impossible");
      return;
    }
    setPlacing(true);
    try {
      const orderStatus = requiresApproval ? "pending_approval" : "pending";
      const { data: order, error: oErr } = await supabase
        .from("orders")
        .insert({
          tenant_id: tenantId,
          entity_id: entityId,
          created_by: profile.id,
          store_type: storeType,
          total,
          status: orderStatus,
        })
        .select()
        .single();
      if (oErr) throw oErr;

      const orderItems = items.map((item) => ({
        order_id: order.id,
        tenant_id: tenantId,
        product_id: item.productId,
        qty: item.qty,
        unit_price: item.price,
      }));
      const { error: iErr } = await supabase.from("order_items").insert(orderItems);
      if (iErr) throw iErr;

      toast.success(requiresApproval
        ? "Commande soumise — en attente d'approbation"
        : "Commande passée avec succès !"
      );
      clear();
      setCheckoutOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la commande");
    } finally {
      setPlacing(false);
    }
  };

  if (!tenantId) {
    return (
      <>
        <TopBar title="Boutique" subtitle="Aucun tenant assigné" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Vous n'êtes assigné à aucune organisation.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Boutique" subtitle="Parcourez le catalogue et passez commande" />
      <div className="p-6 space-y-6 overflow-auto">
        {/* Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          <Tabs value={storeType} onValueChange={(v) => { setStoreType(v as any); clear(); }} className="w-auto">
            <TabsList className="bg-secondary">
              <TabsTrigger value="staff" className="text-xs">Staff Store</TabsTrigger>
              <TabsTrigger value="bulk" className="text-xs">Bulk Store</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit..."
              className="pl-9"
            />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2 relative">
                <ShoppingCart className="w-4 h-4" />
                Panier
                {count > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                    {count}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Panier ({count} articles)</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-auto py-4 space-y-3">
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Votre panier est vide</p>
                  ) : (
                    items.map((item) => (
                      <div key={item.productId} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} × {item.qty}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => updateQty(item.productId, item.qty - 1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">{item.qty}</span>
                          <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => updateQty(item.productId, item.qty + 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeItem(item.productId)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {items.length > 0 && (
                  <div className="border-t border-border pt-4 pb-6 space-y-3">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Total</span>
                      <span className="text-lg font-bold">{formatCurrency(total)}</span>
                    </div>
                    <Button className="w-full" onClick={() => setCheckoutOpen(true)}>
                      Passer commande
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Product grid */}
        {isLoading ? (
          <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : !filteredProducts.length ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun produit disponible</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => {
              const price = getPrice(product);
              const inCart = items.find((i) => i.productId === product.id);
              return (
                <div key={product.id} className="bg-card rounded-lg border border-border shadow-card hover:shadow-card-hover transition-shadow p-4 flex flex-col">
                  <div className="w-full h-32 rounded-md bg-muted/50 flex items-center justify-center mb-3">
                    <Package className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1 truncate">{product.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2 font-mono">{product.sku}</p>
                  <div className="mt-auto flex items-center justify-between">
                    <p className="text-lg font-bold text-primary">{formatCurrency(price)}</p>
                    {inCart ? (
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => updateQty(product.id, inCart.qty - 1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-medium w-6 text-center">{inCart.qty}</span>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => updateQty(product.id, inCart.qty + 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" className="gap-1" onClick={() => addItem({ productId: product.id, name: product.name, sku: product.sku, price, storeType })}>
                        <Plus className="w-4 h-4" /> Ajouter
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Checkout dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finaliser la commande</DialogTitle>
          </DialogHeader>
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
                  <span className="text-sm font-medium">
                    Budget restant : {formatCurrency(budgetRemaining)}
                  </span>
                </div>
                {isBudgetExceeded && (
                  <p className="text-xs text-destructive mt-1">Le total ({formatCurrency(total)}) dépasse le budget disponible.</p>
                )}
              </div>
            )}

            {requiresApproval && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                <p className="text-xs text-warning">Cette commande bulk nécessite une approbation avant traitement.</p>
              </div>
            )}

            {/* Summary */}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-sm font-medium">Résumé</p>
              {items.map((item) => (
                <div key={item.productId} className="flex justify-between text-xs text-muted-foreground">
                  <span>{item.name} × {item.qty}</span>
                  <span>{formatCurrency(item.price * item.qty)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Annuler</Button>
            <Button
              onClick={handleCheckout}
              disabled={!entityId || placing || isBudgetExceeded}
            >
              {placing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
              {requiresApproval ? "Soumettre pour approbation" : "Confirmer la commande"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Storefront;
