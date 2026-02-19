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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Loader2, Plus, Pencil, Save, X, MoreHorizontal, Trash2,
  Building2, ShoppingCart, Wallet, Package, Palette, Users, Store,
  CheckCircle, XCircle, Eye
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";

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
        .select("*, profiles:created_by(full_name, email), order_items(qty, unit_price, products(name))")
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
        .select("*, user_roles(role)")
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
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <UsersTab tenantId={id!} users={users || []} />
          </TabsContent>
          <TabsContent value="entities" className="mt-4">
            <EntitiesTab tenantId={id!} entities={entities || []} />
          </TabsContent>
          <TabsContent value="products" className="mt-4">
            <ProductsTab tenantId={id!} products={products || []} />
          </TabsContent>
          <TabsContent value="orders" className="mt-4">
            <OrdersTab tenantId={id!} orders={orders || []} />
          </TabsContent>
          <TabsContent value="budgets" className="mt-4">
            <BudgetsTab tenantId={id!} budgets={budgets || []} entities={entities || []} />
          </TabsContent>
          <TabsContent value="branding" className="mt-4">
            <BrandingTab tenant={tenant} branding={branding} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

/* ─── Users Tab ─── */
function UsersTab({ tenantId, users }: { tenantId: string; users: any[] }) {
  const qc = useQueryClient();
  const roleLabels: Record<string, string> = {
    shop_manager: "Responsable Boutique",
    dept_manager: "Responsable Département",
    employee: "Employé",
  };
  const roleColors: Record<string, string> = {
    shop_manager: "bg-primary/10 text-primary border-primary/20",
    dept_manager: "bg-accent/10 text-accent border-accent/20",
    employee: "bg-secondary text-muted-foreground border-border",
  };

  const changeRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      // Delete existing roles for this user then insert new one
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rôle mis à jour");
      qc.invalidateQueries({ queryKey: ["boutique-users", tenantId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeFromBoutique = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("profiles").update({ tenant_id: null }).eq("id", userId);
      if (error) throw error;
      const { error: roleErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (roleErr) throw roleErr;
    },
    onSuccess: () => {
      toast.success("Utilisateur retiré de la boutique");
      qc.invalidateQueries({ queryKey: ["boutique-users", tenantId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="bg-card rounded-lg border border-border shadow-card">
      <div className="p-5 border-b border-border">
        <SectionHeader
          title={`Utilisateurs (${users.length})`}
          action={
            <div className="flex gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {Object.entries(roleLabels).map(([key, label]) => {
                  const count = users.filter(u => (u.user_roles as any[])?.some(r => r.role === key)).length;
                  return count > 0 ? (
                    <Badge key={key} variant="outline" className={`${roleColors[key]} text-[10px]`}>{count} {label}</Badge>
                  ) : null;
                })}
              </div>
            </div>
          }
        />
      </div>
      {!users.length ? (
        <p className="p-8 text-center text-sm text-muted-foreground">Aucun utilisateur dans cette boutique</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Utilisateur</TableHead>
              <TableHead className="text-xs">Email</TableHead>
              <TableHead className="text-xs">Rôle</TableHead>
              <TableHead className="text-xs">Inscrit le</TableHead>
              <TableHead className="text-xs w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, i) => {
              const roles = user.user_roles as any[];
              const currentRole = roles?.[0]?.role || "employee";
              return (
                <TableRow key={user.id} className="text-sm animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {(user.full_name || user.email).charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{user.full_name || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{user.email}</TableCell>
                  <TableCell>
                    <Select value={currentRole} onValueChange={(v) => changeRole.mutate({ userId: user.id, newRole: v })}>
                      <SelectTrigger className="h-7 w-[200px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shop_manager">Responsable Boutique</SelectItem>
                        <SelectItem value="dept_manager">Responsable Département</SelectItem>
                        <SelectItem value="employee">Employé</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(user.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-destructive" onClick={() => removeFromBoutique.mutate(user.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Retirer de la boutique
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
    </div>
  );
}

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
      setName(""); setCode(""); setRequiresApproval(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteEntity = useMutation({
    mutationFn: async (entityId: string) => {
      const { error } = await supabase.from("entities").delete().eq("id", entityId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entité supprimée");
      qc.invalidateQueries({ queryKey: ["entities", tenantId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleApproval = useMutation({
    mutationFn: async ({ entityId, current }: { entityId: string; current: boolean }) => {
      const { error } = await supabase.from("entities").update({ requires_approval: !current }).eq("id", entityId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entities", tenantId] }),
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="bg-card rounded-lg border border-border shadow-card">
      <div className="p-5 border-b border-border">
        <SectionHeader
          title={`Entités / Départements (${entities.length})`}
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
              <TableHead className="text-xs w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entities.map((e) => (
              <TableRow key={e.id} className="text-sm">
                <TableCell className="font-medium">{e.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{e.code}</TableCell>
                <TableCell>
                  <Switch checked={e.requires_approval} onCheckedChange={() => toggleApproval.mutate({ entityId: e.id, current: e.requires_approval })} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => deleteEntity.mutate(e.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
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
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");
  const [bulkPrice, setBulkPrice] = useState("");
  const [staffPrice, setStaffPrice] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setName(""); setSku(""); setCategory("general"); setDescription("");
    setBulkPrice(""); setStaffPrice(""); setImageFile(null);
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
        .insert({ tenant_id: tenantId, name: name.trim(), sku: sku.trim().toUpperCase(), category: category.trim().toLowerCase(), description: description.trim() || null })
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
    },
    onSuccess: () => {
      toast.success("Produit ajouté");
      qc.invalidateQueries({ queryKey: ["products", tenantId] });
      setShowAdd(false);
      resetForm();
      setUploading(false);
    },
    onError: (err: any) => { toast.error(err.message); setUploading(false); },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ productId, current }: { productId: string; current: boolean }) => {
      const { error } = await supabase.from("products").update({ active: !current }).eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products", tenantId] }),
    onError: (err: any) => toast.error(err.message),
  });

  const deleteProduct = useMutation({
    mutationFn: async (productId: string) => {
      await supabase.from("product_prices").delete().eq("product_id", productId);
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produit supprimé");
      qc.invalidateQueries({ queryKey: ["products", tenantId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="bg-card rounded-lg border border-border shadow-card">
      <div className="p-5 border-b border-border">
        <SectionHeader
          title={`Catalogue produits (${products.length})`}
          action={<Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Ajouter</Button>}
        />
      </div>
      {!products.length ? (
        <p className="p-8 text-center text-sm text-muted-foreground">Aucun produit</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Image</TableHead>
              <TableHead className="text-xs">Produit</TableHead>
              <TableHead className="text-xs">SKU</TableHead>
              <TableHead className="text-xs">Catégorie</TableHead>
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
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs capitalize">{p.category || "general"}</Badge></TableCell>
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
                        <DropdownMenuItem onClick={() => toggleActive.mutate({ productId: p.id, current: p.active })}>
                          {p.active ? <><X className="w-4 h-4 mr-2" /> Désactiver</> : <><CheckCircle className="w-4 h-4 mr-2" /> Activer</>}
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

      <Dialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Nouveau produit</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-auto">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="T-Shirt Premium" maxLength={200} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU *</Label>
                <Input value={sku} onChange={(e) => setSku(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))} placeholder="TSHIRT-01" maxLength={50} />
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="vêtements" maxLength={50} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description courte du produit" maxLength={500} />
            </div>
            <div className="space-y-2">
              <Label>Image produit</Label>
              <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="text-sm" />
              {imageFile && (
                <div className="w-20 h-20 rounded-md overflow-hidden border border-border">
                  <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
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
            <Button variant="outline" onClick={() => { setShowAdd(false); resetForm(); }}>Annuler</Button>
            <Button onClick={() => addProduct.mutate()} disabled={!name.trim() || !sku.trim() || addProduct.isPending || uploading}>
              {(addProduct.isPending || uploading) ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              Créer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Orders Tab ─── */
function OrdersTab({ tenantId, orders }: { tenantId: string; orders: any[] }) {
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
  const [headTitle, setHeadTitle] = useState(branding?.head_title || "");
  const [logoUrl, setLogoUrl] = useState(branding?.logo_url || "");
  const [faviconUrl, setFaviconUrl] = useState(branding?.favicon_url || "");

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenant.id,
        primary_color: primaryColor,
        accent_color: accentColor,
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Couleur primaire</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                  <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono text-sm" maxLength={7} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Couleur d'accent</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                  <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="font-mono text-sm" maxLength={7} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Titre du navigateur</Label>
              <Input value={headTitle} onChange={(e) => setHeadTitle(e.target.value)} placeholder="Ma Boutique" maxLength={100} />
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
                  <div className="h-6 w-6 rounded bg-white/20 flex items-center justify-center text-[10px] font-bold text-white">
                    {tenant.name.charAt(0)}
                  </div>
                )}
                <span className="text-white text-sm font-medium">{headTitle || tenant.name}</span>
              </div>
              <div className="p-4 bg-background space-y-3">
                <div className="h-3 w-3/4 rounded-full bg-muted" />
                <div className="h-3 w-1/2 rounded-full bg-muted" />
                <div className="flex gap-2 mt-3">
                  <div className="h-8 px-4 rounded-md flex items-center text-xs font-medium text-white" style={{ backgroundColor: primaryColor }}>Bouton principal</div>
                  <div className="h-8 px-4 rounded-md flex items-center text-xs font-medium text-white" style={{ backgroundColor: accentColor }}>Bouton accent</div>
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

export default TenantDetail;
