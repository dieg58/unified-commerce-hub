import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ArrowRight, ArrowLeft, Check, Globe, AlertCircle, Sparkles } from "lucide-react";
import { BASE_DOMAIN, getStorefrontUrl } from "@/lib/subdomain";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = ["Infos Boutique", "Branding", "Paramètres"];

/** Sanitize a name into a valid URL slug */
const toSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

export default function CreateTenantWizard({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [extracting, setExtracting] = useState(false);

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
    setSlugManuallyEdited(false);
    setSlugAvailable(null);
    setPrimaryColor("#0ea5e9");
    setAccentColor("#10b981");
    setHeadTitle("");
    setLogoUrl("");
    setDefaultEntities("HQ");
    setWebsiteUrl("");
    setExtracting(false);
  };

  /** Check if slug is available */
  const checkSlugAvailability = async (s: string) => {
    if (s.length < 2) { setSlugAvailable(null); return; }
    setCheckingSlug(true);
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("id")
        .eq("slug", s)
        .maybeSingle();
      if (error) throw error;
      setSlugAvailable(!data);
    } catch {
      setSlugAvailable(null);
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugManuallyEdited) {
      const newSlug = toSlug(value);
      setSlug(newSlug);
      checkSlugAvailability(newSlug);
    }
  };

  const handleSlugChange = (value: string) => {
    const sanitized = value.replace(/[^a-z0-9-]/g, "");
    setSlug(sanitized);
    setSlugManuallyEdited(true);
    setSlugAvailable(null);
    checkSlugAvailability(sanitized);
  };

  /** Extract branding from website URL */
  const handleExtractBranding = async () => {
    if (!websiteUrl.trim()) return;
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-branding", {
        body: { url: websiteUrl.trim() },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Extraction échouée");

      const b = data.branding;
      if (b.primaryColor) setPrimaryColor(b.primaryColor);
      if (b.accentColor) setAccentColor(b.accentColor);
      if (b.logo) setLogoUrl(b.logo);
      if (b.title && !headTitle) setHeadTitle(b.title);

      toast.success("Branding extrait automatiquement !", {
        description: "Couleurs, logo et titre pré-remplis. Vous pouvez les ajuster à l'étape suivante.",
      });
    } catch (err: any) {
      console.error("Branding extraction error:", err);
      toast.error("Impossible d'extraire le branding", {
        description: err.message || "Vérifiez l'URL et réessayez.",
      });
    } finally {
      setExtracting(false);
    }
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

      toast.success(`Boutique "${tenant.name}" créée — accessible sur ${getStorefrontUrl(tenant.slug)}`);
      qc.invalidateQueries({ queryKey: ["tenants"] });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  };

  const canNext = () => {
    if (step === 0) return name.trim().length > 0 && slug.trim().length >= 2 && slugAvailable === true;
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
        <div className="space-y-4 min-h-[200px]">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>Nom de la boutique *</Label>
                <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Acme Corporation" maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Sous-domaine *</Label>
                <div className="flex items-center gap-0">
                  <Input
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="acme-corp"
                    maxLength={50}
                    className={`rounded-r-none font-mono text-sm ${
                      slugAvailable === true ? "border-emerald-500 focus-visible:ring-emerald-500" :
                      slugAvailable === false ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                  />
                  <div className="h-10 px-3 rounded-r-md border border-l-0 border-input bg-muted flex items-center">
                    <span className="text-xs text-muted-foreground font-mono">.{BASE_DOMAIN}</span>
                  </div>
                </div>
                {/* Status indicator */}
                <div className="flex items-center gap-1.5 min-h-[20px]">
                  {checkingSlug && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Vérification...
                    </span>
                  )}
                  {!checkingSlug && slugAvailable === true && slug.length >= 2 && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3" /> {slug}.{BASE_DOMAIN} est disponible
                    </span>
                  )}
                  {!checkingSlug && slugAvailable === false && (
                    <span className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Ce sous-domaine est déjà pris
                    </span>
                  )}
                </div>
              </div>

              {/* Website URL for branding extraction */}
              <div className="space-y-2">
                <Label>Site web du client <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://www.acme.com"
                    maxLength={500}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExtractBranding}
                    disabled={!websiteUrl.trim() || extracting}
                    className="shrink-0 gap-1.5"
                  >
                    {extracting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {extracting ? "Analyse..." : "Auto-remplir"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Renseignez le site web pour extraire automatiquement les couleurs, logo et titre de la marque.
                </p>
              </div>

              {/* URL Preview */}
              {slug.length >= 2 && slugAvailable === true && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center gap-2.5 animate-fade-in">
                  <Globe className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Votre boutique sera accessible à :</p>
                    <p className="text-sm font-mono font-semibold text-foreground">{getStorefrontUrl(slug)}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Couleur principale</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer bg-transparent" />
                    <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono text-sm" maxLength={7} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Couleur d'accent</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer bg-transparent" />
                    <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="font-mono text-sm" maxLength={7} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Titre de la boutique</Label>
                <Input value={headTitle} onChange={(e) => setHeadTitle(e.target.value)} placeholder={name || "Acme Procurement"} maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." maxLength={500} />
              </div>
              {/* Branding preview */}
              <div className="rounded-lg p-4 flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
                {logoUrl && <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded object-contain bg-white/20 p-0.5" />}
                <div>
                  <p className="text-white font-bold text-sm">{headTitle || name || "Aperçu"}</p>
                  <p className="text-white/70 text-xs mt-0.5">{slug}.{BASE_DOMAIN}</p>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Entités par défaut (séparées par des virgules)</Label>
                <Input value={defaultEntities} onChange={(e) => setDefaultEntities(e.target.value)} placeholder="HQ, Succursale Ouest" maxLength={200} />
                <p className="text-xs text-muted-foreground">
                  Chaque entité aura un budget mensuel par défaut (montant = 0).
                </p>
              </div>
              <div className="rounded-lg border border-border p-4 bg-muted/30 space-y-3">
                <p className="text-sm font-semibold text-foreground">Récapitulatif</p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Boutique</span>
                    <span className="font-medium text-foreground">{name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sous-domaine</span>
                    <span className="font-mono text-foreground">{slug}.{BASE_DOMAIN}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Branding</span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: primaryColor }} />
                      <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: accentColor }} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Entités</span>
                    <span className="text-foreground">{defaultEntities.split(",").filter(e => e.trim()).length} à créer</span>
                  </div>
                </div>
                <div className="rounded-md bg-primary/5 border border-primary/10 px-3 py-2 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-xs font-medium text-foreground">
                    Accessible automatiquement sur <span className="font-mono">{getStorefrontUrl(slug)}</span>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : onOpenChange(false)} disabled={saving}>
            {step > 0 ? <><ArrowLeft className="w-4 h-4 mr-1" /> Retour</> : "Annuler"}
          </Button>
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
              Suivant <ArrowRight className="w-4 h-4 ml-1" />
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
