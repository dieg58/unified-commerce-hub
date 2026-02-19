import TopBar from "@/components/TopBar";
import { StatusBadge, SectionHeader } from "@/components/DashboardWidgets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const { data: profiles, isLoading } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allRoles } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const getRoles = (userId: string) => allRoles?.filter((r) => r.user_id === userId).map((r) => r.role) || [];

  return (
    <>
      <TopBar title="Users" subtitle="Manage users across all tenants" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          <div className="p-5 border-b border-border">
            <SectionHeader
              title={`All Users (${profiles?.length || 0})`}
              action={<Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />Add User</Button>}
            />
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !profiles?.length ? (
            <p className="p-12 text-center text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Roles</TableHead>
                  <TableHead className="text-xs">Tenant</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((user, i) => {
                  const roles = getRoles(user.id);
                  return (
                    <TableRow key={user.id} className="text-sm animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground shrink-0">
                            {(user.full_name || user.email).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{user.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {roles.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No role</span>
                          ) : (
                            roles.map((role) => (
                              <span key={role} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${roleColors[role] || ""}`}>
                                {roleLabels[role] || role}
                              </span>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{user.tenant_id ? user.tenant_id.slice(0, 8) + "…" : "Platform"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
};

export default UsersPage;
