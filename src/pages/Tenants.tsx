import TopBar from "@/components/TopBar";
import { StatusBadge, SectionHeader } from "@/components/DashboardWidgets";
import { mockTenants } from "@/lib/mock-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal } from "lucide-react";

const Tenants = () => {
  return (
    <>
      <TopBar title="Tenants" subtitle="Manage all tenant organizations" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          <div className="p-5 border-b border-border">
            <SectionHeader
              title={`All Tenants (${mockTenants.length})`}
              action={
                <Button size="sm" className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  Add Tenant
                </Button>
              }
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Organization</TableHead>
                <TableHead className="text-xs">Plan</TableHead>
                <TableHead className="text-xs">Entities</TableHead>
                <TableHead className="text-xs">Users</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Created</TableHead>
                <TableHead className="text-xs w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTenants.map((tenant, i) => (
                <TableRow key={tenant.id} className="text-sm animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ backgroundColor: tenant.primaryColor + "20", color: tenant.primaryColor }}
                      >
                        {tenant.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize text-sm">{tenant.plan}</span>
                  </TableCell>
                  <TableCell>{tenant.entitiesCount}</TableCell>
                  <TableCell>{tenant.usersCount}</TableCell>
                  <TableCell><StatusBadge status={tenant.status} /></TableCell>
                  <TableCell className="text-muted-foreground text-xs">{tenant.createdAt}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
};

export default Tenants;
