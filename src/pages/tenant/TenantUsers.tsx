import { useState } from "react";
import TopBar from "@/components/TopBar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, MoreHorizontal, CheckCircle, XCircle, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const roleLabels: Record<string, string> = {
  shop_manager: "Responsable Boutique",
  dept_manager: "Responsable Département",
  employee: "Employé",
};

const roleColors: Record<string, string> = {
  shop_manager: "bg-primary/10 text-primary border-primary/20",
  dept_manager: "bg-warning/10 text-warning border-warning/20",
  employee: "bg-secondary text-secondary-foreground border-border",
};

const TenantUsers = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["tenant-users", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: allRoles } = useQuery({
    queryKey: ["tenant-user-roles", tenantId],
    queryFn: async () => {
      const userIds = profiles?.map((p) => p.id) || [];
      if (!userIds.length) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .in("user_id", userIds);
      if (error) throw error;
      return data;
    },
    enabled: !!profiles?.length,
  });

  // Pending signup requests
  const { data: signupRequests } = useQuery({
    queryKey: ["signup-requests", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signup_requests")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ requestId, userId, approve }: { requestId: string; userId: string; approve: boolean }) => {
      if (approve) {
        // Set profile tenant_id
        const { error: pErr } = await supabase
          .from("profiles")
          .update({ tenant_id: tenantId! })
          .eq("id", userId);
        if (pErr) throw pErr;
        // Assign employee role
        const { error: rErr } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "employee" as any });
        if (rErr) throw rErr;
      }
      // Update request status
      const { error } = await supabase
        .from("signup_requests")
        .update({
          status: approve ? "approved" : "rejected",
          reviewed_by: profile!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: (_, { approve }) => {
      toast.success(approve ? "Utilisateur approuvé" : "Demande rejetée");
      queryClient.invalidateQueries({ queryKey: ["signup-requests", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["tenant-users", tenantId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const getRoles = (userId: string) => allRoles?.filter((r) => r.user_id === userId).map((r) => r.role) || [];

  const filteredProfiles = profiles?.filter(user => {
    if (roleFilter === "all") return true;
    const roles = getRoles(user.id);
    if (roleFilter === "none") return roles.length === 0;
    return roles.includes(roleFilter as any);
  }) || [];

  return (
    <>
      <TopBar title="Utilisateurs" subtitle="Gérer les utilisateurs de votre boutique" />
      <div className="p-6 space-y-6 overflow-auto">
        {/* Pending signup requests */}
        {signupRequests && signupRequests.length > 0 && (
          <div className="bg-card rounded-lg border border-warning/30 shadow-card animate-fade-in">
            <div className="p-5 border-b border-border flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              <h3 className="text-sm font-semibold text-foreground">
                Demandes d'inscription en attente ({signupRequests.length})
              </h3>
            </div>
            <div className="divide-y divide-border">
              {signupRequests.map((req) => (
                <div key={req.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center text-xs font-semibold text-warning shrink-0">
                      {(req.full_name || req.email).split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{req.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{req.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground mr-2">
                      {new Date(req.created_at).toLocaleDateString("fr-FR")}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive hover:text-destructive"
                      disabled={reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate({ requestId: req.id, userId: req.user_id, approve: false })}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Refuser
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1"
                      disabled={reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate({ requestId: req.id, userId: req.user_id, approve: true })}
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approuver
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing users table */}
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Utilisateurs ({filteredProfiles.length})</h3>
            <div className="flex items-center gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[200px] h-9 text-xs">
                  <SelectValue placeholder="Filtrer par rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  <SelectItem value="shop_manager">Responsable Boutique</SelectItem>
                  <SelectItem value="dept_manager">Responsable Département</SelectItem>
                  <SelectItem value="employee">Employé</SelectItem>
                  <SelectItem value="none">Aucun rôle</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Inviter</Button>
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !filteredProfiles.length ? (
            <p className="p-12 text-center text-sm text-muted-foreground">Aucun utilisateur{roleFilter !== "all" ? " pour ce filtre" : ""}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Utilisateur</TableHead>
                  <TableHead className="text-xs">Rôle</TableHead>
                  <TableHead className="text-xs">Ajouté le</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((user, i) => {
                  const roles = getRoles(user.id);
                  return (
                    <TableRow key={user.id} className="text-sm animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
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
                            <span className="text-xs text-muted-foreground">Aucun rôle</span>
                          ) : (
                            roles.map((role) => (
                              <span key={role} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${roleColors[role] || ""}`}>
                                {roleLabels[role] || role}
                              </span>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(user.created_at).toLocaleDateString("fr-FR")}</TableCell>
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

export default TenantUsers;
