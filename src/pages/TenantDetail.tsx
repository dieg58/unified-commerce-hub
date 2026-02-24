import { useState, useCallback } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Loader2, Plus, Pencil, Save, X, MoreHorizontal, Trash2,
  Building2, ShoppingCart, Wallet, Package, Palette, Users, Store,
  CheckCircle, XCircle, Eye, Mail, Send, Clock, UserPlus, Tag, Sparkles, MapPin, Boxes, AlertTriangle,
  ArrowUpCircle, ArrowDownCircle, RefreshCw, History, Truck
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";
import ExportMenu from "@/components/ExportMenu";
import { fmtDate } from "@/lib/export-utils";
import VariantAxisEditor, { variantsToAxesAndCombinations, type VariantAxis, type VariantCombination } from "@/components/VariantAxisEditor";

const TenantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

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

  const { data: entities } = useQuery({
    queryKey: ["entities", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("*").eq("tenant_id", id!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: categories } = useQuery({
    queryKey: ["product-categories", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("tenant_id", id!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: products } = useQuery({
    queryKey: ["products", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_prices(*), product_variants(*)")
        .eq("tenant_id", id!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

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

  const { data: orders } = useQuery({
    queryKey: ["orders", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, profiles:profiles!orders_created_by_profiles_fkey(full_name, email), order_items(qty, unit_price, products(name))")
        .eq("tenant_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: users } = useQuery({
    queryKey: ["boutique-users", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, user_roles!user_roles_user_id_profiles_fkey(role)")
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
        <TopBar title="Boutique" subtitle="Chargement..." />
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </>
    );
  }

  if (!tenant) {
    return (
      <>
        <TopBar title="Boutique" subtitle="Introuvable" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Boutique introuvable</p>
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
        subtitle={`${tenant.slug}.domain.com · Gestion complète`}
      />
      <div className="p-6 space-y-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/tenants")} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Button>
          <div className="flex items-center gap-3 flex-1">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt={tenant.name} className="w-12 h-12 rounded-lg object-cover border border-border" />
            ) : (
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold shrink-0" style={{ backgroundColor: color + "20", color }}>
                {tenant.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-foreground">{tenant.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={tenant.status} />
                <span className="font-mono text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">{tenant.slug}.domain.com</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <div className="w-5 h-5 rounded-full border-2 border-border" style={{ backgroundColor: branding?.primary_color || "#0ea5e9" }} title="Primary" />
              <div className="w-5 h-5 rounded-full border-2 border-border" style={{ backgroundColor: branding?.accent_color || "#10b981" }} title="Accent" />
            </div>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/store/${id}`)}>
              <Store className="w-4 h-4" /> Voir la boutique
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { icon: Building2, value: entities?.length || 0, label: "Entités" },
            { icon: Users, value: users?.length || 0, label: "Utilisateurs" },
            { icon: Package, value: products?.length || 0, label: "Produits" },
            { icon: ShoppingCart, value: orders?.length || 0, label: "Commandes" },
            { icon: Wallet, value: formatCurrency(budgets?.reduce((s, b) => s + Number(b.amount), 0) || 0), label: "Budget total" },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-4 text-center animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              <s.icon className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-secondary flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="users" className="text-xs gap-1"><Users className="w-3.5 h-3.5" /> Utilisateurs</TabsTrigger>
            <TabsTrigger value="entities" className="text-xs gap-1"><Building2 className="w-3.5 h-3.5" /> Entités</TabsTrigger>
            <TabsTrigger value="products" className="text-xs gap-1"><Package className="w-3.5 h-3.5" /> Produits</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs gap-1"><ShoppingCart className="w-3.5 h-3.5" /> Commandes</TabsTrigger>
            <TabsTrigger value="budgets" className="text-xs gap-1"><Wallet className="w-3.5 h-3.5" /> Budgets</TabsTrigger>
            <TabsTrigger value="branding" className="text-xs gap-1"><Palette className="w-3.5 h-3.5" /> Branding</TabsTrigger>
            <TabsTrigger value="shipping" className="text-xs gap-1"><Truck className="w-3.5 h-3.5" /> Livraison</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <UsersTab tenantId={id!} users={users || []} />
          </TabsContent>

          <TabsContent value="entities" className="mt-4">
            <EntitiesTab tenantId={id!} entities={entities || []} />
          </TabsContent>

          <TabsContent value="products" className="mt-4">
            <ProductsTab tenantId={id!} products={products || []} categories={categories || []} />
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            <OrdersTab tenantId={id!} orders={orders || []} entities={entities || []} users={users || []} />
          </TabsContent>

          <TabsContent value="budgets" className="mt-4">
            <BudgetsTab tenantId={id!} budgets={budgets || []} entities={entities || []} />
          </TabsContent>

          <TabsContent value="branding" className="mt-4">
            <BrandingTab tenant={tenant} branding={branding} />
          </TabsContent>

          <TabsContent value="shipping" className="mt-4">
            <ShippingTab tenantId={id!} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

/* ─── Users Tab ─── */
function UsersTab({ tenantId, users }: { tenantId: string; users: any[] }) {
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invName, setInvName] = useState("");
  const [invRole, setInvRole] = useState("employee");

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin", shop_manager: "Responsable Boutique",
    dept_manager: "Responsable Département", employee: "Employé",
  };

  const invitations = useQuery({
    queryKey: ["invitations", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("invitations").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const invite = useMutation({
    mutationFn: async () => {
      // Create invitation record
      const { data: { session } } = await supabase.auth.getSession();
      const { error: invErr } = await supabase.from("invitations").upsert({
        tenant_id: tenantId, email: invEmail.toLowerCase(), full_name: invName,
        role: invRole as any, invited_by: session!.user.id, status: "pending", accepted_at: null,
      }, { onConflict: "tenant_id,email" });
      if (invErr) throw invErr;
      // Call edge function
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email: invEmail, full_name: invName, role: invRole, tenant_id: tenantId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Invitation envoyée !");
      setShowInvite(false); setInvEmail(""); setInvName(""); setInvRole("employee");
      qc.invalidateQueries({ queryKey: ["boutique-users", tenantId] });
      qc.invalidateQueries({ queryKey: ["invitations", tenantId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resendInvite = useMutation({
    mutationFn: async (inv: any) => {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email: inv.email, full_name: inv.full_name, role: inv.role, tenant_id: tenantId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => toast.success("Invitation renvoyée !"),
    onError: (err: any) => toast.error(err.message),
  });

  const removeUser = useMutation({
    mutationFn: async (userId: string) => {
      // Remove roles
      const { error: rErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (rErr) throw rErr;
      // Detach from tenant
      const { error: pErr } = await supabase.from("profiles").update({ tenant_id: null }).eq("id", userId);
      if (pErr) throw pErr;
    },
    onSuccess: () => {
      toast.success("Utilisateur retiré de la boutique");
      qc.invalidateQueries({ queryKey: ["boutique-users", tenantId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      {/* Invite dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader><DialogTitle>Inviter un utilisateur</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label className="text-xs">Nom complet</Label><Input value={invName} onChange={(e) => setInvName(e.target.value)} placeholder="Jean Dupont" /></div>
            <div><Label className="text-xs">Email</Label><Input type="email" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} placeholder="jean@example.com" /></div>
            <div><Label className="text-xs">Rôle</Label>
              <Select value={invRole} onValueChange={setInvRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="shop_manager">Responsable Boutique</SelectItem>
                  <SelectItem value="dept_manager">Responsable Département</SelectItem>
                  <SelectItem value="employee">Employé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full gap-1.5" disabled={!invEmail || invite.isPending} onClick={() => invite.mutate()}>
              {invite.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Envoyer l'invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pending invitations */}
      {invitations.data && invitations.data.filter((i) => i.status === "pending").length > 0 && (
        <div className="bg-card rounded-lg border border-warning/30 shadow-card">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Clock className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-semibold">Invitations en attente ({invitations.data.filter((i) => i.status === "pending").length})</h3>
          </div>
          <div className="divide-y divide-border">
            {invitations.data.filter((i) => i.status === "pending").map((inv) => (
              <div key={inv.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{inv.full_name || inv.email}</p>
                  <p className="text-xs text-muted-foreground">{inv.email} · {roleLabels[inv.role] || inv.role}</p>
                </div>
                <Button size="sm" variant="outline" className="gap-1" disabled={resendInvite.isPending} onClick={() => resendInvite.mutate(inv)}>
                  <Mail className="w-3.5 h-3.5" /> Renvoyer
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="bg-card rounded-lg border border-border shadow-card">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <SectionHeader title={`Utilisateurs (${users.length})`} />
          <Button size="sm" className="gap-1.5" onClick={() => setShowInvite(true)}>
            <UserPlus className="w-4 h-4" /> Inviter
          </Button>
        </div>
        {!users.length ? (
          <div className="p-8 text-center"><Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">Aucun utilisateur</p></div>
        ) : (
          <Table><TableHeader><TableRow>
             <TableHead className="text-xs">Nom</TableHead><TableHead className="text-xs">Email</TableHead>
             <TableHead className="text-xs">Rôle</TableHead><TableHead className="text-xs">Inscrit le</TableHead>
             <TableHead className="text-xs w-10"></TableHead>
           </TableRow></TableHeader><TableBody>
             {users.map((u) => {
               const roles = (u.user_roles as any[]) || [];
               const role = roles[0]?.role || "employee";
               return (<TableRow key={u.id} className="text-sm">
                 <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                 <TableCell className="text-muted-foreground">{u.email}</TableCell>
                 <TableCell><Badge variant="outline" className="text-xs">{roleLabels[role] || role}</Badge></TableCell>
                 <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("fr-FR")}</TableCell>
                 <TableCell>
                   <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                       <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                       <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm("Retirer cet utilisateur de la boutique ?")) removeUser.mutate(u.id); }}>
                         <Trash2 className="w-4 h-4 mr-2" /> Retirer de la boutique
                       </DropdownMenuItem>
                     </DropdownMenuContent>
                   </DropdownMenu>
                 </TableCell>
               </TableRow>);
             })}
           </TableBody></Table>
        )}
      </div>
    </div>
  );
}

/* ─── Entities Tab ─── */
function EntitiesTab({ tenantId, entities }: { tenantId: string; entities: any[] }) {
  return (
    <div className="bg-card rounded-lg border border-border shadow-card">
      <div className="p-5 border-b border-border"><SectionHeader title={`Entités (${entities.length})`} /></div>
      {!entities.length ? (
        <div className="p-8 text-center"><Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">Aucune entité</p></div>
      ) : (
        <Table><TableHeader><TableRow>
          <TableHead className="text-xs">Nom</TableHead><TableHead className="text-xs">Code</TableHead>
          <TableHead className="text-xs">TVA</TableHead><TableHead className="text-xs">Taux TVA</TableHead>
          <TableHead className="text-xs">Approbation</TableHead><TableHead className="text-xs">Paiement</TableHead>
        </TableRow></TableHeader><TableBody>
          {entities.map((e) => (
            <TableRow key={e.id} className="text-sm">
              <TableCell className="font-medium">{e.name}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{e.code}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{e.vat || "—"}</TableCell>
              <TableCell>{e.vat_rate}%</TableCell>
              <TableCell><Badge variant="outline" className={`text-[10px] ${e.requires_approval ? "bg-warning/10 text-warning" : "bg-muted"}`}>{e.requires_approval ? "Requise" : "Non"}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={`text-[10px] ${e.payment_on_order ? "bg-primary/10 text-primary" : "bg-muted"}`}>{e.payment_on_order ? "À la commande" : "Sur facture"}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      )}
    </div>
  );
}

/* ─── Products Tab ─── */
function ProductsTab({ tenantId, products, categories }: { tenantId: string; products: any[]; categories: any[] }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showCatManager, setShowCatManager] = useState(false);
  const [stockHistoryProduct, setStockHistoryProduct] = useState<any>(null);
  const [newCatName, setNewCatName] = useState("");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [skuManual, setSkuManual] = useState(false);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [bulkPrice, setBulkPrice] = useState("");
  const [staffPrice, setStaffPrice] = useState("");
  const [stockType, setStockType] = useState<string>("in_stock");
  const [stockQty, setStockQty] = useState("");
  const [productLocation, setProductLocation] = useState("");
  const [noBillingBulk, setNoBillingBulk] = useState(false);
  const [noBillingStaff, setNoBillingStaff] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState("");
  const [minBulkQty, setMinBulkQty] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Auto-generate SKU from product name
  const generateSku = (productName: string) => {
    const base = productName
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .join("-");
    if (!base) return "";
    const existingSkus = products?.map((p) => p.sku) || [];
    let num = 1;
    while (existingSkus.includes(`${base}-${String(num).padStart(2, "0")}`)) num++;
    return `${base}-${String(num).padStart(2, "0")}`;
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!skuManual && !editingProduct) {
      setSku(generateSku(val));
    }
  };

  // Variants — multi-axis system
  const [variantAxes, setVariantAxes] = useState<VariantAxis[]>([]);
  const [variantCombinations, setVariantCombinations] = useState<VariantCombination[]>([]);

  const openEdit = (p: any) => {
    const prices = p.product_prices as any[];
    const pvariants = p.product_variants as any[];
    const bulk = prices?.find((pr: any) => pr.store_type === "bulk");
    const staff = prices?.find((pr: any) => pr.store_type === "staff");
    setName(p.name);
    setSku(p.sku);
    setSkuManual(true);
    setCategory(p.category || "");
    setDescription(p.description || "");
    setBulkPrice(bulk ? String(bulk.price) : "");
    setStaffPrice(staff ? String(staff.price) : "");
    setStockType(p.stock_type || "in_stock");
    setStockQty(String(p.stock_qty || 0));
    setProductLocation(p.location || "");
    setNoBillingBulk(!!p.no_billing_bulk);
    setNoBillingStaff(!!p.no_billing_staff);
    setLowStockThreshold(String(p.low_stock_threshold || 0));
    setMinBulkQty(String(p.min_bulk_qty || 1));
    setImageFile(null);
    const { axes, combinations } = variantsToAxesAndCombinations(pvariants || []);
    setVariantAxes(axes);
    setVariantCombinations(combinations);
    setEditingProduct(p);
  };

  const resetForm = () => {
    setName(""); setSku(""); setSkuManual(false); setCategory(""); setDescription("");
    setBulkPrice(""); setStaffPrice(""); setImageFile(null);
    setStockType("in_stock"); setStockQty(""); setProductLocation("");
    setNoBillingBulk(false); setNoBillingStaff(false); setLowStockThreshold(""); setMinBulkQty("");
    setVariantAxes([]); setVariantCombinations([]); setEditingProduct(null);
  };

  const uploadImage = async (productId: string, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${tenantId}/${productId}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
    return publicUrl;
  };

  const addProduct = useMutation({
    mutationFn: async () => {
      setUploading(true);
      const { data: product, error } = await supabase
        .from("products")
        .insert({
          tenant_id: tenantId,
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          category: category.trim().toLowerCase(),
          description: description.trim() || null,
          stock_type: stockType as any,
          stock_qty: parseInt(stockQty) || 0,
          location: productLocation.trim() || null,
          no_billing_bulk: noBillingBulk,
          no_billing_staff: noBillingStaff,
          low_stock_threshold: parseInt(lowStockThreshold) || 0,
          min_bulk_qty: Math.max(1, parseInt(minBulkQty) || 1),
        })
        .select()
        .single();
      if (error) throw error;

      if (imageFile) {
        const imageUrl = await uploadImage(product.id, imageFile);
        await supabase.from("products").update({ image_url: imageUrl }).eq("id", product.id);
      }

      const prices = [];
      if (bulkPrice) prices.push({ tenant_id: tenantId, product_id: product.id, store_type: "bulk" as const, price: parseFloat(bulkPrice) });
      if (staffPrice) prices.push({ tenant_id: tenantId, product_id: product.id, store_type: "staff" as const, price: parseFloat(staffPrice) });
      if (prices.length) {
        const { error: pErr } = await supabase.from("product_prices").insert(prices);
        if (pErr) throw pErr;
      }

      const validVariants = variantCombinations.filter((v) => v.label.trim() && v.value.trim());
      if (validVariants.length) {
        const { error: vErr } = await supabase.from("product_variants").insert(
          validVariants.map((v, i) => ({
            product_id: product.id,
            tenant_id: tenantId,
            variant_label: v.label.trim(),
            variant_value: v.value.trim(),
            sku_suffix: v.skuSuffix.trim() || null,
            price_adjustment: parseFloat(v.priceAdj) || 0,
            stock_qty: parseInt(v.stockQty) || 0,
            location: v.location.trim() || null,
            sort_order: i,
          }))
        );
        if (vErr) throw vErr;
      }
    },
    onSuccess: () => {
      toast.success("Produit créé");
      qc.invalidateQueries({ queryKey: ["products", tenantId] });
      setShowAdd(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
    onSettled: () => setUploading(false),
  });

  const updateProduct = useMutation({
    mutationFn: async () => {
      if (!editingProduct) return;
      setUploading(true);
      const { error } = await supabase.from("products").update({
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        category: category.trim().toLowerCase(),
        description: description.trim() || null,
        stock_type: stockType as any,
        stock_qty: parseInt(stockQty) || 0,
        location: productLocation.trim() || null,
        no_billing_bulk: noBillingBulk,
        no_billing_staff: noBillingStaff,
        low_stock_threshold: parseInt(lowStockThreshold) || 0,
        min_bulk_qty: Math.max(1, parseInt(minBulkQty) || 1),
      }).eq("id", editingProduct.id);
      if (error) throw error;

      if (imageFile) {
        const imageUrl = await uploadImage(editingProduct.id, imageFile);
        await supabase.from("products").update({ image_url: imageUrl }).eq("id", editingProduct.id);
      }

      for (const st of ["bulk", "staff"] as const) {
        const val = st === "bulk" ? bulkPrice : staffPrice;
        if (val) {
          await supabase.from("product_prices").upsert(
            { tenant_id: tenantId, product_id: editingProduct.id, store_type: st, price: parseFloat(val) },
            { onConflict: "product_id,store_type,tenant_id" }
          );
        }
      }

      await supabase.from("product_variants").delete().eq("product_id", editingProduct.id);
      const validVariants = variantCombinations.filter((v) => v.label.trim() && v.value.trim());
      if (validVariants.length) {
        await supabase.from("product_variants").insert(
          validVariants.map((v, i) => ({
            product_id: editingProduct.id,
            tenant_id: tenantId,
            variant_label: v.label.trim(),
            variant_value: v.value.trim(),
            sku_suffix: v.skuSuffix.trim() || null,
            price_adjustment: parseFloat(v.priceAdj) || 0,
            stock_qty: parseInt(v.stockQty) || 0,
            location: v.location.trim() || null,
            sort_order: i,
          }))
        );
      }
    },
    onSuccess: () => {
      toast.success("Produit mis à jour");
      qc.invalidateQueries({ queryKey: ["products", tenantId] });
      setEditingProduct(null);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
    onSettled: () => setUploading(false),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ productId, current }: { productId: string; current: boolean }) => {
      const { error } = await supabase.from("products").update({ active: !current }).eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["products", tenantId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produit supprimé");
      qc.invalidateQueries({ queryKey: ["products", tenantId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addCategory = useMutation({
    mutationFn: async () => {
      if (!newCatName.trim()) return;
      const slug = newCatName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { error } = await supabase.from("product_categories").insert({
        tenant_id: tenantId, name: newCatName.trim(), slug, sort_order: (categories?.length || 0),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Catégorie créée");
      qc.invalidateQueries({ queryKey: ["product-categories", tenantId] });
      setNewCatName("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteCategory = useMutation({
    mutationFn: async (catId: string) => {
      const { error } = await supabase.from("product_categories").delete().eq("id", catId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Catégorie supprimée");
      qc.invalidateQueries({ queryKey: ["product-categories", tenantId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const getVariantSummary = (pvariants: any[]) => {
    if (!pvariants?.length) return null;
    const groups: Record<string, string[]> = {};
    pvariants.forEach((v: any) => {
      if (!groups[v.variant_label]) groups[v.variant_label] = [];
      groups[v.variant_label].push(v.variant_value);
    });
    return Object.entries(groups).map(([label, values]) => `${label}: ${values.join(", ")}`).join(" · ");
  };

  // variantPresets moved to VariantAxisEditor component

  return (
    <div className="bg-card rounded-lg border border-border shadow-card">
      <div className="p-5 border-b border-border">
        <SectionHeader
          title={`Catalogue produits (${products.length})`}
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowCatManager(true)}>
                <Tag className="w-4 h-4" /> Catégories ({categories.length})
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4" /> Ajouter
              </Button>
            </div>
          }
        />
      </div>
      {!products.length ? (
        <div className="p-8 text-center">
          <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">Aucun produit dans le catalogue</p>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Ajouter un produit
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Image</TableHead>
              <TableHead className="text-xs">Produit</TableHead>
              <TableHead className="text-xs">SKU</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Catégorie</TableHead>
              <TableHead className="text-xs">Stock</TableHead>
              <TableHead className="text-xs">Prix Bulk</TableHead>
              <TableHead className="text-xs">Prix Staff</TableHead>
              <TableHead className="text-xs">Statut</TableHead>
              <TableHead className="text-xs w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const prices = p.product_prices as any[];
              const pvariants = p.product_variants as any[];
              const bulk = prices?.find((pr: any) => pr.store_type === "bulk");
              const staff = prices?.find((pr: any) => pr.store_type === "staff");
              const variantSummary = getVariantSummary(pvariants);
              return (
                <TableRow key={p.id} className="text-sm">
                  <TableCell>
                    <div className="w-10 h-10 rounded-md bg-muted/50 overflow-hidden shrink-0">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-muted-foreground/30" /></div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{p.name}</p>
                    {p.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.description}</p>}
                    {variantSummary && <p className="text-[10px] text-primary mt-0.5">{variantSummary}</p>}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${p.stock_type === "made_to_order" ? "bg-warning/10 text-warning border-warning/20" : "bg-success/10 text-success border-success/20"}`}>
                      {p.stock_type === "made_to_order" ? "Sur commande" : "En stock"}
                    </Badge>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs capitalize">{categories.find(c => c.slug === p.category)?.name || p.category || "—"}</Badge></TableCell>
                  <TableCell>
                    {(() => {
                      const threshold = p.low_stock_threshold || 0;
                      const isLow = (qty: number) => threshold > 0 && qty <= threshold;
                      return (
                        <div className="text-xs">
                          {pvariants?.length ? (
                            <div className="space-y-0.5">
                              {pvariants.map((v: any) => {
                                const low = isLow(v.stock_qty);
                                return (
                                  <div key={v.id} className="flex items-center gap-1">
                                    <span className="text-muted-foreground">{v.variant_value}:</span>
                                    <span className={`font-medium ${low ? "text-destructive" : ""}`}>{v.stock_qty}</span>
                                    {low && <AlertTriangle className="w-3 h-3 text-destructive" />}
                                    {v.location && <span className="text-muted-foreground text-[10px]">({v.location})</span>}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className={`font-medium ${isLow(p.stock_qty) ? "text-destructive" : ""}`}>{p.stock_qty}</span>
                              {isLow(p.stock_qty) && <AlertTriangle className="w-3 h-3 text-destructive" />}
                              {p.location && <span className="text-muted-foreground text-[10px]">({p.location})</span>}
                            </div>
                          )}
                          {threshold > 0 && <p className="text-[10px] text-muted-foreground mt-0.5">Seuil: {threshold}</p>}
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>{bulk ? formatCurrency(Number(bulk.price)) : "—"}</TableCell>
                  <TableCell>{staff ? formatCurrency(Number(staff.price)) : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={p.active ? "bg-success/10 text-success border-transparent" : "bg-muted text-muted-foreground border-transparent"}>
                      {p.active ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(p)}>
                          <Pencil className="w-4 h-4 mr-2" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleActive.mutate({ productId: p.id, current: p.active })}>
                          {p.active ? <><X className="w-4 h-4 mr-2" /> Désactiver</> : <><CheckCircle className="w-4 h-4 mr-2" /> Activer</>}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStockHistoryProduct(p)}>
                          <History className="w-4 h-4 mr-2" /> Historique stock
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteProduct.mutate(p.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Add Product Dialog */}
      <Dialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Package className="w-5 h-5" /> Nouveau produit</DialogTitle></DialogHeader>
          <div className="space-y-5 max-h-[65vh] overflow-auto pr-1">
            {/* Basic info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom du produit *</Label>
                <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="T-Shirt Premium" maxLength={200} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>SKU * <span className="text-muted-foreground font-normal text-[10px]">(auto)</span></Label>
                  <Input value={sku} onChange={(e) => { setSkuManual(true); setSku(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")); }} placeholder="TSHIRT-01" maxLength={50} />
                </div>
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                      ))}
                      {categories.length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Aucune catégorie. Gérez-les via le bouton "Catégories".</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Disponibilité</Label>
                  <Select value={stockType} onValueChange={setStockType}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_stock">En stock</SelectItem>
                      <SelectItem value="made_to_order">Sur commande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description courte du produit" maxLength={500} />
              </div>
            </div>

            {/* Image */}
            <div className="space-y-2">
              <Label>Image produit</Label>
              <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="text-sm" />
              {imageFile && (
                <div className="w-20 h-20 rounded-md overflow-hidden border border-border">
                  <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Prices */}
            <div>
              <Label className="text-sm font-semibold">Tarification</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Prix Bulk (€)</Label>
                  <Input type="number" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} placeholder="0.00" min="0" step="0.01" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Prix Staff (€)</Label>
                  <Input type="number" value={staffPrice} onChange={(e) => setStaffPrice(e.target.value)} placeholder="0.00" min="0" step="0.01" />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-2">
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={noBillingBulk} onCheckedChange={setNoBillingBulk} />
                  <span>Offert en Bulk <span className="text-muted-foreground">(sans refacturation)</span></span>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={noBillingStaff} onCheckedChange={setNoBillingStaff} />
                  <span>Offert en Staff <span className="text-muted-foreground">(sans refacturation)</span></span>
                </label>
              </div>
              <div className="mt-3 max-w-[200px] space-y-2">
                <Label className="text-xs text-muted-foreground">Minimum de commande (Bulk)</Label>
                <Input type="number" value={minBulkQty} onChange={(e) => setMinBulkQty(e.target.value)} placeholder="1" min="1" />
              </div>
              </div>

            {/* Stock (product-level) */}
            <div>
              <Label className="text-sm font-semibold flex items-center gap-1.5"><Boxes className="w-4 h-4" /> Stock produit</Label>
              {variantCombinations.length > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-2">Le stock et l'emplacement sont gérés par variante. Seul le seuil d'alerte s'applique à l'ensemble du produit.</p>
                  <div className="max-w-xs space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Seuil alerte stock</Label>
                    <Input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} placeholder="0 = pas d'alerte" min="0" />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-2">Si des variantes sont définies, le stock sera géré par variante.</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Quantité en stock</Label>
                      <Input type="number" value={stockQty} onChange={(e) => setStockQty(e.target.value)} placeholder="0" min="0" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Emplacement</Label>
                      <Input value={productLocation} onChange={(e) => setProductLocation(e.target.value)} placeholder="Ex: Étagère A3, Entrepôt Nord…" maxLength={100} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Seuil alerte stock</Label>
                      <Input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} placeholder="0 = pas d'alerte" min="0" />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Variants */}
            <VariantAxisEditor
              axes={variantAxes}
              onAxesChange={setVariantAxes}
              combinations={variantCombinations}
              onCombinationsChange={setVariantCombinations}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border mt-2">
            <Button variant="outline" onClick={() => { setShowAdd(false); resetForm(); }}>Annuler</Button>
            <Button onClick={() => addProduct.mutate()} disabled={!name.trim() || !sku.trim() || addProduct.isPending || uploading} className="gap-1.5">
              {(addProduct.isPending || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Créer le produit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(v) => { if (!v) { setEditingProduct(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5" /> Modifier le produit</DialogTitle></DialogHeader>
          <div className="space-y-5 max-h-[65vh] overflow-auto pr-1">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom du produit *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du produit" maxLength={200} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>SKU *</Label>
                  <Input value={sku} onChange={(e) => setSku(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))} placeholder="SKU-001" maxLength={30} />
                </div>
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                      ))}
                      {categories.length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Aucune catégorie.</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description optionnelle" maxLength={500} />
              </div>
              <div className="space-y-2">
                <Label>Disponibilité</Label>
                <Select value={stockType} onValueChange={setStockType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_stock">En stock</SelectItem>
                    <SelectItem value="made_to_order">Produit sur commande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Changer l'image</Label>
              <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="text-sm" />
              {(imageFile || editingProduct?.image_url) && (
                <div className="w-20 h-20 rounded-md overflow-hidden border border-border">
                  <img src={imageFile ? URL.createObjectURL(imageFile) : editingProduct?.image_url} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div>
              <Label className="text-sm font-semibold">Tarification</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Prix Bulk (€)</Label>
                  <Input type="number" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} placeholder="0.00" min="0" step="0.01" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Prix Staff (€)</Label>
                  <Input type="number" value={staffPrice} onChange={(e) => setStaffPrice(e.target.value)} placeholder="0.00" min="0" step="0.01" />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-2">
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={noBillingBulk} onCheckedChange={setNoBillingBulk} />
                  <span>Offert en Bulk</span>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={noBillingStaff} onCheckedChange={setNoBillingStaff} />
                  <span>Offert en Staff</span>
                </label>
              </div>
              <div className="mt-3 max-w-[200px] space-y-2">
                <Label className="text-xs text-muted-foreground">Minimum de commande (Bulk)</Label>
                <Input type="number" value={minBulkQty} onChange={(e) => setMinBulkQty(e.target.value)} placeholder="1" min="1" />
              </div>
              </div>

            {/* Stock (product-level) */}
            <div>
              <Label className="text-sm font-semibold flex items-center gap-1.5"><Boxes className="w-4 h-4" /> Stock produit</Label>
              {variantCombinations.length > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-2">Le stock et l'emplacement sont gérés par variante. Seul le seuil d'alerte s'applique à l'ensemble du produit.</p>
                  <div className="max-w-xs space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Seuil alerte stock</Label>
                    <Input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} placeholder="0 = pas d'alerte" min="0" />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-2">Si des variantes sont définies, le stock sera géré par variante.</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Quantité en stock</Label>
                      <Input type="number" value={stockQty} onChange={(e) => setStockQty(e.target.value)} placeholder="0" min="0" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Emplacement</Label>
                      <Input value={productLocation} onChange={(e) => setProductLocation(e.target.value)} placeholder="Ex: Étagère A3" maxLength={100} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Seuil alerte stock</Label>
                      <Input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} placeholder="0 = pas d'alerte" min="0" />
                    </div>
                  </div>
                </>
              )}
            </div>

            <VariantAxisEditor
              axes={variantAxes}
              onAxesChange={setVariantAxes}
              combinations={variantCombinations}
              onCombinationsChange={setVariantCombinations}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border mt-2">
            <Button variant="outline" onClick={() => { setEditingProduct(null); resetForm(); }}>Annuler</Button>
            <Button onClick={() => updateProduct.mutate()} disabled={!name.trim() || !sku.trim() || updateProduct.isPending || uploading} className="gap-1.5">
              {(updateProduct.isPending || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Manager Dialog */}
      <Dialog open={showCatManager} onOpenChange={setShowCatManager}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Tag className="w-5 h-5" /> Gérer les catégories</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nouvelle catégorie…"
                maxLength={50}
                onKeyDown={(e) => { if (e.key === "Enter" && newCatName.trim()) addCategory.mutate(); }}
              />
              <Button onClick={() => addCategory.mutate()} disabled={!newCatName.trim() || addCategory.isPending} size="sm" className="gap-1.5 shrink-0">
                {addCategory.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Ajouter
              </Button>
            </div>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune catégorie. Ajoutez-en une ci-dessus.</p>
            ) : (
              <div className="space-y-1 max-h-[300px] overflow-auto">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-md bg-secondary/50 hover:bg-secondary transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{c.slug}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteCategory.mutate(c.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock History Dialog */}
      {stockHistoryProduct && (
        <StockHistoryDialog
          product={stockHistoryProduct}
          tenantId={tenantId}
          onClose={() => setStockHistoryProduct(null)}
        />
      )}
    </div>
  );
}
function OrdersTab({ tenantId, orders, entities, users }: { tenantId: string; orders: any[]; entities?: any[]; users?: any[] }) {
  const qc = useQueryClient();
  const [viewOrder, setViewOrder] = useState<any>(null);

  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast.success(`Commande ${status === "approved" ? "approuvée" : status === "rejected" ? "rejetée" : status}`);
      qc.invalidateQueries({ queryKey: ["orders", tenantId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const pendingCount = orders?.filter(o => o.status === "pending" || o.status === "pending_approval").length || 0;

  return (
    <div className="bg-card rounded-lg border border-border shadow-card">
      <div className="p-5 border-b border-border">
        <SectionHeader
          title={`Commandes (${orders.length})`}
          action={pendingCount > 0 ? (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-xs">{pendingCount} en attente</Badge>
          ) : null}
        />
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
              <TableHead className="text-xs">Articles</TableHead>
              <TableHead className="text-xs">Total</TableHead>
              <TableHead className="text-xs">Statut</TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => {
              const profile = o.profiles as any;
              const items = o.order_items as any[];
              const totalItems = items?.reduce((s: number, i: any) => s + (i.qty || 0), 0) || 0;
              const isPending = o.status === "pending" || o.status === "pending_approval";
              return (
                <TableRow key={o.id} className="text-sm">
                  <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium">{profile?.full_name || profile?.email || "—"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${o.store_type === "bulk" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                      {o.store_type}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{totalItems} article{totalItems > 1 ? "s" : ""}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(Number(o.total))}</TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewOrder(o)}>
                          <Eye className="w-4 h-4 mr-2" /> Voir détails
                        </DropdownMenuItem>
                        {isPending && (
                          <>
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ orderId: o.id, status: "approved" })}>
                              <CheckCircle className="w-4 h-4 mr-2" /> Approuver
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ orderId: o.id, status: "rejected" })}>
                              <XCircle className="w-4 h-4 mr-2" /> Rejeter
                            </DropdownMenuItem>
                          </>
                        )}
                        {o.status === "approved" && (
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ orderId: o.id, status: "processing" })}>
                            <Package className="w-4 h-4 mr-2" /> En traitement
                          </DropdownMenuItem>
                        )}
                        {o.status === "processing" && (
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ orderId: o.id, status: "shipped" })}>
                            <ShoppingCart className="w-4 h-4 mr-2" /> Expédié
                          </DropdownMenuItem>
                        )}
                        {o.status === "shipped" && (
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ orderId: o.id, status: "delivered" })}>
                            <CheckCircle className="w-4 h-4 mr-2" /> Livré
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Order detail dialog */}
      <Dialog open={!!viewOrder} onOpenChange={(v) => { if (!v) setViewOrder(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Commande {viewOrder?.id?.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Client</p>
                  <p className="font-medium">{(viewOrder.profiles as any)?.full_name || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Type</p>
                  <p className="font-medium capitalize">{viewOrder.store_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total</p>
                  <p className="font-bold text-lg">{formatCurrency(Number(viewOrder.total))}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Statut</p>
                  <StatusBadge status={viewOrder.status} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Articles</p>
                <div className="space-y-2">
                  {(viewOrder.order_items as any[])?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded bg-secondary/50 text-sm">
                      <span>{item.products?.name || "Produit"} × {item.qty}</span>
                      <span className="font-medium">{formatCurrency(Number(item.unit_price) * item.qty)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Budgets Tab ─── */
function BudgetsTab({ tenantId, budgets, entities }: { tenantId: string; budgets: any[]; entities: any[] }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const updateBudget = useMutation({
    mutationFn: async ({ budgetId, amount }: { budgetId: string; amount: number }) => {
      const { error } = await supabase.from("budgets").update({ amount }).eq("id", budgetId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Budget mis à jour");
      qc.invalidateQueries({ queryKey: ["budgets", tenantId] });
      setEditing(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="bg-card rounded-lg border border-border shadow-card">
      <div className="p-5 border-b border-border">
        <SectionHeader title={`Budgets (${budgets.length})`} />
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
            const isEditing = editing === b.id;
            return (
              <div key={b.id} className={`p-5 ${isBlocked ? "bg-destructive/5" : ""}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{(b.entities as any)?.name || "—"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{b.store_type} · {b.period}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="h-7 w-24 text-xs"
                          min="0"
                          step="0.01"
                        />
                        <Button size="sm" className="h-7 text-xs" onClick={() => updateBudget.mutate({ budgetId: b.id, amount: parseFloat(editAmount) || 0 })}>
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isBlocked ? "text-destructive" : isWarning ? "text-warning" : "text-foreground"}`}>
                          {formatCurrency(spent)} <span className="text-muted-foreground font-normal">/ {formatCurrency(amount)}</span>
                        </p>
                        <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={() => { setEditing(b.id); setEditAmount(amount.toString()); }}>
                          <Pencil className="w-3 h-3 mr-1" /> Modifier
                        </Button>
                      </div>
                    )}
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

/* ─── Branding Tab ─── */
function BrandingTab({ tenant, branding }: { tenant: any; branding: any }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(branding?.primary_color || "#0ea5e9");
  const [accentColor, setAccentColor] = useState(branding?.accent_color || "#10b981");
  const [backgroundColor, setBackgroundColor] = useState(branding?.background_color || "#ffffff");
  const [textColor, setTextColor] = useState(branding?.text_color || "#1a1a1a");
  const [secondaryColor, setSecondaryColor] = useState(branding?.secondary_color || "#f5f5f4");
  const [buttonTextColor, setButtonTextColor] = useState(branding?.button_text_color || "#ffffff");
  const [headTitle, setHeadTitle] = useState(branding?.head_title || "");
  const [logoUrl, setLogoUrl] = useState(branding?.logo_url || "");
  const [faviconUrl, setFaviconUrl] = useState(branding?.favicon_url || "");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [extracting, setExtracting] = useState(false);

  const handleExtractBranding = async () => {
    if (!websiteUrl.trim()) return;
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-branding", {
        body: { url: websiteUrl.trim() },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Extraction échouée");

      const b = data.branding;
      if (b.primaryColor) setPrimaryColor(b.primaryColor);
      if (b.accentColor) setAccentColor(b.accentColor);
      if (b.backgroundColor) setBackgroundColor(b.backgroundColor);
      if (b.textColor) setTextColor(b.textColor);
      if (b.secondaryColor) setSecondaryColor(b.secondaryColor);
      if (b.buttonTextColor) setButtonTextColor(b.buttonTextColor);
      if (b.logo) setLogoUrl(b.logo);
      if (b.title && !headTitle) setHeadTitle(b.title);

      toast.success("Branding extrait automatiquement !", {
        description: "Couleurs, logo et titre pré-remplis. Ajustez si nécessaire puis enregistrez.",
      });
    } catch (err: any) {
      console.error("Branding extraction error:", err);
      toast.error("Impossible d'extraire le branding", {
        description: err.message || "Vérifiez l'URL et réessayez.",
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenant.id,
        primary_color: primaryColor,
        accent_color: accentColor,
        background_color: backgroundColor,
        text_color: textColor,
        secondary_color: secondaryColor,
        button_text_color: buttonTextColor,
        head_title: headTitle || null,
        logo_url: logoUrl || null,
        favicon_url: faviconUrl || null,
      };
      const { error } = await supabase.from("tenant_branding").upsert(payload, { onConflict: "tenant_id" });
      if (error) throw error;
      toast.success("Branding mis à jour");
      qc.invalidateQueries({ queryKey: ["tenant", tenant.id] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border shadow-card">
      <div className="p-5 border-b border-border">
        <SectionHeader title="Branding & Apparence" />
      </div>
      <div className="p-5 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Couleur primaire", value: primaryColor, set: setPrimaryColor },
                { label: "Couleur d'accent", value: accentColor, set: setAccentColor },
                { label: "Couleur secondaire", value: secondaryColor, set: setSecondaryColor },
                { label: "Fond de page", value: backgroundColor, set: setBackgroundColor },
                { label: "Couleur du texte", value: textColor, set: setTextColor },
                { label: "Texte des boutons", value: buttonTextColor, set: setButtonTextColor },
              ].map((c) => (
                <div key={c.label} className="space-y-1.5">
                  <Label className="text-xs">{c.label}</Label>
                  <div className="flex items-center gap-1.5">
                    <input type="color" value={c.value} onChange={(e) => c.set(e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer shrink-0" />
                    <Input value={c.value} onChange={(e) => c.set(e.target.value)} className="font-mono text-xs h-8" maxLength={7} />
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Titre du navigateur</Label>
              <Input value={headTitle} onChange={(e) => setHeadTitle(e.target.value)} placeholder="Ma Boutique" maxLength={100} />
            </div>
            {/* Website URL extraction */}
            <div className="space-y-2">
              <Label>Site web du client <span className="text-muted-foreground font-normal">(extraction automatique)</span></Label>
              <div className="flex items-center gap-2">
                <Input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://www.exemple.com"
                  maxLength={500}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExtractBranding}
                  disabled={!websiteUrl.trim() || extracting}
                  className="shrink-0 gap-1.5"
                >
                  {extracting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {extracting ? "Analyse..." : "Auto-remplir"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Renseignez l'URL du site pour extraire automatiquement les couleurs, logo et titre.
              </p>
            </div>
            <div className="space-y-2">
              <Label>URL du logo</Label>
              <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." maxLength={500} />
            </div>
            <div className="space-y-2">
              <Label>URL du favicon</Label>
              <Input value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)} placeholder="https://..." maxLength={500} />
            </div>
          </div>

          {/* Live preview */}
          <div className="space-y-3">
            <Label className="text-muted-foreground">Aperçu</Label>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="h-10 flex items-center px-3 gap-2" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-6 w-6 rounded object-cover" />
                ) : (
                  <div className="h-6 w-6 rounded flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: secondaryColor, color: primaryColor }}>
                    {tenant.name.charAt(0)}
                  </div>
                )}
                <span className="text-sm font-medium" style={{ color: buttonTextColor }}>{headTitle || tenant.name}</span>
              </div>
              <div className="p-4 space-y-3" style={{ backgroundColor }}>
                <div className="h-3 w-3/4 rounded-full" style={{ backgroundColor: secondaryColor }} />
                <p className="text-sm" style={{ color: textColor }}>Exemple de texte sur fond de page</p>
                <div className="h-3 w-1/2 rounded-full" style={{ backgroundColor: secondaryColor }} />
                <div className="flex gap-2 mt-3">
                  <div className="h-8 px-4 rounded-md flex items-center text-xs font-medium" style={{ backgroundColor: primaryColor, color: buttonTextColor }}>Bouton principal</div>
                  <div className="h-8 px-4 rounded-md flex items-center text-xs font-medium" style={{ backgroundColor: accentColor, color: buttonTextColor }}>Bouton accent</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Stock History Dialog ─── */
function StockHistoryDialog({ product, tenantId, onClose }: { product: any; tenantId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [showAddMovement, setShowAddMovement] = useState(false);
  const [movementType, setMovementType] = useState<string>("entry");
  const [movementQty, setMovementQty] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [movementVariantId, setMovementVariantId] = useState<string>("");

  const pvariants = (product.product_variants as any[]) || [];

  const { data: movements, isLoading } = useQuery({
    queryKey: ["stock-movements", product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*, profiles:profiles!stock_movements_performed_by_fkey(full_name, email)")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const addMovement = useMutation({
    mutationFn: async () => {
      const qty = parseInt(movementQty);
      if (!qty || qty <= 0) throw new Error("Quantité invalide");

      const type = movementType as "entry" | "exit" | "adjustment";
      const variantId = movementVariantId || null;

      // Get current stock
      let previousQty = 0;
      if (variantId) {
        const variant = pvariants.find((v: any) => v.id === variantId);
        previousQty = variant?.stock_qty || 0;
      } else {
        previousQty = product.stock_qty || 0;
      }

      let newQty = previousQty;
      if (type === "entry") newQty = previousQty + qty;
      else if (type === "exit") newQty = Math.max(0, previousQty - qty);
      else newQty = qty; // adjustment sets absolute value

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Insert movement
      const { error: mErr } = await supabase.from("stock_movements").insert({
        tenant_id: tenantId,
        product_id: product.id,
        variant_id: variantId,
        movement_type: type,
        quantity: qty,
        previous_qty: previousQty,
        new_qty: newQty,
        reason: movementReason.trim() || null,
        performed_by: user.id,
      });
      if (mErr) throw mErr;

      // Update stock
      if (variantId) {
        const { error: uErr } = await supabase.from("product_variants").update({ stock_qty: newQty }).eq("id", variantId);
        if (uErr) throw uErr;
      } else {
        const { error: uErr } = await supabase.from("products").update({ stock_qty: newQty }).eq("id", product.id);
        if (uErr) throw uErr;
      }
    },
    onSuccess: () => {
      toast.success("Mouvement enregistré");
      qc.invalidateQueries({ queryKey: ["stock-movements", product.id] });
      qc.invalidateQueries({ queryKey: ["products", tenantId] });
      setShowAddMovement(false);
      setMovementQty("");
      setMovementReason("");
      setMovementVariantId("");
      setMovementType("entry");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
    entry: { label: "Entrée", icon: ArrowDownCircle, color: "text-success" },
    exit: { label: "Sortie", icon: ArrowUpCircle, color: "text-destructive" },
    adjustment: { label: "Ajustement", icon: RefreshCw, color: "text-warning" },
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" /> Historique stock — {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[65vh] overflow-auto">
          {/* Actions */}
          <div className="flex justify-between items-center">
            <ExportMenu
              title={`Mouvements stock — ${product.name}`}
              filename={`mouvements-stock-${product.sku}`}
              columns={[
                { header: "Date", accessor: (r: any) => fmtDate(r.created_at) },
                { header: "Type", accessor: (r: any) => r.movement_type === "entry" ? "Entrée" : r.movement_type === "exit" ? "Sortie" : "Ajustement" },
                { header: "Quantité", accessor: "quantity" },
                { header: "Avant", accessor: "previous_qty" },
                { header: "Après", accessor: "new_qty" },
                { header: "Raison", accessor: (r: any) => r.reason || "—" },
                { header: "Par", accessor: (r: any) => (r.profiles as any)?.full_name || "—" },
              ]}
              data={movements || []}
            />
            <Button size="sm" className="gap-1.5" onClick={() => setShowAddMovement(!showAddMovement)}>
              <Plus className="w-4 h-4" /> Nouveau mouvement
            </Button>
          </div>

          {/* Add movement form */}
          {showAddMovement && (
            <div className="rounded-lg border border-border p-4 bg-muted/30 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Type de mouvement</Label>
                  <Select value={movementType} onValueChange={setMovementType}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">📦 Entrée de stock</SelectItem>
                      <SelectItem value="exit">📤 Sortie de stock</SelectItem>
                      <SelectItem value="adjustment">🔄 Ajustement (valeur absolue)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Quantité</Label>
                  <Input type="number" value={movementQty} onChange={(e) => setMovementQty(e.target.value)} placeholder="0" min="1" className="h-9" />
                </div>
              </div>
              {pvariants.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs">Variante (optionnel)</Label>
                  <Select value={movementVariantId} onValueChange={setMovementVariantId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Produit global" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Produit global</SelectItem>
                      {pvariants.map((v: any) => (
                        <SelectItem key={v.id} value={v.id}>{v.variant_label}: {v.variant_value} (stock: {v.stock_qty})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs">Raison / commentaire</Label>
                <Input value={movementReason} onChange={(e) => setMovementReason(e.target.value)} placeholder="Ex: Réapprovisionnement fournisseur, Casse, Inventaire…" maxLength={500} className="h-9" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddMovement(false)}>Annuler</Button>
                <Button size="sm" onClick={() => addMovement.mutate()} disabled={!movementQty || addMovement.isPending} className="gap-1.5">
                  {addMovement.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer
                </Button>
              </div>
            </div>
          )}

          {/* Movements list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !movements?.length ? (
            <div className="text-center py-8">
              <History className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucun mouvement de stock enregistré</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Variante</TableHead>
                  <TableHead className="text-xs">Qté</TableHead>
                  <TableHead className="text-xs">Avant → Après</TableHead>
                  <TableHead className="text-xs">Raison</TableHead>
                  <TableHead className="text-xs">Par</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m: any) => {
                  const config = typeConfig[m.movement_type] || typeConfig.adjustment;
                  const Icon = config.icon;
                  const variant = pvariants.find((v: any) => v.id === m.variant_id);
                  return (
                    <TableRow key={m.id} className="text-xs">
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {new Date(m.created_at).toLocaleDateString("fr-FR")}
                        <br />
                        <span className="text-[10px]">{new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 ${config.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          <span className="font-medium">{config.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {variant ? `${variant.variant_label}: ${variant.variant_value}` : "—"}
                      </TableCell>
                      <TableCell className="font-medium">{m.quantity}</TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{m.previous_qty}</span>
                        <span className="mx-1">→</span>
                        <span className="font-medium">{m.new_qty}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[150px] truncate">{m.reason || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {(m.profiles as any)?.full_name || (m.profiles as any)?.email || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Shipping Tab ─── */
function ShippingTab({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const { data: config, isLoading } = useQuery({
    queryKey: ["tenant-shipping", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_shipping")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [mode, setMode] = useState("none");
  const [fixedAmount, setFixedAmount] = useState("0");
  const [thresholdAmount, setThresholdAmount] = useState("0");
  const [thresholdFee, setThresholdFee] = useState("0");
  const [bulkFee, setBulkFee] = useState("0");
  const [staffFee, setStaffFee] = useState("0");
  const [initialized, setInitialized] = useState(false);

  // Sync state when data loads
  if (config && !initialized) {
    setMode(config.mode);
    setFixedAmount(String(config.fixed_amount));
    setThresholdAmount(String(config.threshold_amount));
    setThresholdFee(String(config.threshold_fee));
    setBulkFee(String(config.bulk_fee));
    setStaffFee(String(config.staff_fee));
    setInitialized(true);
  }
  if (!config && !isLoading && !initialized) {
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        tenant_id: tenantId,
        mode,
        fixed_amount: parseFloat(fixedAmount) || 0,
        threshold_amount: parseFloat(thresholdAmount) || 0,
        threshold_fee: parseFloat(thresholdFee) || 0,
        bulk_fee: parseFloat(bulkFee) || 0,
        staff_fee: parseFloat(staffFee) || 0,
      };
      const { error } = await supabase
        .from("tenant_shipping")
        .upsert(payload, { onConflict: "tenant_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-shipping", tenantId] });
      toast.success("Configuration livraison sauvegardée");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const modeOptions = [
    { value: "none", label: "Livraison gratuite", desc: "Aucun frais de port appliqué" },
    { value: "fixed", label: "Montant fixe", desc: "Un montant unique par commande" },
    { value: "threshold", label: "Gratuit au-dessus d'un seuil", desc: "Frais appliqués si le total est inférieur au seuil" },
    { value: "per_store_type", label: "Par type de boutique", desc: "Frais différents pour Bulk et Staff" },
  ];

  return (
    <div className="bg-card rounded-lg border border-border shadow-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader title="Frais de port" />
        <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-1.5">
          {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Sauvegarder
        </Button>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {modeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setMode(opt.value)}
            className={`p-4 rounded-lg border text-left transition-all ${
              mode === opt.value
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-foreground/20"
            }`}
          >
            <p className="text-sm font-semibold text-foreground">{opt.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
          </button>
        ))}
      </div>

      {/* Mode-specific fields */}
      {mode === "fixed" && (
        <div className="space-y-2 max-w-xs">
          <Label className="text-sm">Montant fixe (€)</Label>
          <Input type="number" min="0" step="0.01" value={fixedAmount} onChange={(e) => setFixedAmount(e.target.value)} />
        </div>
      )}

      {mode === "threshold" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
          <div className="space-y-2">
            <Label className="text-sm">Frais de port (€)</Label>
            <Input type="number" min="0" step="0.01" value={thresholdFee} onChange={(e) => setThresholdFee(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Gratuit à partir de (€)</Label>
            <Input type="number" min="0" step="0.01" value={thresholdAmount} onChange={(e) => setThresholdAmount(e.target.value)} />
          </div>
        </div>
      )}

      {mode === "per_store_type" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
          <div className="space-y-2">
            <Label className="text-sm">Frais Merch Interne / Bulk (€)</Label>
            <Input type="number" min="0" step="0.01" value={bulkFee} onChange={(e) => setBulkFee(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Frais Merch Employé / Staff (€)</Label>
            <Input type="number" min="0" step="0.01" value={staffFee} onChange={(e) => setStaffFee(e.target.value)} />
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="rounded-lg bg-muted/30 border border-border p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-1">Aperçu</p>
        <p className="text-sm text-foreground">
          {mode === "none" && "Livraison gratuite sur toutes les commandes."}
          {mode === "fixed" && `${formatCurrency(parseFloat(fixedAmount) || 0)} de frais de port par commande.`}
          {mode === "threshold" && `${formatCurrency(parseFloat(thresholdFee) || 0)} de frais de port. Gratuit à partir de ${formatCurrency(parseFloat(thresholdAmount) || 0)}.`}
          {mode === "per_store_type" && `Bulk : ${formatCurrency(parseFloat(bulkFee) || 0)} · Staff : ${formatCurrency(parseFloat(staffFee) || 0)}`}
        </p>
      </div>
    </div>
  );
}

export default TenantDetail;
