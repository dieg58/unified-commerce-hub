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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, Trash2, MapPin, Receipt } from "lucide-react";
import { toast } from "sonner";

type AddressType = "shipping" | "billing";

const TenantAddresses = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<AddressType>("shipping");
  const [form, setForm] = useState({ label: "", address_line1: "", city: "", country: "Belgique", entity_id: "" });

  const { data: entities } = useQuery({
    queryKey: ["tenant-entities", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("*").eq("tenant_id", tenantId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: addresses, isLoading } = useQuery({
    queryKey: ["tenant-addresses", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("addresses").select("*, entities(name)").eq("tenant_id", tenantId!).order("label");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: billingProfiles, isLoading: billingLoading } = useQuery({
    queryKey: ["tenant-billing", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("billing_profiles").select("*, entities(name)").eq("tenant_id", tenantId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const addAddress = useMutation({
    mutationFn: async () => {
      if (!form.entity_id || !form.label || !form.address_line1 || !form.city) throw new Error("Champs requis manquants");
      const { error } = await supabase.from("addresses").insert({
        tenant_id: tenantId!,
        entity_id: form.entity_id,
        label: form.label,
        address_line1: form.address_line1,
        city: form.city,
        country: form.country,
        type: dialogType as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Adresse ajoutée");
      qc.invalidateQueries({ queryKey: ["tenant-addresses"] });
      setDialogOpen(false);
      setForm({ label: "", address_line1: "", city: "", country: "Belgique", entity_id: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addBilling = useMutation({
    mutationFn: async () => {
      if (!form.entity_id || !form.label || !form.address_line1 || !form.city) throw new Error("Champs requis manquants");
      const { error } = await supabase.from("billing_profiles").insert({
        tenant_id: tenantId!,
        entity_id: form.entity_id,
        name: form.label,
        address_line1: form.address_line1,
        city: form.city,
        country: form.country,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil de facturation ajouté");
      qc.invalidateQueries({ queryKey: ["tenant-billing"] });
      setDialogOpen(false);
      setForm({ label: "", address_line1: "", city: "", country: "Belgique", entity_id: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteAddress = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("addresses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Adresse supprimée"); qc.invalidateQueries({ queryKey: ["tenant-addresses"] }); },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteBilling = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("billing_profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profil supprimé"); qc.invalidateQueries({ queryKey: ["tenant-billing"] }); },
    onError: (err: any) => toast.error(err.message),
  });

  const shippingAddresses = addresses?.filter(a => a.type === "shipping") || [];
  const billingAddresses = addresses?.filter(a => a.type === "billing") || [];

  const openDialog = (type: AddressType) => {
    setDialogType(type);
    setForm({ label: "", address_line1: "", city: "", country: "Belgique", entity_id: entities?.[0]?.id || "" });
    setDialogOpen(true);
  };

  return (
    <>
      <TopBar title="Adresses" subtitle="Gérer les adresses de livraison et facturation" />
      <div className="p-6 space-y-6 overflow-auto">
        <Tabs defaultValue="shipping">
          <TabsList className="bg-secondary">
            <TabsTrigger value="shipping" className="text-xs gap-1.5"><MapPin className="w-3.5 h-3.5" /> Livraison ({shippingAddresses.length})</TabsTrigger>
            <TabsTrigger value="billing" className="text-xs gap-1.5"><Receipt className="w-3.5 h-3.5" /> Facturation ({billingProfiles?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="shipping">
            <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Adresses de livraison</h3>
                <Button size="sm" className="gap-1.5" onClick={() => openDialog("shipping")}><Plus className="w-4 h-4" /> Ajouter</Button>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : !shippingAddresses.length ? (
                <p className="p-12 text-center text-sm text-muted-foreground">Aucune adresse de livraison</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Libellé</TableHead>
                      <TableHead className="text-xs">Adresse</TableHead>
                      <TableHead className="text-xs">Ville</TableHead>
                      <TableHead className="text-xs">Pays</TableHead>
                      <TableHead className="text-xs">Entité</TableHead>
                      <TableHead className="text-xs w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shippingAddresses.map(addr => (
                      <TableRow key={addr.id} className="text-sm">
                        <TableCell className="font-medium">{addr.label}</TableCell>
                        <TableCell>{addr.address_line1}</TableCell>
                        <TableCell>{addr.city}</TableCell>
                        <TableCell>{addr.country}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{(addr as any).entities?.name || "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteAddress.mutate(addr.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="billing">
            <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Profils de facturation</h3>
                <Button size="sm" className="gap-1.5" onClick={() => openDialog("billing")}><Plus className="w-4 h-4" /> Ajouter</Button>
              </div>
              {billingLoading ? (
                <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : !billingProfiles?.length ? (
                <p className="p-12 text-center text-sm text-muted-foreground">Aucun profil de facturation</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Nom</TableHead>
                      <TableHead className="text-xs">Adresse</TableHead>
                      <TableHead className="text-xs">Ville</TableHead>
                      <TableHead className="text-xs">TVA</TableHead>
                      <TableHead className="text-xs">Entité</TableHead>
                      <TableHead className="text-xs w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingProfiles.map(bp => (
                      <TableRow key={bp.id} className="text-sm">
                        <TableCell className="font-medium">{bp.name}</TableCell>
                        <TableCell>{bp.address_line1 || "—"}</TableCell>
                        <TableCell>{bp.city || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{bp.vat || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{(bp as any).entities?.name || "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteBilling.mutate(bp.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{dialogType === "shipping" ? "Nouvelle adresse de livraison" : "Nouveau profil de facturation"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{dialogType === "shipping" ? "Libellé" : "Nom"}</Label>
                <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Ex: Siège social" />
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
              <div className="space-y-2">
                <Label>Adresse</Label>
                <Input value={form.address_line1} onChange={e => setForm(f => ({ ...f, address_line1: e.target.value }))} placeholder="Rue, numéro" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Bruxelles" />
                </div>
                <div className="space-y-2">
                  <Label>Pays</Label>
                  <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="Belgique" />
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={() => dialogType === "shipping" ? addAddress.mutate() : addBilling.mutate()}
                disabled={addAddress.isPending || addBilling.isPending}
              >
                {(addAddress.isPending || addBilling.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Ajouter
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default TenantAddresses;
