import TopBar from "@/components/TopBar";
import { StatusBadge, SectionHeader } from "@/components/DashboardWidgets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Tenants = () => {
  const { data: tenants, isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <TopBar title="Tenants" subtitle="Manage all tenant organizations" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          <div className="p-5 border-b border-border">
            <SectionHeader
              title={`All Tenants (${tenants?.length || 0})`}
              action={<Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />Add Tenant</Button>}
            />
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !tenants?.length ? (
            <p className="p-12 text-center text-sm text-muted-foreground">No tenants yet. Create one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Organization</TableHead>
                  <TableHead className="text-xs">Plan</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant, i) => (
                  <TableRow key={tenant.id} className="text-sm animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: tenant.primary_color + "20", color: tenant.primary_color }}>
                          {tenant.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{tenant.name}</p>
                          <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize text-sm">{tenant.plan}</TableCell>
                    <TableCell><StatusBadge status={tenant.status} /></TableCell>
                    <TableCell className="text-muted-foreground text-xs">{new Date(tenant.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
};

export default Tenants;
