import TopBar from "@/components/TopBar";
import { StatCard, StatusBadge, SectionHeader } from "@/components/DashboardWidgets";
import { Building2, Users, ShoppingCart, TrendingUp, Clock, Loader2, CheckCircle, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*, tenant_branding(primary_color)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, profiles:created_by(full_name, email), entities(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id");
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
      toast.success(`Order ${status}`);
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const loading = tenantsLoading || ordersLoading;
  const recentOrders = orders?.slice(0, 5) || [];
  const pendingApprovals = orders?.filter((o) => o.status === "pending_approval" || o.status === "pending") || [];
  const activeOrders = orders?.filter((o) => !["delivered", "rejected", "fulfilled"].includes(o.status)) || [];
  const totalRevenue = orders?.reduce((s, o) => s + Number(o.total), 0) || 0;

  if (loading) {
    return (
      <>
        <TopBar title="Dashboard" subtitle="Super Admin Overview" />
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Dashboard" subtitle="Super Admin Overview" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Tenants" value={(tenants?.length || 0).toString()} icon={<Building2 className="w-4 h-4 text-primary" />} delay={0} />
          <StatCard label="Total Users" value={(profiles?.length || 0).toString()} icon={<Users className="w-4 h-4 text-primary" />} delay={50} />
          <StatCard label="Active Orders" value={activeOrders.length.toString()} icon={<ShoppingCart className="w-4 h-4 text-primary" />} delay={100} />
          <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} icon={<TrendingUp className="w-4 h-4 text-primary" />} delay={150} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card rounded-lg border border-border shadow-card animate-fade-in" style={{ animationDelay: "200ms" }}>
            <div className="p-5 border-b border-border">
              <SectionHeader title="Recent Orders" action={<Button variant="ghost" size="sm" onClick={() => navigate("/orders")}>View all</Button>} />
            </div>
            {recentOrders.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">No orders yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Order</TableHead>
                    <TableHead className="text-xs">User</TableHead>
                    <TableHead className="text-xs">Store</TableHead>
                    <TableHead className="text-xs">Total</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => {
                    const profile = order.profiles as any;
                    return (
                      <TableRow key={order.id} className="text-sm">
                        <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}</TableCell>
                        <TableCell>{profile?.full_name || profile?.email || "—"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${order.store_type === "bulk" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                            {order.store_type}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(Number(order.total))}</TableCell>
                        <TableCell><StatusBadge status={order.status} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pending Approvals Widget */}
          <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in" style={{ animationDelay: "250ms" }}>
            <div className="p-5 border-b border-border">
              <SectionHeader
                title="Pending Approvals"
                action={
                  pendingApprovals.length > 0 ? (
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-xs">
                      {pendingApprovals.length}
                    </Badge>
                  ) : null
                }
              />
            </div>
            <div className="p-4 space-y-3 max-h-[400px] overflow-auto">
              {pendingApprovals.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-8 h-8 text-success/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All caught up!</p>
                </div>
              ) : (
                pendingApprovals.map((order) => {
                  const profile = order.profiles as any;
                  const entity = order.entities as any;
                  return (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/50 border border-border">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || "User"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          {formatCurrency(Number(order.total))}
                          {entity?.name && <span className="ml-1">· {entity.name}</span>}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium ${order.store_type === "bulk" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                            {order.store_type}
                          </span>
                          <StatusBadge status={order.status} />
                        </div>
                      </div>
                      <div className="flex gap-1.5 ml-2 shrink-0">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs gap-1"
                          disabled={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: order.id, status: "approved" })}
                        >
                          <CheckCircle className="w-3 h-3" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          disabled={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: order.id, status: "rejected" })}
                        >
                          <XCircle className="w-3 h-3" /> Reject
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in" style={{ animationDelay: "300ms" }}>
          <div className="p-5 border-b border-border">
            <SectionHeader title="Tenants Overview" action={<Button variant="ghost" size="sm" onClick={() => navigate("/tenants")}>Manage</Button>} />
          </div>
          {!tenants?.length ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No tenants created yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
              {tenants.slice(0, 6).map((tenant) => {
                const branding = tenant.tenant_branding as any;
                const color = branding?.primary_color || "#0ea5e9";
                return (
                  <div key={tenant.id} className="flex items-center gap-3 p-3 rounded-md border border-border hover:shadow-card-hover transition-shadow cursor-pointer">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: color + "20", color }}>
                      {tenant.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                    </div>
                    <StatusBadge status={tenant.status} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
