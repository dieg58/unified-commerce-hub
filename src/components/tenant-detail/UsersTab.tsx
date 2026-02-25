import { useState } from "react";
import { SectionHeader } from "@/components/DashboardWidgets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, MoreHorizontal, Trash2, Users, Send, Clock, UserPlus, Mail } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function UsersTab({ tenantId, users }: { tenantId: string; users: any[] }) {
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invName, setInvName] = useState("");
  const [invRole, setInvRole] = useState("employee");

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin", shop_manager: "Responsable Boutique",
    dept_manager: "Responsable Département", employee: "Employé",
  };

  const invitations = useQuery({
    queryKey: ["invitations", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("invitations").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const invite = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const { error: invErr } = await supabase.from("invitations").upsert({
        tenant_id: tenantId, email: invEmail.toLowerCase(), full_name: invName,
        role: invRole as any, invited_by: session!.user.id, status: "pending", accepted_at: null,
      }, { onConflict: "tenant_id,email" });
      if (invErr) throw invErr;
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email: invEmail, full_name: invName, role: invRole, tenant_id: tenantId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Invitation envoyée !");
      setShowInvite(false); setInvEmail(""); setInvName(""); setInvRole("employee");
      qc.invalidateQueries({ queryKey: ["boutique-users", tenantId] });
      qc.invalidateQueries({ queryKey: ["invitations", tenantId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resendInvite = useMutation({
    mutationFn: async (inv: any) => {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email: inv.email, full_name: inv.full_name, role: inv.role, tenant_id: tenantId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => toast.success("Invitation renvoyée !"),
    onError: (err: any) => toast.error(err.message),
  });

  const removeUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error: rErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (rErr) throw rErr;
      const { error: pErr } = await supabase.from("profiles").update({ tenant_id: null }).eq("id", userId);
      if (pErr) throw pErr;
    },
    onSuccess: () => {
      toast.success("Utilisateur retiré de la boutique");
      qc.invalidateQueries({ queryKey: ["boutique-users", tenantId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader><DialogTitle>Inviter un utilisateur</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label className="text-xs">Nom complet</Label><Input value={invName} onChange={(e) => setInvName(e.target.value)} placeholder="Jean Dupont" /></div>
            <div><Label className="text-xs">Email</Label><Input type="email" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} placeholder="jean@example.com" /></div>
            <div><Label className="text-xs">Rôle</Label>
              <Select value={invRole} onValueChange={setInvRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="shop_manager">Responsable Boutique</SelectItem>
                  <SelectItem value="dept_manager">Responsable Département</SelectItem>
                  <SelectItem value="employee">Employé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full gap-1.5" disabled={!invEmail || invite.isPending} onClick={() => invite.mutate()}>
              {invite.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Envoyer l'invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {invitations.data && invitations.data.filter((i) => i.status === "pending").length > 0 && (
        <div className="bg-card rounded-lg border border-warning/30 shadow-card">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Clock className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-semibold">Invitations en attente ({invitations.data.filter((i) => i.status === "pending").length})</h3>
          </div>
          <div className="divide-y divide-border">
            {invitations.data.filter((i) => i.status === "pending").map((inv) => (
              <div key={inv.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{inv.full_name || inv.email}</p>
                  <p className="text-xs text-muted-foreground">{inv.email} · {roleLabels[inv.role] || inv.role}</p>
                </div>
                <Button size="sm" variant="outline" className="gap-1" disabled={resendInvite.isPending} onClick={() => resendInvite.mutate(inv)}>
                  <Mail className="w-3.5 h-3.5" /> Renvoyer
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border shadow-card">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <SectionHeader title={`Utilisateurs (${users.length})`} />
          <Button size="sm" className="gap-1.5" onClick={() => setShowInvite(true)}>
            <UserPlus className="w-4 h-4" /> Inviter
          </Button>
        </div>
        {!users.length ? (
          <div className="p-8 text-center"><Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">Aucun utilisateur</p></div>
        ) : (
          <Table><TableHeader><TableRow>
             <TableHead className="text-xs">Nom</TableHead><TableHead className="text-xs">Email</TableHead>
             <TableHead className="text-xs">Rôle</TableHead><TableHead className="text-xs">Inscrit le</TableHead>
             <TableHead className="text-xs w-10"></TableHead>
           </TableRow></TableHeader><TableBody>
             {users.map((u) => {
               const roles = (u.user_roles as any[]) || [];
               const role = roles[0]?.role || "employee";
               return (<TableRow key={u.id} className="text-sm">
                 <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                 <TableCell className="text-muted-foreground">{u.email}</TableCell>
                 <TableCell><Badge variant="outline" className="text-xs">{roleLabels[role] || role}</Badge></TableCell>
                 <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                 <TableCell>
                   <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                       <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                       <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm("Retirer cet utilisateur de la boutique ?")) removeUser.mutate(u.id); }}>
                         <Trash2 className="w-4 h-4 mr-2" /> Retirer de la boutique
                       </DropdownMenuItem>
                     </DropdownMenuContent>
                   </DropdownMenu>
                 </TableCell>
               </TableRow>);
             })}
           </TableBody></Table>
        )}
      </div>
    </div>
  );
}
