import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TopBar from "@/components/TopBar";
import { StatusBadge, SectionHeader } from "@/components/DashboardWidgets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Loader2, Plus, Pencil, Save, X, MoreHorizontal, Trash2,
  Building2, ShoppingCart, Wallet, Package, Palette
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";

const TenantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Tenant + branding
  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, tenant_branding(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Entities
  const { data: entities } = useQuery({
    queryKey: ["entities", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("*").eq("tenant_id", id!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Products + prices
  const { data: products } = useQuery({
    queryKey: ["products", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_prices(*)")
        .eq("tenant_id", id!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Budgets
  const { data: budgets } = useQuery({
    queryKey: ["budgets", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*, entities(name)")
        .eq("tenant_id", id!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Orders
  const { data: orders } = useQuery({
    queryKey: ["orders", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, profiles:created_by(full_name, email), order_items(qty)")
        .eq("tenant_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const branding = tenant?.tenant_branding as any;
  const color = branding?.primary_color || "#0ea5e9";

  if (isLoading) {
    return (
      <>
        <TopBar title="Tenant" subtitle="Loading..." />
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </>
    );
  }

  if (!tenant) {
    return (
      <>
        <TopBar title="Tenant" subtitle="Not found" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Tenant introuvable</p>
            <Button onClick={() => navigate("/tenants")}>Retour</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar
        title={tenant.name}
        subtitle={`/${tenant.slug} · Gestion de la boutique`}
      />
      <div className="p-6 space-y-6 overflow-auto">
        {/* Header card */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/tenants")} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold shrink-0" style={{ backgroundColor: color + "20", color }}>
              {tenant.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{tenant.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={tenant.status} />
                {branding?.head_title && <span className="text-xs text-muted-foreground">· {branding.head_title}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full border-2 border-border" style={{ backgroundColor: branding?.primary_color || "#0ea5e9" }} title="Primary" />
            <div className="w-6 h-6 rounded-full border-2 border-border" style={{ backgroundColor: branding?.accent_color || "#10b981" }} title="Accent" />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4 text-center">
            <Building2 className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{entities?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Entités</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4 text-center">
            <Package className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{products?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Produits</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4 text-center">
            <ShoppingCart className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{orders?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Commandes</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4 text-center">
            <Wallet className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{formatCurrency(budgets?.reduce((s, b) => s + Number(b.amount), 0) || 0)}</p>
            <p className="text-xs text-muted-foreground">Budget total</p>
          </div>
        </div>

        {/* Tabbed content */}
        <Tabs defaultValue="entities" className="w-full">
          <TabsList className="bg-secondary">
            <TabsTrigger value="entities" className="text-xs gap-1"><Building2 className="w-3.5 h-3.5" /> Entités ({entities?.length || 0})</TabsTrigger>
            <TabsTrigger value="products" className="text-xs gap-1"><Package className="w-3.5 h-3.5" /> Produits ({products?.length || 0})</TabsTrigger>
            <TabsTrigger value="budgets" className="text-xs gap-1"><Wallet className="w-3.5 h-3.5" /> Budgets ({budgets?.length || 0})</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs gap-1"><ShoppingCart className="w-3.5 h-3.5" /> Commandes ({orders?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="entities" className="mt-4">
            <EntitiesTab tenantId={id!} entities={entities || []} />
          </TabsContent>
          <TabsContent value="products" className="mt-4">
            <ProductsTab tenantId={id!} products={products || []} />
          </TabsContent>
          <TabsContent value="budgets" className="mt-4">
            <BudgetsTab budgets={budgets || []} />
          </TabsContent>
          <TabsContent value="orders" className="mt-4">
            <OrdersTab orders={orders || []} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

/* ─── Entities Tab ─── */
function EntitiesTab({ tenantId, entities }: { tenantId: string; entities: any[] }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);

  const addEntity = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("entities").insert({
        tenant_id: tenantId,
        name: name.trim(),
        code: code.trim().toUpperCase() || name.trim().toUpperCase().replace(/\s+/g, "-").slice(0, 10),
        requires_approval: requiresApproval,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entité créée");
      qc.invalidateQueries({ queryKey: ["entities", tenantId] });
      setShowAdd(false);
      setName("");
      setCode("");
      setRequiresApproval(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleApproval = useMutation({
    mutationFn: async ({ entityId, current }: { entityId: string; current: boolean }) => {
      const { error } = await supabase.from("entities").update({ requires_approval: !current }).eq("id", entityId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entities", tenantId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="bg-card rounded-lg border border-border shadow-card">
      <div className="p-5 border-b border-border">
        <SectionHeader
          title="Entités"
          action={<Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Ajouter</Button>}
        />
      </div>
      {!entities.length ? (
        <p className="p-8 text-center text-sm text-muted-foreground">Aucune entité</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Nom</TableHead>
              <TableHead className="text-xs">Code</TableHead>
              <TableHead className="text-xs">Approbation requise</TableHead>
              <TableHead className="text-xs">Créée le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entities.map((e) => (
              <TableRow key={e.id} className="text-sm">
                <TableCell className="font-medium">{e.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{e.code}</TableCell>
                <TableCell>
                  <Switch
                    checked={e.requires_approval}
                    onCheckedChange={() => toggleApproval.mutate({ entityId: e.id, current: e.requires_approval })}
                  />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nouvelle entité</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Siège principal" maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))} placeholder="Auto-généré si vide" maxLength={10} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} />
              <Label>Approbation requise pour les commandes bulk</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button onClick={() => addEntity.mutate()} disabled={!name.trim() || addEntity.isPending}>
              {addEntity.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              Créer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Products Tab ─── */
function ProductsTab({ tenantId, products }: { tenantId: string; products: any[] }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [bulkPrice, setBulkPrice] = useState("");
  const [staffPrice, setStaffPrice] = useState("");

  const addProduct = useMutation({
    mutationFn: async () => {
      const { data: product, error } = await supabase
        .from("products")
        .insert({ tenant_id: tenantId, name: name.trim(), sku: sku.trim().toUpperCase() })
        .select()
        .single();
      if (error) throw error;

      const prices = [];
      if (bulkPrice) prices.push({ tenant_id: tenantId, product_id: product.id, store_type: "bulk" as const, price: parseFloat(bulkPrice) });
      if (staffPrice) prices.push({ tenant_id: tenantId, product_id: product.id, store_type: "staff" as const, price: parseFloat(staffPrice) });
      if (prices.length) {
        const { error: pErr } = await supabase.from("product_prices").insert(prices);
        if (pErr) throw pErr;
      }
    },
    onSuccess: () => {
      toast.success("Produit ajouté");
      qc.invalidateQueries({ queryKey: ["products", tenantId] });
      setShowAdd(false);
      setName("");
      setSku("");
      setBulkPrice("");
      setStaffPrice("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ productId, current }: { productId: string; current: boolean }) => {
      const { error } = await supabase.from("products").update({ active: !current }).eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products", tenantId] }),
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="bg-card rounded-lg border border-border shadow-card">
      <div className="p-5 border-b border-border">
        <SectionHeader
          title="Catalogue produits"
          action={<Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Ajouter</Button>}
        />
      </div>
      {!products.length ? (
        <p className="p-8 text-center text-sm text-muted-foreground">Aucun produit</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Produit</TableHead>
              <TableHead className="text-xs">SKU</TableHead>
              <TableHead className="text-xs">Prix Bulk</TableHead>
              <TableHead className="text-xs">Prix Staff</TableHead>
              <TableHead className="text-xs">Statut</TableHead>
              <TableHead className="text-xs w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const prices = p.product_prices as any[];
              const bulk = prices?.find((pr: any) => pr.store_type === "bulk");
              const staff = prices?.find((pr: any) => pr.store_type === "staff");
              return (
                <TableRow key={p.id} className="text-sm">
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                  <TableCell>{bulk ? formatCurrency(Number(bulk.price)) : "—"}</TableCell>
                  <TableCell>{staff ? formatCurrency(Number(staff.price)) : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={p.active ? "bg-success/10 text-success border-transparent" : "bg-muted text-muted-foreground border-transparent"}>
                      {p.active ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => toggleActive.mutate({ productId: p.id, current: p.active })}>
                      {p.active ? <X className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nouveau produit</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Chaise ergonomique" maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label>SKU *</Label>
              <Input value={sku} onChange={(e) => setSku(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))} placeholder="CHAIR-ERG-01" maxLength={50} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prix Bulk (€)</Label>
                <Input type="number" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} placeholder="0.00" min="0" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label>Prix Staff (€)</Label>
                <Input type="number" value={staffPrice} onChange={(e) => setStaffPrice(e.target.value)} placeholder="0.00" min="0" step="0.01" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button onClick={() => addProduct.mutate()} disabled={!name.trim() || !sku.trim() || addProduct.isPending}>
              {addProduct.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              Créer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Budgets Tab ─── */
function BudgetsTab({ budgets }: { budgets: any[] }) {
  return (
    <div className="bg-card rounded-lg border border-border shadow-card">
      <div className="p-5 border-b border-border">
        <SectionHeader title="Budgets" />
      </div>
      {!budgets.length ? (
        <p className="p-8 text-center text-sm text-muted-foreground">Aucun budget</p>
      ) : (
        <div className="divide-y divide-border">
          {budgets.map((b) => {
            const amount = Number(b.amount);
            const spent = Number(b.spent);
            const pct = amount > 0 ? Math.round((spent / amount) * 100) : 0;
            const isWarning = pct >= 80;
            const isBlocked = pct > 100;
            return (
              <div key={b.id} className={`p-5 ${isBlocked ? "bg-destructive/5" : ""}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{(b.entities as any)?.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{b.store_type} · {b.period}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${isBlocked ? "text-destructive" : isWarning ? "text-warning" : "text-foreground"}`}>
                      {formatCurrency(spent)}
                    </p>
                    <p className="text-xs text-muted-foreground">sur {formatCurrency(amount)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={Math.min(pct, 100)} className={`h-2 flex-1 ${isBlocked ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-warning" : ""}`} />
                  <span className={`text-xs font-bold min-w-[40px] text-right ${isBlocked ? "text-destructive" : isWarning ? "text-warning" : "text-muted-foreground"}`}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Orders Tab ─── */
function OrdersTab({ orders }: { orders: any[] }) {
  return (
    <div className="bg-card rounded-lg border border-border shadow-card">
      <div className="p-5 border-b border-border">
        <SectionHeader title="Commandes" />
      </div>
      {!orders?.length ? (
        <p className="p-8 text-center text-sm text-muted-foreground">Aucune commande</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">ID</TableHead>
              <TableHead className="text-xs">Utilisateur</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Total</TableHead>
              <TableHead className="text-xs">Statut</TableHead>
              <TableHead className="text-xs">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => {
              const profile = o.profiles as any;
              return (
                <TableRow key={o.id} className="text-sm">
                  <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium">{profile?.full_name || profile?.email || "—"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${o.store_type === "bulk" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                      {o.store_type}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(Number(o.total))}</TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default TenantDetail;
