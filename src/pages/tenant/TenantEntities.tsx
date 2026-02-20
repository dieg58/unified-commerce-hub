import { useState, useEffect } from "react";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Loader2, Pencil, Building2 } from "lucide-react";
import { toast } from "sonner";

const vatRatesByCountry: Record<string, number> = {
  "Belgique": 21, "Belgium": 21, "BE": 21,
  "France": 20, "FR": 20,
  "Allemagne": 19, "Germany": 19, "DE": 19,
  "Pays-Bas": 21, "Netherlands": 21, "NL": 21,
  "Luxembourg": 17, "LU": 17,
  "Espagne": 21, "Spain": 21, "ES": 21,
  "Italie": 22, "Italy": 22, "IT": 22,
  "Portugal": 23, "PT": 23,
  "Autriche": 20, "Austria": 20, "AT": 20,
  "Irlande": 23, "Ireland": 23, "IE": 23,
  "Suisse": 8.1, "Switzerland": 8.1, "CH": 8.1,
  "Royaume-Uni": 20, "United Kingdom": 20, "UK": 20, "GB": 20,
  "Pologne": 23, "Poland": 23, "PL": 23,
  "Suède": 25, "Sweden": 25, "SE": 25,
  "Danemark": 25, "Denmark": 25, "DK": 25,
  "Finlande": 25.5, "Finland": 25.5, "FI": 25.5,
  "Grèce": 24, "Greece": 24, "GR": 24,
  "Roumanie": 19, "Romania": 19, "RO": 19,
  "République tchèque": 21, "Czech Republic": 21, "CZ": 21,
  "Hongrie": 27, "Hungary": 27, "HU": 27,
};

const getVatRate = (country: string): string => {
  const rate = vatRatesByCountry[country];
  return rate !== undefined ? String(rate) : "20";
};

const emptyAddress = { label: "", address_line1: "", city: "", country: "Belgique" };

const TenantEntities = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", code: "", vat_rate: "21", vat: "", requires_approval: false, payment_on_order: false });
  const [billingAddr, setBillingAddr] = useState({ ...emptyAddress });
  const [sameAddress, setSameAddress] = useState(true);
  const [shippingAddr, setShippingAddr] = useState({ ...emptyAddress });

  const { data: entities, isLoading } = useQuery({
    queryKey: ["tenant-entities", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("*").eq("tenant_id", tenantId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Load existing addresses when editing
  const { data: entityAddresses } = useQuery({
    queryKey: ["entity-addresses", editing?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("addresses").select("*").eq("entity_id", editing.id);
      if (error) throw error;
      return data;
    },
    enabled: !!editing?.id,
  });

  useEffect(() => {
    if (editing && entityAddresses) {
      const billing = entityAddresses.find(a => a.type === "billing");
      const shipping = entityAddresses.find(a => a.type === "shipping");
      if (billing) {
        setBillingAddr({ label: billing.label, address_line1: billing.address_line1, city: billing.city, country: billing.country });
      }
      if (shipping) {
        setSameAddress(false);
        setShippingAddr({ label: shipping.label, address_line1: shipping.address_line1, city: shipping.city, country: shipping.country });
      } else {
        setSameAddress(true);
        setShippingAddr({ ...emptyAddress });
      }
    }
  }, [editing, entityAddresses]);

  const saveEntity = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.code) throw new Error("Nom et code requis");
      if (!billingAddr.address_line1 || !billingAddr.city) throw new Error("Adresse de facturation requise");
      if (!sameAddress && (!shippingAddr.address_line1 || !shippingAddr.city)) throw new Error("Adresse de livraison requise");

      const payload = {
        name: form.name,
        code: form.code.toUpperCase(),
        vat_rate: parseFloat(form.vat_rate) || 20,
        vat: form.vat || null,
        requires_approval: form.requires_approval,
        payment_on_order: form.payment_on_order,
      };

      let entityId: string;

      if (editing) {
        const { error } = await supabase.from("entities").update(payload).eq("id", editing.id);
        if (error) throw error;
        entityId = editing.id;
        // Delete old addresses for this entity to re-insert
        await supabase.from("addresses").delete().eq("entity_id", entityId);
      } else {
        const { data, error } = await supabase.from("entities").insert({ ...payload, tenant_id: tenantId! }).select("id").single();
        if (error) throw error;
        entityId = data.id;
      }

      // Insert billing address
      const billingPayload = {
        tenant_id: tenantId!,
        entity_id: entityId,
        type: "billing" as const,
        label: billingAddr.label || "Facturation",
        address_line1: billingAddr.address_line1,
        city: billingAddr.city,
        country: billingAddr.country || "Belgique",
      };
      const { error: bErr } = await supabase.from("addresses").insert(billingPayload);
      if (bErr) throw bErr;

      // Insert shipping address
      const shipData = sameAddress ? billingAddr : shippingAddr;
      const shippingPayload = {
        tenant_id: tenantId!,
        entity_id: entityId,
        type: "shipping" as const,
        label: sameAddress ? (billingAddr.label || "Livraison") : (shippingAddr.label || "Livraison"),
        address_line1: shipData.address_line1,
        city: shipData.city,
        country: shipData.country || "Belgique",
      };
      const { error: sErr } = await supabase.from("addresses").insert(shippingPayload);
      if (sErr) throw sErr;
    },
    onSuccess: () => {
      toast.success(editing ? "Entité modifiée" : "Entité créée");
      qc.invalidateQueries({ queryKey: ["tenant-entities"] });
      qc.invalidateQueries({ queryKey: ["entity-addresses"] });
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", code: "", vat_rate: "21", vat: "", requires_approval: false, payment_on_order: false });
    setBillingAddr({ ...emptyAddress });
    setSameAddress(true);
    setShippingAddr({ ...emptyAddress });
    setDialogOpen(true);
  };

  const openEdit = (entity: any) => {
    setEditing(entity);
    setForm({
      name: entity.name,
      code: entity.code,
      vat_rate: String(entity.vat_rate),
      vat: (entity as any).vat || "",
      requires_approval: entity.requires_approval,
      payment_on_order: entity.payment_on_order,
    });
    setBillingAddr({ ...emptyAddress });
    setSameAddress(true);
    setShippingAddr({ ...emptyAddress });
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
                      <TableHead className="text-xs">Taux TVA</TableHead>
                      <TableHead className="text-xs">N° TVA</TableHead>
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
                    <TableCell className="font-mono text-xs">{(entity as any).vat || "—"}</TableCell>
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
          <DialogContent className="sm:max-w-lg max-h-[90vh] p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>{editing ? "Modifier l'entité" : "Nouvelle entité"}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-80px)] px-6 pb-6">
              <div className="space-y-5 pt-2">
                {/* Entity info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Informations</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nom</Label>
                      <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: HQ Paris" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Code</Label>
                      <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="HQ-PAR" className="uppercase" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Taux de TVA (%)</Label>
                      <Input type="number" value={form.vat_rate} readOnly className="bg-muted cursor-not-allowed" />
                      <p className="text-[10px] text-muted-foreground">Automatique selon le pays</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">N° de TVA</Label>
                      <Input value={form.vat} onChange={e => setForm(f => ({ ...f, vat: e.target.value }))} placeholder="BE0123456789" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Exiger l'approbation des commandes</Label>
                    <Switch checked={form.requires_approval} onCheckedChange={v => setForm(f => ({ ...f, requires_approval: v }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Paiement à la commande</Label>
                    <Switch checked={form.payment_on_order} onCheckedChange={v => setForm(f => ({ ...f, payment_on_order: v }))} />
                  </div>
                </div>

                {/* Billing address */}
                <div className="space-y-3 border-t border-border pt-4">
                  <h4 className="text-sm font-semibold text-foreground">Adresse de facturation</h4>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Libellé</Label>
                    <Input value={billingAddr.label} onChange={e => setBillingAddr(a => ({ ...a, label: e.target.value }))} placeholder="Ex: Siège social" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Adresse</Label>
                    <Input value={billingAddr.address_line1} onChange={e => setBillingAddr(a => ({ ...a, address_line1: e.target.value }))} placeholder="Rue et numéro" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Ville</Label>
                      <Input value={billingAddr.city} onChange={e => setBillingAddr(a => ({ ...a, city: e.target.value }))} placeholder="Bruxelles" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Pays</Label>
                      <Input value={billingAddr.country} onChange={e => {
                        const country = e.target.value;
                        setBillingAddr(a => ({ ...a, country }));
                        setForm(f => ({ ...f, vat_rate: getVatRate(country) }));
                      }} placeholder="Belgique" />
                    </div>
                  </div>
                </div>

                {/* Shipping address */}
                <div className="space-y-3 border-t border-border pt-4">
                  <h4 className="text-sm font-semibold text-foreground">Adresse de livraison</h4>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="same-address"
                      checked={sameAddress}
                      onCheckedChange={(v) => setSameAddress(!!v)}
                    />
                    <Label htmlFor="same-address" className="text-xs cursor-pointer">Identique à l'adresse de facturation</Label>
                  </div>
                  {!sameAddress && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Libellé</Label>
                        <Input value={shippingAddr.label} onChange={e => setShippingAddr(a => ({ ...a, label: e.target.value }))} placeholder="Ex: Entrepôt" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Adresse</Label>
                        <Input value={shippingAddr.address_line1} onChange={e => setShippingAddr(a => ({ ...a, address_line1: e.target.value }))} placeholder="Rue et numéro" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Ville</Label>
                          <Input value={shippingAddr.city} onChange={e => setShippingAddr(a => ({ ...a, city: e.target.value }))} placeholder="Bruxelles" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Pays</Label>
                          <Input value={shippingAddr.country} onChange={e => setShippingAddr(a => ({ ...a, country: e.target.value }))} placeholder="Belgique" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button className="w-full" onClick={() => saveEntity.mutate()} disabled={saveEntity.isPending}>
                  {saveEntity.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editing ? "Enregistrer" : "Créer"}
                </Button>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default TenantEntities;
