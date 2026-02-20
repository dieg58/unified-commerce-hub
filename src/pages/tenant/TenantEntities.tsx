import { useState } from "react";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Loader2, Pencil, Building2 } from "lucide-react";
import { toast } from "sonner";

const TenantEntities = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", code: "", vat_rate: "20", requires_approval: false, payment_on_order: false });

  const { data: entities, isLoading } = useQuery({
    queryKey: ["tenant-entities", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("*").eq("tenant_id", tenantId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const saveEntity = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.code) throw new Error("Nom et code requis");
      const payload = {
        name: form.name,
        code: form.code.toUpperCase(),
        vat_rate: parseFloat(form.vat_rate) || 20,
        requires_approval: form.requires_approval,
        payment_on_order: form.payment_on_order,
      };
      if (editing) {
        const { error } = await supabase.from("entities").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("entities").insert({ ...payload, tenant_id: tenantId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Entité modifiée" : "Entité créée");
      qc.invalidateQueries({ queryKey: ["tenant-entities"] });
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", code: "", vat_rate: "20", requires_approval: false, payment_on_order: false });
    setDialogOpen(true);
  };

  const openEdit = (entity: any) => {
    setEditing(entity);
    setForm({
      name: entity.name,
      code: entity.code,
      vat_rate: String(entity.vat_rate),
      requires_approval: entity.requires_approval,
      payment_on_order: entity.payment_on_order,
    });
    setDialogOpen(true);
  };

  return (
    <>
      <TopBar title="Entités" subtitle="Gérer les départements et entités de votre boutique" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Entités ({entities?.length || 0})
            </h3>
            <Button size="sm" className="gap-1.5" onClick={openAdd}><Plus className="w-4 h-4" /> Ajouter</Button>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !entities?.length ? (
            <p className="p-12 text-center text-sm text-muted-foreground">Aucune entité</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nom</TableHead>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">TVA</TableHead>
                  <TableHead className="text-xs">Approbation</TableHead>
                  <TableHead className="text-xs">Paiement à la commande</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entities.map(entity => (
                  <TableRow key={entity.id} className="text-sm">
                    <TableCell className="font-medium">{entity.name}</TableCell>
                    <TableCell className="font-mono text-xs">{entity.code}</TableCell>
                    <TableCell>{entity.vat_rate}%</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${entity.requires_approval ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>
                        {entity.requires_approval ? "Oui" : "Non"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${entity.payment_on_order ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {entity.payment_on_order ? "Oui" : "Non"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(entity)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier l'entité" : "Nouvelle entité"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: HQ Paris" />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="HQ-PAR" className="uppercase" />
              </div>
              <div className="space-y-2">
                <Label>Taux de TVA (%)</Label>
                <Input type="number" value={form.vat_rate} onChange={e => setForm(f => ({ ...f, vat_rate: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Exiger l'approbation des commandes</Label>
                <Switch checked={form.requires_approval} onCheckedChange={v => setForm(f => ({ ...f, requires_approval: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Paiement à la commande</Label>
                <Switch checked={form.payment_on_order} onCheckedChange={v => setForm(f => ({ ...f, payment_on_order: v }))} />
              </div>
              <Button className="w-full" onClick={() => saveEntity.mutate()} disabled={saveEntity.isPending}>
                {saveEntity.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editing ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default TenantEntities;
