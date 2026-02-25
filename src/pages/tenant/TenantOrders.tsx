import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/TopBar";
import { StatusBadge } from "@/components/DashboardWidgets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Loader2, CheckCircle, XCircle, Package, Eye } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";
import ExportMenu from "@/components/ExportMenu";
import { fmtDate, type ExportColumn } from "@/lib/export-utils";
import { useTranslation } from "react-i18next";

const orderExportColumns: ExportColumn[] = [
  { header: "ID", accessor: (r: any) => r.id.slice(0, 8) },
  { header: "Utilisateur", accessor: (r: any) => (r.profiles as any)?.full_name || (r.profiles as any)?.email || "—" },
  { header: "Département", accessor: (r: any) => (r.entities as any)?.name || "—" },
  { header: "Type", accessor: (r: any) => r.store_type === "bulk" ? "Interne" : "Employé" },
  { header: "Articles", accessor: (r: any) => (r.order_items as any[])?.reduce((s: number, it: any) => s + it.qty, 0) || 0 },
  { header: "Total", accessor: (r: any) => formatCurrency(Number(r.total)) },
  { header: "Statut", accessor: "status" },
  { header: "Date", accessor: (r: any) => fmtDate(r.created_at) },
];

const TenantOrders = () => {
  const navigate = useNavigate();
  const { profile, isShopManager } = useAuth();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const tenantId = profile?.tenant_id;
  const [exportFilters, setExportFilters] = useState<{ from?: Date; to?: Date; storeType?: string }>({});

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
      toast.success(status === "approved" ? t("tenantOrders.orderApproved") : t("tenantOrders.orderRejected"));
      qc.invalidateQueries({ queryKey: ["tenant-orders"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredOrders = useMemo(() => {
    let list = orders || [];
    if (exportFilters.from) list = list.filter((o) => new Date(o.created_at) >= exportFilters.from!);
    if (exportFilters.to) {
      const end = new Date(exportFilters.to);
      end.setHours(23, 59, 59);
      list = list.filter((o) => new Date(o.created_at) <= end);
    }
    if (exportFilters.storeType && exportFilters.storeType !== "all") list = list.filter((o) => o.store_type === exportFilters.storeType);
    return list;
  }, [orders, exportFilters]);

  const bulkOrders = filteredOrders.filter((o) => o.store_type === "bulk");
  const staffOrders = filteredOrders.filter((o) => o.store_type === "staff");
  const pendingApproval = filteredOrders.filter((o) => o.status === "pending_approval" || o.status === "pending");

  const OrderTable = ({ items }: { items: typeof orders }) => {
    if (!items?.length) return <p className="p-8 text-center text-sm text-muted-foreground">{t("tenantOrders.noOrders")}</p>;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">{t("common.id")}</TableHead>
            <TableHead className="text-xs">{t("common.user")}</TableHead>
            <TableHead className="text-xs">{t("orders.entity")}</TableHead>
            <TableHead className="text-xs">{t("common.type")}</TableHead>
            <TableHead className="text-xs">{t("orders.articles")}</TableHead>
            <TableHead className="text-xs">{t("common.total")}</TableHead>
            <TableHead className="text-xs">{t("common.status")}</TableHead>
            <TableHead className="text-xs">{t("common.date")}</TableHead>
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
                    {order.store_type === "bulk" ? t("tenantOrders.internal") : t("tenantOrders.employee")}
                  </span>
                </TableCell>
                <TableCell>{itemsCount}</TableCell>
                <TableCell className="font-medium">{formatCurrency(Number(order.total))}</TableCell>
                <TableCell><StatusBadge status={order.status} /></TableCell>
                <TableCell className="text-muted-foreground text-xs">{new Date(order.created_at).toLocaleDateString("fr-FR")}</TableCell>
                {isShopManager && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
<DropdownMenuItem onClick={() => navigate(`/tenant/orders/${order.id}`)}>
                          <Eye className="w-4 h-4 mr-2" /> {t("common.viewDetails")}
                        </DropdownMenuItem>
                        {canAction && (
                          <>
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: order.id, status: "approved" })}>
                              <CheckCircle className="w-4 h-4 mr-2 text-success" /> {t("tenantOrders.approve")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: order.id, status: "rejected" })}>
                              <XCircle className="w-4 h-4 mr-2 text-destructive" /> {t("tenantOrders.reject")}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
      <TopBar title={t("tenantOrders.title")} subtitle={t("tenantOrders.subtitle")} />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-2">
                <TabsList className="bg-secondary">
                  <TabsTrigger value="all" className="text-xs">{t("tenantOrders.all")} ({filteredOrders.length})</TabsTrigger>
                  <TabsTrigger value="pending" className="text-xs">{t("tenantOrders.pending")} ({pendingApproval.length})</TabsTrigger>
                  <TabsTrigger value="bulk" className="text-xs">{t("tenantOrders.internal")} ({bulkOrders.length})</TabsTrigger>
                  <TabsTrigger value="staff" className="text-xs">{t("tenantOrders.employee")} ({staffOrders.length})</TabsTrigger>
                </TabsList>
                <ExportMenu
                  title="Commandes"
                  filename="commandes"
                  columns={orderExportColumns}
                  data={filteredOrders}
                  showStoreFilter
                  onFilterChange={setExportFilters}
                />
              </div>
              <TabsContent value="all" className="m-0"><OrderTable items={filteredOrders} /></TabsContent>
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
