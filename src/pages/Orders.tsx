import TopBar from "@/components/TopBar";
import { StatusBadge, SectionHeader } from "@/components/DashboardWidgets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mock-data";

const Orders = () => {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, profiles:user_id(full_name, email)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const bulkOrders = orders?.filter((o) => o.type === "bulk") || [];
  const staffOrders = orders?.filter((o) => o.type === "staff") || [];

  const OrderTable = ({ items }: { items: typeof orders }) => {
    if (!items?.length) return <p className="p-8 text-center text-sm text-muted-foreground">No orders found</p>;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Order ID</TableHead>
            <TableHead className="text-xs">User</TableHead>
            <TableHead className="text-xs">Items</TableHead>
            <TableHead className="text-xs">Total</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Date</TableHead>
            <TableHead className="text-xs w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((order, i) => {
            const profile = order.profiles as any;
            return (
              <TableRow key={order.id} className="text-sm animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}</TableCell>
                <TableCell className="font-medium">{profile?.full_name || profile?.email || "—"}</TableCell>
                <TableCell>{order.items_count}</TableCell>
                <TableCell className="font-medium">{formatCurrency(Number(order.total))}</TableCell>
                <TableCell><StatusBadge status={order.status} /></TableCell>
                <TableCell className="text-muted-foreground text-xs">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                <TableCell><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <>
      <TopBar title="Orders" subtitle="Manage bulk and staff orders" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <div className="p-5 border-b border-border">
                <TabsList className="bg-secondary">
                  <TabsTrigger value="all" className="text-xs">All ({orders?.length || 0})</TabsTrigger>
                  <TabsTrigger value="bulk" className="text-xs">Bulk ({bulkOrders.length})</TabsTrigger>
                  <TabsTrigger value="staff" className="text-xs">Staff ({staffOrders.length})</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="all" className="m-0"><OrderTable items={orders} /></TabsContent>
              <TabsContent value="bulk" className="m-0"><OrderTable items={bulkOrders} /></TabsContent>
              <TabsContent value="staff" className="m-0"><OrderTable items={staffOrders} /></TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </>
  );
};

export default Orders;
