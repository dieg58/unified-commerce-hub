import { useState } from "react";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Loader2, Pencil, Wallet } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/mock-data";

const periodLabels: Record<string, string> = { monthly: "Mensuel", quarterly: "Trimestriel", yearly: "Annuel" };

const TenantBudgets = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ entity_id: "", user_id: "", amount: "0", period: "monthly" });

  const { data: entities } = useQuery({
    queryKey: ["tenant-entities", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("*").eq("tenant_id", tenantId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: users } = useQuery({
    queryKey: ["tenant-users-budget", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email").eq("tenant_id", tenantId!).order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: budgets, isLoading } = useQuery({
    queryKey: ["tenant-user-budgets", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_budgets")
        .select("*, entities(name), profiles(full_name, email)")
        .eq("tenant_id", tenantId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const saveBudget = useMutation({
    mutationFn: async () => {
      if (!form.entity_id || !form.user_id) throw new Error("Entité et utilisateur requis");
      const payload = {
        amount: parseFloat(form.amount) || 0,
        period: form.period,
      };
      if (editing) {
        const { error } = await supabase.from("user_budgets").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_budgets").insert({
          ...payload,
          tenant_id: tenantId!,
          entity_id: form.entity_id,
          user_id: form.user_id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Budget modifié" : "Budget créé");
      qc.invalidateQueries({ queryKey: ["tenant-user-budgets"] });
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ entity_id: entities?.[0]?.id || "", user_id: "", amount: "0", period: "monthly" });
    setDialogOpen(true);
  };

  const openEdit = (budget: any) => {
    setEditing(budget);
    setForm({
      entity_id: budget.entity_id,
      user_id: budget.user_id,
      amount: String(budget.amount),
      period: budget.period,
    });
    setDialogOpen(true);
  };

  return (
    <>
      <TopBar title="Budgets utilisateurs" subtitle="Gérer les budgets par utilisateur et entité" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" /> Budgets ({budgets?.length || 0})
            </h3>
            <Button size="sm" className="gap-1.5" onClick={openAdd}><Plus className="w-4 h-4" /> Ajouter</Button>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !budgets?.length ? (
            <p className="p-12 text-center text-sm text-muted-foreground">Aucun budget utilisateur défini</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Utilisateur</TableHead>
                  <TableHead className="text-xs">Entité</TableHead>
                  <TableHead className="text-xs">Période</TableHead>
                  <TableHead className="text-xs">Budget</TableHead>
                  <TableHead className="text-xs">Utilisé</TableHead>
                  <TableHead className="text-xs min-w-[120px]">Progression</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgets.map(budget => {
                  const userProfile = budget.profiles as any;
                  const entity = budget.entities as any;
                  const pct = budget.amount > 0 ? Math.min((Number(budget.spent) / Number(budget.amount)) * 100, 100) : 0;
                  return (
                    <TableRow key={budget.id} className="text-sm">
                      <TableCell className="font-medium">{userProfile?.full_name || userProfile?.email || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{entity?.name || "—"}</TableCell>
                      <TableCell className="text-xs">{periodLabels[budget.period]}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(Number(budget.amount))}</TableCell>
                      <TableCell>{formatCurrency(Number(budget.spent))}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-2 flex-1" />
                          <span className={`text-xs font-medium ${pct >= 100 ? "text-destructive" : pct >= 80 ? "text-warning" : "text-muted-foreground"}`}>
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(budget)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{editing ? "Modifier le budget" : "Nouveau budget"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {!editing && (
                <>
                  <div className="space-y-2">
                    <Label>Utilisateur</Label>
                    <Select value={form.user_id} onValueChange={v => setForm(f => ({ ...f, user_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>
                        {users?.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Entité</Label>
                    <Select value={form.entity_id} onValueChange={v => setForm(f => ({ ...f, entity_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>
                        {entities?.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>Montant du budget (€)</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Période</Label>
                <Select value={form.period} onValueChange={v => setForm(f => ({ ...f, period: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                    <SelectItem value="quarterly">Trimestriel</SelectItem>
                    <SelectItem value="yearly">Annuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => saveBudget.mutate()} disabled={saveBudget.isPending}>
                {saveBudget.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editing ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default TenantBudgets;
