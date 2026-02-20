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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Building2, FileText, MapPin, Settings2, Truck, Wallet, CheckCircle2, XCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/mock-data";

const countries = [
  { value: "Belgique", rate: 21 },
  { value: "France", rate: 20 },
  { value: "Allemagne", rate: 19 },
  { value: "Pays-Bas", rate: 21 },
  { value: "Luxembourg", rate: 17 },
  { value: "Espagne", rate: 21 },
  { value: "Italie", rate: 22 },
  { value: "Portugal", rate: 23 },
  { value: "Autriche", rate: 20 },
  { value: "Irlande", rate: 23 },
  { value: "Suisse", rate: 8.1 },
  { value: "Royaume-Uni", rate: 20 },
  { value: "Pologne", rate: 23 },
  { value: "Suède", rate: 25 },
  { value: "Danemark", rate: 25 },
  { value: "Finlande", rate: 25.5 },
  { value: "Grèce", rate: 24 },
  { value: "Roumanie", rate: 19 },
  { value: "République tchèque", rate: 21 },
  { value: "Hongrie", rate: 27 },
];

const getVatRate = (country: string): string => {
  const found = countries.find(c => c.value === country);
  return found ? String(found.rate) : "20";
};

const emptyAddress = { label: "", address_line1: "", city: "", postal_code: "", country: "Belgique", phone: "", contact_name: "", contact_email: "" };

/* ─── Country select component ────────────────────────────────────────── */
const CountrySelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger>
      <SelectValue placeholder="Sélectionner un pays" />
    </SelectTrigger>
    <SelectContent className="bg-popover z-50">
      {countries.map(c => (
        <SelectItem key={c.value} value={c.value}>
          {c.value} ({c.rate}%)
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

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
  const [budget, setBudget] = useState({ amount: "0", period: "monthly" as string });
  const [vatStatus, setVatStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [vatCompanyName, setVatCompanyName] = useState("");

  const validateVat = async () => {
    if (!form.vat.trim()) return;
    setVatStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("validate-vat", {
        body: { vatNumber: form.vat },
      });
      if (error) throw error;
      if (data.valid) {
        setVatStatus("valid");
        setVatCompanyName(data.name || "");
        // Auto-fill name if empty
        if (!form.name && data.name) {
          setForm(f => ({ ...f, name: data.name }));
        }
        // Auto-fill billing address
        if (data.country) {
          const newCountry = data.country;
          setBillingAddr(a => ({
            ...a,
            address_line1: data.address || a.address_line1,
            city: data.city || a.city,
            country: newCountry || a.country,
          }));
          setForm(f => ({ ...f, vat_rate: getVatRate(newCountry) }));
        }
        toast.success("Numéro de TVA valide");
      } else {
        setVatStatus("invalid");
        toast.error(data.error || "Numéro de TVA invalide");
      }
    } catch {
      setVatStatus("invalid");
      toast.error("Erreur lors de la vérification");
    }
  };

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

  const { data: entityBudgets } = useQuery({
    queryKey: ["entity-budgets", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("budgets").select("*").eq("entity_id", id!);
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
        setBillingAddr({ label: billing.label, address_line1: billing.address_line1, city: billing.city, postal_code: (billing as any).postal_code || "", country: billing.country, phone: (billing as any).phone || "", contact_name: (billing as any).contact_name || "", contact_email: (billing as any).contact_email || "" });
      }
      if (shipping && billing && (shipping.address_line1 !== billing.address_line1 || shipping.city !== billing.city || shipping.country !== billing.country)) {
        setSameAddress(false);
        setShippingAddr({ label: shipping.label, address_line1: shipping.address_line1, city: shipping.city, postal_code: (shipping as any).postal_code || "", country: shipping.country, phone: (shipping as any).phone || "", contact_name: (shipping as any).contact_name || "", contact_email: (billing as any).contact_email || "" });
      } else {
        setSameAddress(true);
        setShippingAddr({ ...emptyAddress });
      }
    }
  }, [entityAddresses]);

  useEffect(() => {
    if (entityBudgets) {
      const first = entityBudgets[0];
      if (first) setBudget({ amount: String(first.amount), period: first.period });
    }
  }, [entityBudgets]);

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
        postal_code: billingAddr.postal_code,
        country: billingAddr.country || "Belgique",
        phone: billingAddr.phone,
        contact_name: billingAddr.contact_name,
        contact_email: billingAddr.contact_email,
      };
      const { error: bErr } = await supabase.from("addresses").insert(billingPayload as any);
      if (bErr) throw bErr;

      const shipData = sameAddress ? billingAddr : shippingAddr;
      const shippingPayload = {
        tenant_id: tenantId!,
        entity_id: entityId,
        type: "shipping" as const,
        label: sameAddress ? (billingAddr.label || "Livraison") : (shippingAddr.label || "Livraison"),
        address_line1: shipData.address_line1,
        city: shipData.city,
        postal_code: shipData.postal_code,
        country: shipData.country || "Belgique",
        phone: shipData.phone,
        contact_name: shipData.contact_name,
        contact_email: shipData.contact_email,
      };
      const { error: sErr } = await supabase.from("addresses").insert(shippingPayload as any);
      if (sErr) throw sErr;

      // ── Save single entity budget (upsert) ──
      const amount = parseFloat(budget.amount) || 0;
      const existing = entityBudgets?.[0];
      if (existing) {
        const { error } = await supabase.from("budgets").update({ amount, period: budget.period as any }).eq("id", existing.id);
        if (error) throw error;
      } else if (amount > 0) {
        const { error } = await supabase.from("budgets").insert({
          tenant_id: tenantId!,
          entity_id: entityId,
          store_type: "bulk" as const,
          amount,
          period: budget.period as any,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Entité modifiée" : "Entité créée");
      qc.invalidateQueries({ queryKey: ["tenant-entities"] });
      qc.invalidateQueries({ queryKey: ["entity-budgets"] });
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
        <Section icon={FileText} title="Fiscalité" description="Vérifiez le numéro de TVA pour auto-remplir les informations">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">N° de TVA</Label>
              <div className="flex gap-2 max-w-md">
                <div className="relative flex-1">
                  <Input
                    value={form.vat}
                    onChange={e => { setForm(f => ({ ...f, vat: e.target.value })); setVatStatus("idle"); }}
                    placeholder="BE0123456789"
                    className={`font-mono pr-9 ${vatStatus === "valid" ? "border-emerald-500" : vatStatus === "invalid" ? "border-destructive" : ""}`}
                  />
                  {vatStatus === "valid" && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />}
                  {vatStatus === "invalid" && <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />}
                </div>
                <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={validateVat} disabled={vatStatus === "loading" || !form.vat.trim()}>
                  {vatStatus === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Vérifier
                </Button>
              </div>
            </div>
            {vatStatus === "valid" && vatCompanyName && (
              <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 animate-fade-in">
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  ✓ Entreprise : <span className="font-semibold">{vatCompanyName}</span>
                </p>
              </div>
            )}
            {vatStatus === "invalid" && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2.5 animate-fade-in">
                <p className="text-xs text-destructive">
                  ✗ Ce numéro de TVA n'a pas pu être vérifié dans le système VIES
                </p>
              </div>
            )}
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
                <Label className="text-xs">Personne de contact</Label>
                <Input value={billingAddr.contact_name} onChange={e => setBillingAddr(a => ({ ...a, contact_name: e.target.value }))} placeholder="Jean Dupont" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Téléphone</Label>
                  <Input value={billingAddr.phone} onChange={e => setBillingAddr(a => ({ ...a, phone: e.target.value }))} placeholder="+32 2 123 45 67" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email de contact</Label>
                  <Input type="email" value={billingAddr.contact_email} onChange={e => setBillingAddr(a => ({ ...a, contact_email: e.target.value }))} placeholder="contact@entreprise.com" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Adresse</Label>
                <Input value={billingAddr.address_line1} onChange={e => setBillingAddr(a => ({ ...a, address_line1: e.target.value }))} placeholder="Rue et numéro" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Code postal</Label>
                  <Input value={billingAddr.postal_code} onChange={e => setBillingAddr(a => ({ ...a, postal_code: e.target.value }))} placeholder="1000" className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Ville</Label>
                  <Input value={billingAddr.city} onChange={e => setBillingAddr(a => ({ ...a, city: e.target.value }))} placeholder="Bruxelles" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Pays</Label>
                  <CountrySelect value={billingAddr.country} onChange={(country) => {
                    setBillingAddr(a => ({ ...a, country }));
                    setForm(f => ({ ...f, vat_rate: getVatRate(country) }));
                  }} />
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
                    <Label className="text-xs">Personne de contact</Label>
                    <Input value={shippingAddr.contact_name} onChange={e => setShippingAddr(a => ({ ...a, contact_name: e.target.value }))} placeholder="Jean Dupont" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Téléphone</Label>
                      <Input value={shippingAddr.phone} onChange={e => setShippingAddr(a => ({ ...a, phone: e.target.value }))} placeholder="+32 2 123 45 67" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Email de contact</Label>
                      <Input type="email" value={shippingAddr.contact_email} onChange={e => setShippingAddr(a => ({ ...a, contact_email: e.target.value }))} placeholder="contact@entreprise.com" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Adresse</Label>
                    <Input value={shippingAddr.address_line1} onChange={e => setShippingAddr(a => ({ ...a, address_line1: e.target.value }))} placeholder="Rue et numéro" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Code postal</Label>
                      <Input value={shippingAddr.postal_code} onChange={e => setShippingAddr(a => ({ ...a, postal_code: e.target.value }))} placeholder="1000" className="font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Ville</Label>
                      <Input value={shippingAddr.city} onChange={e => setShippingAddr(a => ({ ...a, city: e.target.value }))} placeholder="Bruxelles" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Pays</Label>
                      <CountrySelect value={shippingAddr.country} onChange={(country) => setShippingAddr(a => ({ ...a, country }))} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* ─── Budgets ────────────────────────────────────────────────── */}
        <Section icon={Wallet} title="Budget de l'entité" description="Si le budget est dépassé, les commandes nécessiteront une approbation automatique">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Montant du budget (€)</Label>
                <Input type="number" value={budget.amount} onChange={e => setBudget(b => ({ ...b, amount: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Période</Label>
                <Select value={budget.period} onValueChange={v => setBudget(b => ({ ...b, period: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                    <SelectItem value="quarterly">Trimestriel</SelectItem>
                    <SelectItem value="yearly">Annuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {entityBudgets?.[0] && (
              <p className="text-xs text-muted-foreground">
                Dépensé : {formatCurrency(Number(entityBudgets[0].spent))} / {formatCurrency(Number(entityBudgets[0].amount))}
              </p>
            )}
            <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                ⚠️ Lorsque le budget est dépassé, toutes les commandes de cette entité seront automatiquement soumises à approbation.
              </p>
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
