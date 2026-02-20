import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/TopBar";
import { StatusBadge } from "@/components/DashboardWidgets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Loader2, CheckCircle, XCircle, Package, Truck, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";

const statusOptions = [
  { value: "all", label: "Tous les statuts" },
  { value: "pending", label: "En attente" },
  { value: "pending_approval", label: "Approbation requise" },
  { value: "approved", label: "Approuvé" },
  { value: "processing", label: "En traitement" },
  { value: "shipped", label: "Expédié" },
  { value: "delivered", label: "Livré" },
  { value: "rejected", label: "Rejeté" },
];

const storeTypeOptions = [
  { value: "all", label: "Tous les types" },
  { value: "bulk", label: "Bulk" },
  { value: "staff", label: "Staff" },
];

const Orders = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tenantFilter, setTenantFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [storeTypeFilter, setStoreTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: tenants } = useQuery({
    queryKey: ["all-tenants-filter"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, profiles:created_by(full_name, email), order_items(qty), entities(name, requires_approval), tenants(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast.success(`Commande ${status === "approved" ? "approuvée" : status === "rejected" ? "rejetée" : status}`);
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = orders?.filter((o) => {
    if (tenantFilter !== "all" && o.tenant_id !== tenantFilter) return false;
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (storeTypeFilter !== "all" && o.store_type !== storeTypeFilter) return false;
    if (search) {
      const profile = o.profiles as any;
      const q = search.toLowerCase();
      const matchesId = o.id.toLowerCase().includes(q);
      const matchesUser = (profile?.full_name || "").toLowerCase().includes(q) || (profile?.email || "").toLowerCase().includes(q);
      if (!matchesId && !matchesUser) return false;
    }
    return true;
  }) || [];

  return (
    <>
      <TopBar title="Commandes" subtitle={`${filtered.length} commande${filtered.length > 1 ? "s" : ""}`} />
      <div className="p-6 space-y-4 overflow-auto">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (ID, nom, email)…" className="pl-9 h-9 text-sm" />
          </div>
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="w-[200px] h-9 text-xs">
              <SelectValue placeholder="Boutique" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les boutiques</SelectItem>
              {tenants?.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={storeTypeFilter} onValueChange={setStoreTypeFilter}>
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {storeTypeOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !filtered.length ? (
            <p className="p-12 text-center text-sm text-muted-foreground">Aucune commande trouvée</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">ID</TableHead>
                  <TableHead className="text-xs">Utilisateur</TableHead>
                  <TableHead className="text-xs">Boutique</TableHead>
                  <TableHead className="text-xs">Entité</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Articles</TableHead>
                  <TableHead className="text-xs">Total</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order, i) => {
                  const profile = order.profiles as any;
                  const entity = order.entities as any;
                  const tenant = (order as any).tenants as any;
                  const itemsCount = (order.order_items as any[])?.reduce((s, it) => s + it.qty, 0) || 0;
                  const isPending = order.status === "pending_approval" || order.status === "pending";
                  return (
                    <TableRow
                      key={order.id}
                      className={`text-sm animate-fade-in cursor-pointer hover:bg-muted/50 ${isPending ? "bg-warning/5" : ""}`}
                      style={{ animationDelay: `${i * 30}ms` }}
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-medium">{profile?.full_name || profile?.email || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{tenant?.name || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{entity?.name || "—"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${order.store_type === "bulk" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                          {order.store_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{itemsCount}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(Number(order.total))}</TableCell>
                      <TableCell><StatusBadge status={order.status} /></TableCell>
                      <TableCell className="text-muted-foreground text-xs">{new Date(order.created_at).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isPending && (
                              <>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: order.id, status: "approved" }); }}>
                                  <CheckCircle className="w-4 h-4 mr-2 text-success" /> Approuver
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: order.id, status: "rejected" }); }}>
                                  <XCircle className="w-4 h-4 mr-2 text-destructive" /> Rejeter
                                </DropdownMenuItem>
                              </>
                            )}
                            {order.status === "approved" && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: order.id, status: "processing" }); }}>
                                <Package className="w-4 h-4 mr-2" /> En traitement
                              </DropdownMenuItem>
                            )}
                            {order.status === "processing" && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: order.id, status: "shipped" }); }}>
                                <Truck className="w-4 h-4 mr-2" /> Expédié
                              </DropdownMenuItem>
                            )}
                            {order.status === "shipped" && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: order.id, status: "delivered" }); }}>
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
        </div>
      </div>
    </>
  );
};

export default Orders;
