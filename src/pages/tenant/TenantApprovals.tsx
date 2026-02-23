import { useNavigate } from "react-router-dom";
import TopBar from "@/components/TopBar";
import { StatusBadge } from "@/components/DashboardWidgets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Eye, Clock, AlertTriangle, ShoppingCart } from "lucide-react";

const TenantApprovals = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const tenantId = profile?.tenant_id;

  const { data: orders, isLoading } = useQuery({
    queryKey: ["pending-approvals", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, profiles:created_by(full_name, email), order_items(qty, unit_price, products(name)), entities(name, code)")
        .eq("tenant_id", tenantId!)
        .in("status", ["pending_approval"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
      // Send email notification (fire and forget)
      const emailEvent = status === "approved" ? "order_confirmed" : "order_rejected";
      supabase.functions.invoke("send-order-email", { body: { order_id: id, event_type: emailEvent } })
        .catch((e) => console.warn("Email send failed:", e));
    },
    onSuccess: (_, { status }) => {
      toast.success(`Commande ${status === "approved" ? "approuvée" : "rejetée"}`);
      qc.invalidateQueries({ queryKey: ["pending-approvals"] });
      qc.invalidateQueries({ queryKey: ["tenant-orders"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <>
      <TopBar title="Approbations" subtitle="Commandes en attente de validation" />
      <div className="p-6 space-y-6 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !orders?.length ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center animate-fade-in">
            <CheckCircle className="w-12 h-12 text-success/30 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground">Tout est à jour</h3>
            <p className="text-sm text-muted-foreground mt-1">Aucune commande en attente d'approbation</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span>{orders.length} commande{orders.length > 1 ? "s" : ""} en attente d'approbation</span>
            </div>

            {orders.map((order, i) => {
              const orderProfile = order.profiles as any;
              const entity = order.entities as any;
              const orderItems = order.order_items as any[];
              const itemsCount = orderItems?.reduce((s, it) => s + it.qty, 0) || 0;

              return (
                <div
                  key={order.id}
                  className="bg-card rounded-lg border border-border shadow-card animate-fade-in"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
                          <StatusBadge status={order.status} />
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${order.store_type === "bulk" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                            {order.store_type === "bulk" ? "Interne" : "Employé"}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {orderProfile?.full_name || orderProfile?.email || "Utilisateur"}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {entity?.name} ({entity?.code}) · {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">{formatCurrency(Number(order.total))}</p>
                        <p className="text-xs text-muted-foreground">{itemsCount} article{itemsCount > 1 ? "s" : ""}</p>
                      </div>
                    </div>

                    {/* Items preview */}
                    <div className="border border-border rounded-md overflow-hidden mb-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Produit</TableHead>
                            <TableHead className="text-xs text-right">Prix</TableHead>
                            <TableHead className="text-xs text-right">Qté</TableHead>
                            <TableHead className="text-xs text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderItems?.map((item, j) => (
                            <TableRow key={j} className="text-sm">
                              <TableCell className="font-medium">{(item.products as any)?.name || "—"}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{formatCurrency(Number(item.unit_price))}</TableCell>
                              <TableCell className="text-right">{item.qty}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(Number(item.unit_price) * item.qty)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <Eye className="w-3.5 h-3.5" /> Voir détail
                      </Button>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-destructive hover:text-destructive"
                          disabled={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: order.id, status: "rejected" })}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Rejeter
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1"
                          disabled={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: order.id, status: "approved" })}
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approuver
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default TenantApprovals;
