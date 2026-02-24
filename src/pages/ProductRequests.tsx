import { useState } from "react";
import TopBar from "@/components/TopBar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Package, Search, Eye, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const statuses = [
  { value: "requested", label: "Demandé", className: "bg-blue-500/10 text-blue-600" },
  { value: "in_discussion", label: "En discussion", className: "bg-amber-500/10 text-amber-600" },
  { value: "bat_sent", label: "BAT envoyé", className: "bg-purple-500/10 text-purple-600" },
  { value: "validated", label: "Validé", className: "bg-green-500/10 text-green-600" },
  { value: "added", label: "Ajouté", className: "bg-emerald-500/10 text-emerald-700" },
  { value: "rejected", label: "Rejeté", className: "bg-red-500/10 text-red-600" },
];

const statusMap = Object.fromEntries(statuses.map((s) => [s.value, s]));

const ProductRequests = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editRequest, setEditRequest] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["all-product-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_requests")
        .select("*, catalog_products(name, sku, image_url, base_price, category), profiles:requested_by(full_name, email), tenants(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateRequest = useMutation({
    mutationFn: async () => {
      if (!editRequest) return;
      const updates: any = {};
      if (newStatus && newStatus !== editRequest.status) updates.status = newStatus;
      if (adminNote.trim() !== (editRequest.admin_note || "")) updates.admin_note = adminNote.trim() || null;
      if (Object.keys(updates).length === 0) return;
      const { error } = await supabase.from("product_requests").update(updates).eq("id", editRequest.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demande mise à jour");
      qc.invalidateQueries({ queryKey: ["all-product-requests"] });
      setEditRequest(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = requests?.filter((r) => {
    const matchSearch =
      (r.catalog_products as any)?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (r.tenants as any)?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const pendingCount = requests?.filter((r) => r.status === "requested").length || 0;

  return (
    <>
      <TopBar title="Demandes de produits" subtitle={`${pendingCount} demande${pendingCount > 1 ? "s" : ""} en attente`} />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card rounded-lg border border-border shadow-card">
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !filtered?.length ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucune demande</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Produit</TableHead>
                  <TableHead className="text-xs">Boutique</TableHead>
                  <TableHead className="text-xs">Demandeur</TableHead>
                  <TableHead className="text-xs">Note client</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => {
                  const cp = r.catalog_products as any;
                  const tenant = r.tenants as any;
                  const profile = r.profiles as any;
                  const st = statusMap[r.status] || { label: r.status, className: "" };
                  return (
                    <TableRow key={r.id} className="text-sm animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {cp?.image_url ? (
                            <img src={cp.image_url} alt={cp.name} className="w-10 h-10 rounded-md object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center"><Package className="w-4 h-4 text-muted-foreground" /></div>
                          )}
                          <div>
                            <p className="font-medium">{cp?.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{cp?.sku}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{tenant?.name || "—"}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-xs">{profile?.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">{profile?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{r.note || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${st.className}`}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditRequest(r); setNewStatus(r.status); setAdminNote(r.admin_note || ""); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Edit request dialog */}
      <Dialog open={!!editRequest} onOpenChange={(v) => { if (!v) setEditRequest(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gérer la demande</DialogTitle>
          </DialogHeader>
          {editRequest && (() => {
            const cp = editRequest.catalog_products as any;
            const tenant = editRequest.tenants as any;
            const profile = editRequest.profiles as any;
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 border border-border">
                  {cp?.image_url ? (
                    <img src={cp.image_url} alt={cp.name} className="w-14 h-14 rounded-lg object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground" /></div>
                  )}
                  <div>
                    <p className="font-semibold">{cp?.name}</p>
                    <p className="text-xs text-muted-foreground">{tenant?.name} · {profile?.full_name}</p>
                  </div>
                </div>

                {editRequest.note && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Note du client</p>
                    <p className="text-sm bg-secondary/50 rounded-lg p-3">{editRequest.note}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Statut</label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Note admin (visible par le client)</label>
                  <Textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Ex: BAT envoyé par email le 15/03, en attente de validation…"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditRequest(null)}>Annuler</Button>
                  <Button className="gap-2" onClick={() => updateRequest.mutate()} disabled={updateRequest.isPending}>
                    {updateRequest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Mettre à jour
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProductRequests;
