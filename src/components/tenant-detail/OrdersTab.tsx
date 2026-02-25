import { useState } from "react";
import { StatusBadge, SectionHeader } from "@/components/DashboardWidgets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ShoppingCart, Package, CheckCircle, XCircle, Eye } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";

export function OrdersTab({ tenantId, orders, entities, users }: { tenantId: string; orders: any[]; entities?: any[]; users?: any[] }) {
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
                  <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
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
