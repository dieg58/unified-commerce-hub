import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ArrowRight, ArrowLeft, Check } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = ["Infos Boutique", "Branding", "Paramètres"];

export default function CreateTenantWizard({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  // Step 2
  const [primaryColor, setPrimaryColor] = useState("#0ea5e9");
  const [accentColor, setAccentColor] = useState("#10b981");
  const [headTitle, setHeadTitle] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // Step 3
  const [defaultEntities, setDefaultEntities] = useState("HQ");

  const reset = () => {
    setStep(0);
    setName("");
    setSlug("");
    setPrimaryColor("#0ea5e9");
    setAccentColor("#10b981");
    setHeadTitle("");
    setLogoUrl("");
    setDefaultEntities("HQ");
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      // 1. Create tenant
      const { data: tenant, error: tErr } = await supabase
        .from("tenants")
        .insert({ name: name.trim(), slug: slug.trim().toLowerCase() })
        .select()
        .single();
      if (tErr) throw tErr;

      // 2. Create branding
      const { error: bErr } = await supabase.from("tenant_branding").insert({
        tenant_id: tenant.id,
        primary_color: primaryColor,
        accent_color: accentColor,
        head_title: headTitle || null,
        logo_url: logoUrl || null,
      });
      if (bErr) throw bErr;

      // 3. Create default entities + budget placeholders
      const entityNames = defaultEntities.split(",").map((e) => e.trim()).filter(Boolean);
      for (const eName of entityNames) {
        const code = eName.toUpperCase().replace(/\s+/g, "-").slice(0, 10);
        const { data: entity, error: eErr } = await supabase
          .from("entities")
          .insert({ tenant_id: tenant.id, name: eName, code })
          .select()
          .single();
        if (eErr) throw eErr;

        // Create budget placeholders for each store type
        const budgets = (["bulk", "staff"] as const).map((st) => ({
          tenant_id: tenant.id,
          entity_id: entity.id,
          store_type: st,
          period: "monthly" as const,
          amount: 0,
        }));
        const { error: budErr } = await supabase.from("budgets").insert(budgets);
        if (budErr) throw budErr;
      }

      toast.success(`Boutique "${tenant.name}" créée avec succès`);
      qc.invalidateQueries({ queryKey: ["tenants"] });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create tenant");
    } finally {
      setSaving(false);
    }
  };

  const canNext = () => {
    if (step === 0) return name.trim().length > 0 && slug.trim().length > 0;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle Boutique</DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-4">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${i <= step ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs font-medium ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="space-y-4 min-h-[160px]">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>Nom de la boutique *</Label>
                <Input value={name} onChange={(e) => { setName(e.target.value); if (!slug || slug === name.toLowerCase().replace(/\s+/g, "-")) setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-")); }} placeholder="Acme Corporation" maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/g, ""))} placeholder="acme-corp" maxLength={50} />
                <p className="text-xs text-muted-foreground">URL-safe identifier. Lowercase, numbers, hyphens only.</p>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                    <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono text-sm" maxLength={7} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                    <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="font-mono text-sm" maxLength={7} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Head Title</Label>
                <Input value={headTitle} onChange={(e) => setHeadTitle(e.target.value)} placeholder="Acme Procurement" maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." maxLength={500} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Default Entities (comma-separated)</Label>
                <Input value={defaultEntities} onChange={(e) => setDefaultEntities(e.target.value)} placeholder="HQ, West Branch" maxLength={200} />
                <p className="text-xs text-muted-foreground">
                  Each entity will get monthly budget placeholders for bulk & staff stores (amount = 0).
                </p>
              </div>
              <div className="rounded-lg border border-border p-4 bg-muted/30">
                <p className="text-sm font-medium text-foreground mb-2">Summary</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Tenant: <strong className="text-foreground">{name}</strong> ({slug})</li>
                  <li>Branding: <span style={{ color: primaryColor }}>●</span> {primaryColor} / <span style={{ color: accentColor }}>●</span> {accentColor}</li>
                  <li>Entities: {defaultEntities.split(",").filter(e => e.trim()).length} to be created</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : onOpenChange(false)} disabled={saving}>
            {step > 0 ? <><ArrowLeft className="w-4 h-4 mr-1" /> Back</> : "Cancel"}
          </Button>
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={saving || !canNext()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
              Créer la Boutique
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
