import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, Building2, FileText, MapPin, Settings2, Truck } from "lucide-react";
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

/* ─── Section card wrapper ────────────────────────────────────────────── */
const Section = ({ icon: Icon, title, description, children }: { icon: any; title: string; description?: string; children: React.ReactNode }) => (
  <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
    <div className="p-5 border-b border-border">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-md bg-primary/5 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const TenantEntityForm = () => {
  const { id } = useParams();
  const isEditing = id && id !== "new";
  const navigate = useNavigate();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

  const [form, setForm] = useState({ name: "", code: "", vat_rate: "21", vat: "", requires_approval: false, payment_on_order: false });
  const [billingAddr, setBillingAddr] = useState({ ...emptyAddress });
  const [sameAddress, setSameAddress] = useState(true);
  const [shippingAddr, setShippingAddr] = useState({ ...emptyAddress });

  const { data: entity } = useQuery({
    queryKey: ["tenant-entity", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!isEditing,
  });

  const { data: entityAddresses } = useQuery({
    queryKey: ["entity-addresses", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("addresses").select("*").eq("entity_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!isEditing,
  });

  useEffect(() => {
    if (entity) {
      setForm({
        name: entity.name,
        code: entity.code,
        vat_rate: String(entity.vat_rate),
        vat: entity.vat || "",
        requires_approval: entity.requires_approval,
        payment_on_order: entity.payment_on_order,
      });
    }
  }, [entity]);

  useEffect(() => {
    if (entityAddresses) {
      const billing = entityAddresses.find(a => a.type === "billing");
      const shipping = entityAddresses.find(a => a.type === "shipping");
      if (billing) {
        setBillingAddr({ label: billing.label, address_line1: billing.address_line1, city: billing.city, country: billing.country });
      }
      if (shipping && billing && (shipping.address_line1 !== billing.address_line1 || shipping.city !== billing.city || shipping.country !== billing.country)) {
        setSameAddress(false);
        setShippingAddr({ label: shipping.label, address_line1: shipping.address_line1, city: shipping.city, country: shipping.country });
      } else {
        setSameAddress(true);
        setShippingAddr({ ...emptyAddress });
      }
    }
  }, [entityAddresses]);

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

      if (isEditing) {
        const { error } = await supabase.from("entities").update(payload).eq("id", id!);
        if (error) throw error;
        entityId = id!;
        await supabase.from("addresses").delete().eq("entity_id", entityId);
      } else {
        const { data, error } = await supabase.from("entities").insert({ ...payload, tenant_id: tenantId! }).select("id").single();
        if (error) throw error;
        entityId = data.id;
      }

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
      toast.success(isEditing ? "Entité modifiée" : "Entité créée");
      qc.invalidateQueries({ queryKey: ["tenant-entities"] });
      qc.invalidateQueries({ queryKey: ["entity-addresses"] });
      navigate("/tenant/entities");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <>
      <TopBar
        title={isEditing ? "Modifier l'entité" : "Nouvelle entité"}
        subtitle={isEditing ? `Édition de ${entity?.name || "..."}` : "Créer une nouvelle entité"}
      />
      <div className="p-6 max-w-3xl mx-auto space-y-5 overflow-auto pb-12">
        {/* Back button */}
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2" onClick={() => navigate("/tenant/entities")}>
          <ArrowLeft className="w-4 h-4" /> Retour aux entités
        </Button>

        {/* ─── Identification ─────────────────────────────────────────── */}
        <Section icon={Building2} title="Identification" description="Nom et code interne de l'entité">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nom de l'entité</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: HQ Paris" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Code interne</Label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="HQ-PAR" className="uppercase font-mono" />
            </div>
          </div>
        </Section>

        {/* ─── Fiscalité ──────────────────────────────────────────────── */}
        <Section icon={FileText} title="Fiscalité" description="Taux de TVA calculé automatiquement selon le pays">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">N° de TVA</Label>
              <Input value={form.vat} onChange={e => setForm(f => ({ ...f, vat: e.target.value }))} placeholder="BE0123456789" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Taux de TVA</Label>
              <div className="relative">
                <Input type="number" value={form.vat_rate} readOnly className="bg-muted/50 cursor-not-allowed pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Déterminé par le pays de facturation</p>
            </div>
          </div>
        </Section>

        {/* ─── Adresses (side by side on desktop) ─────────────────────── */}
        <Section icon={MapPin} title="Adresses" description="Adresses de facturation et de livraison de l'entité">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Billing */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1">
                <div className="w-5 h-5 rounded bg-accent/10 flex items-center justify-center">
                  <FileText className="w-3 h-3 text-accent" />
                </div>
                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Facturation</span>
              </div>
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

            {/* Shipping */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1">
                <div className="w-5 h-5 rounded bg-accent/10 flex items-center justify-center">
                  <Truck className="w-3 h-3 text-accent" />
                </div>
                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Livraison</span>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2.5">
                <Checkbox id="same-address" checked={sameAddress} onCheckedChange={(v) => setSameAddress(!!v)} />
                <Label htmlFor="same-address" className="text-xs cursor-pointer text-muted-foreground">Identique à l'adresse de facturation</Label>
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
          </div>
        </Section>

        {/* ─── Options ────────────────────────────────────────────────── */}
        <Section icon={Settings2} title="Options de commande" description="Paramètres de validation et de paiement">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Approbation des commandes</p>
                <p className="text-xs text-muted-foreground mt-0.5">Les commandes doivent être validées par un responsable</p>
              </div>
              <Switch checked={form.requires_approval} onCheckedChange={v => setForm(f => ({ ...f, requires_approval: v }))} />
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Paiement à la commande</p>
                <p className="text-xs text-muted-foreground mt-0.5">Le paiement est requis au moment de la commande</p>
              </div>
              <Switch checked={form.payment_on_order} onCheckedChange={v => setForm(f => ({ ...f, payment_on_order: v }))} />
            </div>
          </div>
        </Section>

        {/* ─── Actions ────────────────────────────────────────────────── */}
        <div className="flex gap-3 pt-1 sticky bottom-0 bg-background/80 backdrop-blur-sm py-4 -mx-6 px-6 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={() => navigate("/tenant/entities")}>
            Annuler
          </Button>
          <Button className="flex-1" onClick={() => saveEntity.mutate()} disabled={saveEntity.isPending}>
            {saveEntity.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isEditing ? "Enregistrer les modifications" : "Créer l'entité"}
          </Button>
        </div>
      </div>
    </>
  );
};

export default TenantEntityForm;
