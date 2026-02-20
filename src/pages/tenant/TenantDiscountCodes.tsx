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
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Loader2, Trash2, Tag, Percent, Gift } from "lucide-react";
import { toast } from "sonner";

const typeLabels: Record<string, string> = { percentage: "Pourcentage", fixed: "Montant fixe", gift_card: "Bon cadeau" };
const typeIcons: Record<string, any> = { percentage: Percent, fixed: Tag, gift_card: Gift };
const scopeLabels: Record<string, string> = { bulk: "Interne", staff: "Employé", both: "Les deux" };

const TenantDiscountCodes = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    code: "", description: "", discount_type: "percentage", discount_value: "10",
    min_order_amount: "0", max_uses: "", store_scope: "both", expires_at: "",
  });

  const { data: codes, isLoading } = useQuery({
    queryKey: ["tenant-discount-codes", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("discount_codes").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const addCode = useMutation({
    mutationFn: async () => {
      if (!form.code) throw new Error("Code requis");
      const { error } = await supabase.from("discount_codes").insert({
        tenant_id: tenantId!,
        code: form.code.toUpperCase(),
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value) || 0,
        min_order_amount: parseFloat(form.min_order_amount) || 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        store_scope: form.store_scope,
        expires_at: form.expires_at || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Code créé");
      qc.invalidateQueries({ queryKey: ["tenant-discount-codes"] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("discount_codes").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-discount-codes"] }),
    onError: (err: any) => toast.error(err.message),
  });

  const deleteCode = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("discount_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Code supprimé"); qc.invalidateQueries({ queryKey: ["tenant-discount-codes"] }); },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <>
      <TopBar title="Codes promo" subtitle="Gérer les codes de réduction et bons cadeaux" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Codes ({codes?.length || 0})</h3>
            <Button size="sm" className="gap-1.5" onClick={() => {
              setForm({ code: "", description: "", discount_type: "percentage", discount_value: "10", min_order_amount: "0", max_uses: "", store_scope: "both", expires_at: "" });
              setDialogOpen(true);
            }}><Plus className="w-4 h-4" /> Créer</Button>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !codes?.length ? (
            <p className="p-12 text-center text-sm text-muted-foreground">Aucun code promo</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Valeur</TableHead>
                  <TableHead className="text-xs">Scope</TableHead>
                  <TableHead className="text-xs">Utilisations</TableHead>
                  <TableHead className="text-xs">Actif</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map(code => {
                  const Icon = typeIcons[code.discount_type] || Tag;
                  return (
                    <TableRow key={code.id} className="text-sm">
                      <TableCell className="font-mono font-medium">{code.code}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-xs"><Icon className="w-3.5 h-3.5" /> {typeLabels[code.discount_type]}</span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {code.discount_type === "percentage" ? `${code.discount_value}%` : `${code.discount_value} €`}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{scopeLabels[code.store_scope]}</TableCell>
                      <TableCell className="text-xs">{code.used_count}{code.max_uses ? ` / ${code.max_uses}` : ""}</TableCell>
                      <TableCell>
                        <Switch checked={code.active} onCheckedChange={v => toggleActive.mutate({ id: code.id, active: v })} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteCode.mutate(code.id)}>
                          <Trash2 className="w-4 h-4" />
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
            <DialogHeader><DialogTitle>Nouveau code promo</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="SUMMER2026" className="uppercase" />
              </div>
              <div className="space-y-2">
                <Label>Description (optionnel)</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Promo été" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Pourcentage</SelectItem>
                      <SelectItem value="fixed">Montant fixe</SelectItem>
                      <SelectItem value="gift_card">Bon cadeau</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valeur</Label>
                  <Input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scope</Label>
                  <Select value={form.store_scope} onValueChange={v => setForm(f => ({ ...f, store_scope: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Les deux stores</SelectItem>
                      <SelectItem value="bulk">Interne uniquement</SelectItem>
                      <SelectItem value="staff">Employé uniquement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Utilisations max (vide = illimité)</Label>
                  <Input type="number" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date d'expiration (optionnel)</Label>
                <Input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={() => addCode.mutate()} disabled={addCode.isPending}>
                {addCode.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Créer le code
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default TenantDiscountCodes;
