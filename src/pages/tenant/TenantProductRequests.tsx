import { useState } from "react";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Package, Search, Plus, Send, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/mock-data";

const statusLabels: Record<string, { label: string; className: string }> = {
  requested: { label: "Demandé", className: "bg-blue-500/10 text-blue-600" },
  in_discussion: { label: "En discussion", className: "bg-amber-500/10 text-amber-600" },
  bat_sent: { label: "BAT envoyé", className: "bg-purple-500/10 text-purple-600" },
  validated: { label: "Validé", className: "bg-green-500/10 text-green-600" },
  added: { label: "Ajouté", className: "bg-emerald-500/10 text-emerald-700" },
  rejected: { label: "Rejeté", className: "bg-red-500/10 text-red-600" },
};

const TenantProductRequests = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [note, setNote] = useState("");
  const [viewRequest, setViewRequest] = useState<any>(null);

  // Fetch existing requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ["product-requests", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_requests")
        .select("*, catalog_products(name, sku, image_url, base_price, category), profiles:requested_by(full_name, email)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch catalog products
  const { data: catalogProducts, isLoading: catalogLoading } = useQuery({
    queryKey: ["catalog-for-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_products")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: catalogOpen,
  });

  // Already requested product IDs
  const requestedIds = new Set(
    requests?.filter((r) => !["rejected", "added"].includes(r.status)).map((r) => r.catalog_product_id) || []
  );

  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!selectedProduct || !tenantId || !profile) return;
      const { error } = await supabase.from("product_requests").insert({
        tenant_id: tenantId,
        catalog_product_id: selectedProduct.id,
        requested_by: profile.id,
        note: note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demande envoyée !");
      qc.invalidateQueries({ queryKey: ["product-requests"] });
      setSelectedProduct(null);
      setNote("");
      setCatalogOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredCatalog = catalogProducts?.filter(
    (p) =>
      p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  const filteredRequests = requests?.filter(
    (r) =>
      (r.catalog_products as any)?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.status.includes(search.toLowerCase())
  );

  return (
    <>
      <TopBar title="Demandes de produits" subtitle="Demandez l'ajout de produits du catalogue INKOO à votre boutique" />
      <div className="p-6 space-y-6 overflow-auto">
        {/* Actions bar */}
        <div className="flex items-center justify-between">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 w-60 text-sm" />
          </div>
          <Button size="sm" className="gap-2" onClick={() => setCatalogOpen(true)}>
            <Plus className="w-4 h-4" /> Nouvelle demande
          </Button>
        </div>

        {/* Requests list */}
        <div className="bg-card rounded-lg border border-border shadow-card">
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !filteredRequests?.length ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucune demande de produit</p>
              <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => setCatalogOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Parcourir le catalogue
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Produit</TableHead>
                  <TableHead className="text-xs">Catégorie</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                  <TableHead className="text-xs">Note admin</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((r, i) => {
                  const cp = r.catalog_products as any;
                  const st = statusLabels[r.status] || { label: r.status, className: "" };
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
                      <TableCell className="text-xs text-muted-foreground capitalize">{cp?.category || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${st.className}`}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.admin_note || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setViewRequest(r)}>
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

      {/* Browse catalog dialog */}
      <Dialog open={catalogOpen} onOpenChange={(v) => { if (!v) { setCatalogOpen(false); setSelectedProduct(null); setNote(""); } else setCatalogOpen(true); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{selectedProduct ? "Confirmer la demande" : "Catalogue INKOO"}</DialogTitle>
          </DialogHeader>

          {selectedProduct ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 border border-border">
                {selectedProduct.image_url ? (
                  <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-16 h-16 rounded-lg object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center"><Package className="w-6 h-6 text-muted-foreground" /></div>
                )}
                <div>
                  <p className="font-semibold">{selectedProduct.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedProduct.sku} · {selectedProduct.category}</p>
                  <p className="text-sm font-medium mt-1">À partir de {formatCurrency(Number(selectedProduct.base_price))}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Note pour l'équipe INKOO (optionnel)</label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Précisez vos besoins : couleurs, quantités estimées, emplacement du logo…"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedProduct(null)}>Retour</Button>
                <Button className="gap-2" onClick={() => submitRequest.mutate()} disabled={submitRequest.isPending}>
                  {submitRequest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Envoyer la demande
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Rechercher dans le catalogue…" value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} className="pl-8 h-9 text-sm" />
              </div>
              {catalogLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : !filteredCatalog?.length ? (
                <p className="text-center text-sm text-muted-foreground py-8">Aucun produit trouvé</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredCatalog.map((p) => {
                    const alreadyRequested = requestedIds.has(p.id);
                    return (
                      <button
                        key={p.id}
                        disabled={alreadyRequested}
                        onClick={() => setSelectedProduct(p)}
                        className={`text-left border border-border rounded-lg overflow-hidden hover:shadow-card-hover transition-all ${alreadyRequested ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-28 object-cover" />
                        ) : (
                          <div className="w-full h-28 bg-muted flex items-center justify-center"><Package className="w-8 h-8 text-muted-foreground/30" /></div>
                        )}
                        <div className="p-3">
                          <p className="font-medium text-sm truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.sku}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-xs font-medium">{formatCurrency(Number(p.base_price))}</span>
                            {alreadyRequested && <Badge variant="outline" className="text-[9px]">Déjà demandé</Badge>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View request detail */}
      <Dialog open={!!viewRequest} onOpenChange={(v) => { if (!v) setViewRequest(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Détail de la demande</DialogTitle>
          </DialogHeader>
          {viewRequest && (() => {
            const cp = viewRequest.catalog_products as any;
            const st = statusLabels[viewRequest.status] || { label: viewRequest.status, className: "" };
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {cp?.image_url ? (
                    <img src={cp.image_url} alt={cp.name} className="w-16 h-16 rounded-lg object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center"><Package className="w-6 h-6 text-muted-foreground" /></div>
                  )}
                  <div>
                    <p className="font-semibold">{cp?.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{cp?.sku}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Statut</p>
                    <Badge variant="outline" className={`text-[10px] mt-1 ${st.className}`}>{st.label}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Date</p>
                    <p className="font-medium">{new Date(viewRequest.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                </div>
                {viewRequest.note && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Votre note</p>
                    <p className="text-sm bg-secondary/50 rounded-lg p-3">{viewRequest.note}</p>
                  </div>
                )}
                {viewRequest.admin_note && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Réponse INKOO</p>
                    <p className="text-sm bg-primary/5 rounded-lg p-3 border border-primary/10">{viewRequest.admin_note}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TenantProductRequests;
