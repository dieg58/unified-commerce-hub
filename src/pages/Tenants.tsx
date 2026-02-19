import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/TopBar";
import { StatusBadge, SectionHeader } from "@/components/DashboardWidgets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Loader2, Pencil, Power, PowerOff } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CreateTenantWizard from "@/components/tenants/CreateTenantWizard";
import EditTenantDialog from "@/components/tenants/EditTenantDialog";

const Tenants = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<any>(null);

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, tenant_branding(primary_color, accent_color, head_title, logo_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, current }: { id: string; current: string }) => {
      const next = current === "active" ? "suspended" : "active";
      const { error } = await supabase.from("tenants").update({ status: next }).eq("id", id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      toast.success(`Tenant ${next}`);
      qc.invalidateQueries({ queryKey: ["tenants"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <>
      <TopBar title="Tenants" subtitle="Manage all tenant organizations" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          <div className="p-5 border-b border-border">
            <SectionHeader
              title={`All Tenants (${tenants?.length || 0})`}
              action={<Button size="sm" className="gap-1.5" onClick={() => setWizardOpen(true)}><Plus className="w-4 h-4" />Add Tenant</Button>}
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
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant, i) => {
                  const branding = tenant.tenant_branding as any;
                  const color = branding?.primary_color || "#0ea5e9";
                  return (
                    <TableRow key={tenant.id} className="text-sm animate-fade-in cursor-pointer hover:bg-muted/50" style={{ animationDelay: `${i * 50}ms` }} onClick={() => navigate(`/tenants/${tenant.id}`)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: color + "20", color }}>
                            {tenant.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{tenant.name}</p>
                            <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={tenant.status} /></TableCell>
                      <TableCell className="text-muted-foreground text-xs">{new Date(tenant.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditTenant(tenant)}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit Tenant
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStatus.mutate({ id: tenant.id, current: tenant.status })}>
                              {tenant.status === "active" ? <><PowerOff className="w-4 h-4 mr-2" /> Suspend</> : <><Power className="w-4 h-4 mr-2" /> Activate</>}
                            </DropdownMenuItem>
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
      </div>

      <CreateTenantWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      <EditTenantDialog tenant={editTenant} onClose={() => setEditTenant(null)} />
    </>
  );
};

export default Tenants;
