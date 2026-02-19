import TopBar from "@/components/TopBar";
import { StatusBadge, SectionHeader } from "@/components/DashboardWidgets";
import { mockOrders, formatCurrency } from "@/lib/mock-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreHorizontal } from "lucide-react";

const Orders = () => {
  const bulkOrders = mockOrders.filter(o => o.type === "bulk");
  const staffOrders = mockOrders.filter(o => o.type === "staff");

  const OrderTable = ({ orders }: { orders: typeof mockOrders }) => (
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
        {orders.map((order, i) => (
          <TableRow key={order.id} className="text-sm animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
            <TableCell className="font-mono text-xs">{order.id}</TableCell>
            <TableCell className="font-medium">{order.userName}</TableCell>
            <TableCell>{order.itemsCount}</TableCell>
            <TableCell className="font-medium">{formatCurrency(order.total)}</TableCell>
            <TableCell><StatusBadge status={order.status} /></TableCell>
            <TableCell className="text-muted-foreground text-xs">{order.createdAt}</TableCell>
            <TableCell>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <>
      <TopBar title="Orders" subtitle="Manage bulk and staff orders" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          <Tabs defaultValue="all" className="w-full">
            <div className="p-5 border-b border-border">
              <div className="flex items-center justify-between">
                <TabsList className="bg-secondary">
                  <TabsTrigger value="all" className="text-xs">All ({mockOrders.length})</TabsTrigger>
                  <TabsTrigger value="bulk" className="text-xs">Bulk ({bulkOrders.length})</TabsTrigger>
                  <TabsTrigger value="staff" className="text-xs">Staff ({staffOrders.length})</TabsTrigger>
                </TabsList>
              </div>
            </div>
            <TabsContent value="all" className="m-0">
              <OrderTable orders={mockOrders} />
            </TabsContent>
            <TabsContent value="bulk" className="m-0">
              <OrderTable orders={bulkOrders} />
            </TabsContent>
            <TabsContent value="staff" className="m-0">
              <OrderTable orders={staffOrders} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default Orders;
