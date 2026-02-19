import TopBar from "@/components/TopBar";
import { StatusBadge } from "@/components/DashboardWidgets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Loader2, CheckCircle, XCircle, Package } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";

const TenantOrders = () => {
  const { profile, isShopManager } = useAuth();
  const qc = useQueryClient();
  const tenantId = profile?.tenant_id;

  const { data: orders, isLoading } = useQuery({
    queryKey: ["tenant-orders", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, profiles:created_by(full_name, email), order_items(qty), entities(name)")
        .eq("tenant_id", tenantId!)
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
    },
    onSuccess: (_, { status }) => {
      toast.success(`Commande ${status === "approved" ? "approuvée" : status === "rejected" ? "rejetée" : status}`);
      qc.invalidateQueries({ queryKey: ["tenant-orders"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const bulkOrders = orders?.filter((o) => o.store_type === "bulk") || [];
  const staffOrders = orders?.filter((o) => o.store_type === "staff") || [];
  const pendingApproval = orders?.filter((o) => o.status === "pending_approval" || o.status === "pending") || [];

  const OrderTable = ({ items }: { items: typeof orders }) => {
    if (!items?.length) return <p className="p-8 text-center text-sm text-muted-foreground">Aucune commande</p>;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">ID</TableHead>
            <TableHead className="text-xs">Utilisateur</TableHead>
            <TableHead className="text-xs">Département</TableHead>
            <TableHead className="text-xs">Type</TableHead>
            <TableHead className="text-xs">Articles</TableHead>
            <TableHead className="text-xs">Total</TableHead>
            <TableHead className="text-xs">Statut</TableHead>
            <TableHead className="text-xs">Date</TableHead>
            {isShopManager && <TableHead className="text-xs w-10"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((order, i) => {
            const orderProfile = order.profiles as any;
            const entity = order.entities as any;
            const itemsCount = (order.order_items as any[])?.reduce((s, it) => s + it.qty, 0) || 0;
            const canAction = isShopManager && (order.status === "pending" || order.status === "pending_approval");
            return (
              <TableRow key={order.id} className="text-sm animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}</TableCell>
                <TableCell className="font-medium">{orderProfile?.full_name || orderProfile?.email || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{entity?.name || "—"}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${order.store_type === "bulk" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                    {order.store_type === "bulk" ? "Interne" : "Employé"}
                  </span>
                </TableCell>
                <TableCell>{itemsCount}</TableCell>
                <TableCell className="font-medium">{formatCurrency(Number(order.total))}</TableCell>
                <TableCell><StatusBadge status={order.status} /></TableCell>
                <TableCell className="text-muted-foreground text-xs">{new Date(order.created_at).toLocaleDateString("fr-FR")}</TableCell>
                {isShopManager && (
                  <TableCell>
                    {canAction && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ id: order.id, status: "approved" })}>
                            <CheckCircle className="w-4 h-4 mr-2 text-success" /> Approuver
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ id: order.id, status: "rejected" })}>
                            <XCircle className="w-4 h-4 mr-2 text-destructive" /> Rejeter
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <>
      <TopBar title="Commandes" subtitle="Gérer les commandes de votre boutique" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <div className="p-5 border-b border-border">
                <TabsList className="bg-secondary">
                  <TabsTrigger value="all" className="text-xs">Toutes ({orders?.length || 0})</TabsTrigger>
                  <TabsTrigger value="pending" className="text-xs">En attente ({pendingApproval.length})</TabsTrigger>
                  <TabsTrigger value="bulk" className="text-xs">Interne ({bulkOrders.length})</TabsTrigger>
                  <TabsTrigger value="staff" className="text-xs">Employé ({staffOrders.length})</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="all" className="m-0"><OrderTable items={orders} /></TabsContent>
              <TabsContent value="pending" className="m-0"><OrderTable items={pendingApproval} /></TabsContent>
              <TabsContent value="bulk" className="m-0"><OrderTable items={bulkOrders} /></TabsContent>
              <TabsContent value="staff" className="m-0"><OrderTable items={staffOrders} /></TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </>
  );
};

export default TenantOrders;
