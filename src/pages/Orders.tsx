import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/TopBar";
import { StatusBadge } from "@/components/DashboardWidgets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Loader2, CheckCircle, XCircle, Package, Truck, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useLocaleDate } from "@/hooks/useLocaleDate";
import ExportMenu from "@/components/ExportMenu";
import { fmtDate, type ExportColumn } from "@/lib/export-utils";

const PAGE_SIZE = 50;

const Orders = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatDate } = useLocaleDate();
  const [tenantFilter, setTenantFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [storeTypeFilter, setStoreTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const statusOptions = [
    { value: "all", label: t("orders.allStatuses") },
    { value: "pending", label: t("status.pending") },
    { value: "pending_approval", label: t("status.pending_approval") },
    { value: "approved", label: t("status.approved") },
    { value: "processing", label: t("status.processing") },
    { value: "shipped", label: t("status.shipped") },
    { value: "delivered", label: t("status.delivered") },
    { value: "rejected", label: t("status.rejected") },
  ];

  const storeTypeOptions = [
    { value: "all", label: t("orders.allTypes") },
    { value: "bulk", label: "Bulk" },
    { value: "staff", label: "Staff" },
  ];

  const { data: tenants } = useQuery({
    queryKey: ["all-tenants-filter"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: ordersResult, isLoading } = useQuery({
    queryKey: ["orders", page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("orders")
        .select("*, profiles:created_by(full_name, email), order_items(qty), entities!orders_entity_id_fkey(name, requires_approval), tenants(name)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    },
  });

  const orders = ordersResult?.data;
  const totalCount = ordersResult?.total || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast.success(`${t("common.order")} ${status === "approved" ? t("common.approved") : status === "rejected" ? t("common.rejected") : status}`);
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
      <TopBar title={t("orders.title")} subtitle={t("orders.subtitle", { count: filtered.length })} />
      <div className="p-6 space-y-4 overflow-auto">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("orders.searchPlaceholder")} className="pl-9 h-9 text-sm" />
          </div>
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="w-[200px] h-9 text-xs"><SelectValue placeholder={t("nav.shop")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("orders.allShops")}</SelectItem>
              {tenants?.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue placeholder={t("common.status")} /></SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={storeTypeFilter} onValueChange={setStoreTypeFilter}>
            <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder={t("common.type")} /></SelectTrigger>
            <SelectContent>
              {storeTypeOptions.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <ExportMenu
          title={t("orders.title")}
          filename="orders"
          columns={[
            { header: "ID", accessor: (r: any) => r.id.slice(0, 8) },
            { header: t("common.user"), accessor: (r: any) => (r.profiles as any)?.full_name || (r.profiles as any)?.email || "—" },
            { header: t("nav.shop"), accessor: (r: any) => (r as any).tenants?.name || "—" },
            { header: t("orders.entity"), accessor: (r: any) => (r.entities as any)?.name || "—" },
            { header: t("common.type"), accessor: "store_type" },
            { header: t("orders.articles"), accessor: (r: any) => (r.order_items as any[])?.reduce((s: number, it: any) => s + it.qty, 0) || 0 },
            { header: t("common.total"), accessor: (r: any) => formatCurrency(Number(r.total)) },
            { header: t("common.status"), accessor: "status" },
            { header: t("common.date"), accessor: (r: any) => fmtDate(r.created_at) },
          ]}
          data={filtered}
          showStoreFilter
        />

        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !filtered.length ? (
            <p className="p-12 text-center text-sm text-muted-foreground">{t("orders.noOrders")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t("common.id")}</TableHead>
                  <TableHead className="text-xs">{t("common.user")}</TableHead>
                  <TableHead className="text-xs">{t("nav.shop")}</TableHead>
                  <TableHead className="text-xs">{t("orders.entity")}</TableHead>
                  <TableHead className="text-xs">{t("common.type")}</TableHead>
                  <TableHead className="text-xs">{t("orders.articles")}</TableHead>
                  <TableHead className="text-xs">{t("common.total")}</TableHead>
                  <TableHead className="text-xs">{t("common.status")}</TableHead>
                  <TableHead className="text-xs">{t("common.date")}</TableHead>
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
                    <TableRow key={order.id} className={`text-sm animate-fade-in cursor-pointer hover:bg-muted/50 ${isPending ? "bg-warning/5" : ""}`} style={{ animationDelay: `${i * 30}ms` }} onClick={() => navigate(`/orders/${order.id}`)}>
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
                      <TableCell className="text-muted-foreground text-xs">{formatDate(order.created_at)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isPending && (
                              <>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: order.id, status: "approved" }); }}>
                                  <CheckCircle className="w-4 h-4 mr-2 text-success" /> {t("common.approve")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: order.id, status: "rejected" }); }}>
                                  <XCircle className="w-4 h-4 mr-2 text-destructive" /> {t("common.reject")}
                                </DropdownMenuItem>
                              </>
                            )}
                            {order.status === "approved" && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: order.id, status: "processing" }); }}>
                                <Package className="w-4 h-4 mr-2" /> {t("orders.processing")}
                              </DropdownMenuItem>
                            )}
                            {order.status === "processing" && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: order.id, status: "shipped" }); }}>
                                <Truck className="w-4 h-4 mr-2" /> {t("orders.markShipped")}
                              </DropdownMenuItem>
                            )}
                            {order.status === "shipped" && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: order.id, status: "delivered" }); }}>
                                <CheckCircle className="w-4 h-4 mr-2" /> {t("orders.markDelivered")}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {t("orders.subtitle", { count: totalCount })} — page {page + 1}/{totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> {t("common.previous")}
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                {t("common.next")} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Orders;
