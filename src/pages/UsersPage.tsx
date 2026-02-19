import TopBar from "@/components/TopBar";
import { StatusBadge, SectionHeader } from "@/components/DashboardWidgets";
import { mockUsers, formatCurrency } from "@/lib/mock-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  tenant_admin: "Tenant Admin",
  entity_manager: "Entity Manager",
  staff: "Staff",
};

const roleColors: Record<string, string> = {
  super_admin: "bg-destructive/10 text-destructive border-destructive/20",
  tenant_admin: "bg-primary/10 text-primary border-primary/20",
  entity_manager: "bg-warning/10 text-warning border-warning/20",
  staff: "bg-secondary text-secondary-foreground border-border",
};

const UsersPage = () => {
  return (
    <>
      <TopBar title="Users" subtitle="Manage users across all tenants" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          <div className="p-5 border-b border-border">
            <SectionHeader
              title={`All Users (${mockUsers.length})`}
              action={
                <Button size="sm" className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  Add User
                </Button>
              }
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">User</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs">Budget Usage</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockUsers.map((user, i) => {
                const budgetPercent = user.monthlyBudgetCap > 0 ? (user.monthlySpent / user.monthlyBudgetCap) * 100 : 0;
                return (
                  <TableRow key={user.id} className="text-sm animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground shrink-0">
                          {user.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${roleColors[user.role]}`}>
                        {roleLabels[user.role]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 min-w-[160px]">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{formatCurrency(user.monthlySpent)}</span>
                          <span className="text-muted-foreground">{formatCurrency(user.monthlyBudgetCap)}</span>
                        </div>
                        <Progress
                          value={budgetPercent}
                          className="h-1.5"
                        />
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={user.status} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
};

export default UsersPage;
