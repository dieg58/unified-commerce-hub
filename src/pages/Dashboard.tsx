import TopBar from "@/components/TopBar";
import { StatCard, StatusBadge, SectionHeader } from "@/components/DashboardWidgets";
import { Building2, Users, ShoppingCart, Wallet, TrendingUp, Clock } from "lucide-react";
import { mockTenants, mockOrders, mockUsers, formatCurrency } from "@/lib/mock-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const recentOrders = mockOrders.slice(0, 5);
  const pendingApprovals = mockOrders.filter(o => o.status === "pending");

  return (
    <>
      <TopBar title="Dashboard" subtitle="Super Admin Overview" />
      <div className="p-6 space-y-6 overflow-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Tenants"
            value={mockTenants.length.toString()}
            change="+2 this month"
            icon={<Building2 className="w-4 h-4 text-primary" />}
            delay={0}
          />
          <StatCard
            label="Total Users"
            value={mockUsers.length.toString()}
            change="+12 this week"
            icon={<Users className="w-4 h-4 text-primary" />}
            delay={50}
          />
          <StatCard
            label="Active Orders"
            value={mockOrders.filter(o => !["delivered", "rejected"].includes(o.status)).length.toString()}
            icon={<ShoppingCart className="w-4 h-4 text-primary" />}
            delay={100}
          />
          <StatCard
            label="Total Revenue"
            value={formatCurrency(mockOrders.reduce((s, o) => s + o.total, 0))}
            change="+18.2% vs last month"
            icon={<TrendingUp className="w-4 h-4 text-primary" />}
            delay={150}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-card rounded-lg border border-border shadow-card animate-fade-in" style={{ animationDelay: "200ms" }}>
            <div className="p-5 border-b border-border">
              <SectionHeader
                title="Recent Orders"
                action={
                  <Button variant="ghost" size="sm" onClick={() => navigate("/orders")}>
                    View all
                  </Button>
                }
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Order</TableHead>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Total</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map(order => (
                  <TableRow key={order.id} className="text-sm">
                    <TableCell className="font-mono text-xs">{order.id}</TableCell>
                    <TableCell>{order.userName}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${order.type === "bulk" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                        {order.type}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(order.total)}</TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pending Approvals */}
          <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in" style={{ animationDelay: "250ms" }}>
            <div className="p-5 border-b border-border">
              <SectionHeader title="Pending Approvals" />
            </div>
            <div className="p-4 space-y-3">
              {pendingApprovals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No pending approvals</p>
              ) : (
                pendingApprovals.map(order => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/50 border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">{order.userName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {order.id} · {formatCurrency(order.total)}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="default" className="h-7 text-xs">Approve</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs">Reject</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Tenant Overview */}
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in" style={{ animationDelay: "300ms" }}>
          <div className="p-5 border-b border-border">
            <SectionHeader
              title="Tenants Overview"
              action={
                <Button variant="ghost" size="sm" onClick={() => navigate("/tenants")}>
                  Manage
                </Button>
              }
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
            {mockTenants.slice(0, 3).map(tenant => (
              <div key={tenant.id} className="flex items-center gap-3 p-3 rounded-md border border-border hover:shadow-card-hover transition-shadow cursor-pointer">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ backgroundColor: tenant.primaryColor + "20", color: tenant.primaryColor }}
                >
                  {tenant.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{tenant.name}</p>
                  <p className="text-xs text-muted-foreground">{tenant.entitiesCount} entities · {tenant.usersCount} users</p>
                </div>
                <StatusBadge status={tenant.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
