import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mock-data";
import { StatusBadge } from "@/components/DashboardWidgets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Package, Eye, Loader2, Truck, ExternalLink } from "lucide-react";

const MyOrders = () => {
  const { profile } = useAuth();
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(qty, unit_price, products(name, image_url)), entities(name), shipments(id, status, carrier, tracking_number, shipped_at, delivered_at)")
        .eq("created_by", profile!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const filtered = orders?.filter((o) => statusFilter === "all" || o.status === statusFilter) || [];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Mes commandes</h1>
          <Badge variant="outline" className="ml-2 text-xs">{orders?.length || 0}</Badge>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] h-9 text-xs">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="pending_approval">En approbation</SelectItem>
            <SelectItem value="approved">Approuvée</SelectItem>
            <SelectItem value="processing">En traitement</SelectItem>
            <SelectItem value="shipped">Expédiée</SelectItem>
            <SelectItem value="delivered">Livrée</SelectItem>
            <SelectItem value="rejected">Rejetée</SelectItem>
          </SelectContent>
        </Select>
      </header>

      <div className="p-6">
        {!filtered.length ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">
              {statusFilter === "all" ? "Vous n'avez pas encore passé de commande" : "Aucune commande avec ce statut"}
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">N° Commande</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Entité</TableHead>
                  <TableHead className="text-xs">Articles</TableHead>
                  <TableHead className="text-xs">Total</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o, i) => {
                  const items = o.order_items as any[];
                  const totalItems = items?.reduce((s: number, it: any) => s + (it.qty || 0), 0) || 0;
                  return (
                    <TableRow key={o.id} className="text-sm animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                      <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${o.store_type === "bulk" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                          {o.store_type === "bulk" ? "Bulk" : "Staff"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{(o.entities as any)?.name || "—"}</TableCell>
                      <TableCell className="text-xs">{totalItems} article{totalItems > 1 ? "s" : ""}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(Number(o.total))}</TableCell>
                      <TableCell><StatusBadge status={o.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setViewOrder(o)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

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
                  <p className="text-muted-foreground text-xs">Type</p>
                  <p className="font-medium capitalize">{viewOrder.store_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Entité</p>
                  <p className="font-medium">{(viewOrder.entities as any)?.name || "—"}</p>
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
              {/* Shipment tracking */}
              {(viewOrder.shipments as any[])?.length > 0 && (
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Truck className="w-4 h-4 text-primary" />
                    Suivi de livraison
                  </div>
                  {(viewOrder.shipments as any[]).map((s: any) => {
                    const trackingUrl = s.tracking_number
                      ? s.carrier?.toLowerCase().includes("colissimo")
                        ? `https://www.laposte.fr/outils/suivre-vos-envois?code=${s.tracking_number}`
                        : s.carrier?.toLowerCase().includes("ups")
                        ? `https://www.ups.com/track?tracknum=${s.tracking_number}`
                        : s.carrier?.toLowerCase().includes("dhl")
                        ? `https://www.dhl.com/fr-fr/home/suivi.html?tracking-id=${s.tracking_number}`
                        : s.carrier?.toLowerCase().includes("fedex")
                        ? `https://www.fedex.com/fedextrack/?trknbr=${s.tracking_number}`
                        : `https://www.google.com/search?q=${s.carrier}+tracking+${s.tracking_number}`
                      : null;
                    const statusLabel: Record<string, string> = {
                      preparing: "En préparation",
                      shipped: "Expédiée",
                      delivered: "Livrée",
                    };
                    return (
                      <div key={s.id} className="flex flex-col gap-1 text-sm bg-secondary/50 rounded p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Statut</span>
                          <Badge variant="outline" className={`text-[10px] ${s.status === "delivered" ? "bg-green-500/10 text-green-600" : s.status === "shipped" ? "bg-blue-500/10 text-blue-600" : "bg-muted text-muted-foreground"}`}>
                            {statusLabel[s.status] || s.status}
                          </Badge>
                        </div>
                        {s.carrier && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Transporteur</span>
                            <span className="text-xs font-medium">{s.carrier}</span>
                          </div>
                        )}
                        {s.tracking_number && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Tracking</span>
                            {trackingUrl ? (
                              <a href={trackingUrl} target="_blank" rel="noreferrer" className="text-xs font-mono text-primary hover:underline flex items-center gap-1">
                                {s.tracking_number} <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-xs font-mono">{s.tracking_number}</span>
                            )}
                          </div>
                        )}
                        {s.shipped_at && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Expédiée le</span>
                            <span className="text-xs">{new Date(s.shipped_at).toLocaleDateString("fr-FR")}</span>
                          </div>
                        )}
                        {s.delivered_at && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Livrée le</span>
                            <span className="text-xs">{new Date(s.delivered_at).toLocaleDateString("fr-FR")}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Commandée le {new Date(viewOrder.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyOrders;
