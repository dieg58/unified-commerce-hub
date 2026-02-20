import { useState, useEffect } from "react";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Save, Loader2, Palette, Building2, Globe, Image, Upload, ShieldCheck,
  Bell, Store, Info, ExternalLink, Copy, Check
} from "lucide-react";
import { toast } from "sonner";

/* ─── Section wrapper ─────────────────────────────────────────────────── */
const Section = ({
  icon: Icon,
  title,
  description,
  children,
  actions,
}: {
  icon: any;
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) => (
  <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
    <div className="p-5 border-b border-border flex items-start justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-md bg-primary/5 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {actions}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

/* ─── Info row ─────────────────────────────────────────────────── */
const InfoRow = ({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium text-foreground ${mono ? "font-mono text-xs" : ""}`}>
          {value || "—"}
        </span>
        {value && (
          <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
};

const TenantSettings = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

  /* ── Fetch tenant + branding ──────────────────────────────────── */
  const { data: tenant } = useQuery({
    queryKey: ["tenant-settings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, tenant_branding(*)")
        .eq("id", tenantId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const branding = tenant?.tenant_branding as any;

  /* ── Local state ──────────────────────────────────────────────── */
  const [tenantName, setTenantName] = useState("");
  const [headTitle, setHeadTitle] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0ea5e9");
  const [accentColor, setAccentColor] = useState("#10b981");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  /* ── Initialize from fetched data ──────────────────────────────── */
  useEffect(() => {
    if (tenant) {
      setTenantName(tenant.name || "");
    }
    if (branding) {
      setHeadTitle(branding.head_title || "");
      setPrimaryColor(branding.primary_color || "#0ea5e9");
      setAccentColor(branding.accent_color || "#10b981");
      setLogoUrl(branding.logo_url || "");
      setFaviconUrl(branding.favicon_url || "");
    }
  }, [tenant, branding]);

  /* ── Stats ──────────────────────────────────────────────────────── */
  const { data: stats } = useQuery({
    queryKey: ["tenant-settings-stats", tenantId],
    queryFn: async () => {
      const [entitiesRes, usersRes, productsRes, ordersRes] = await Promise.all([
        supabase.from("entities").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId!),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId!),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId!),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId!),
      ]);
      return {
        entities: entitiesRes.count || 0,
        users: usersRes.count || 0,
        products: productsRes.count || 0,
        orders: ordersRes.count || 0,
      };
    },
    enabled: !!tenantId,
  });

  /* ── Save general info ─────────────────────────────────────────── */
  const updateTenant = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenants")
        .update({ name: tenantName.trim() })
        .eq("id", tenantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Informations mises à jour");
      qc.invalidateQueries({ queryKey: ["tenant-settings"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  /* ── Save branding ─────────────────────────────────────────────── */
  const updateBranding = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenant_branding")
        .update({
          head_title: headTitle.trim() || null,
          primary_color: primaryColor,
          accent_color: accentColor,
          logo_url: logoUrl.trim() || null,
          favicon_url: faviconUrl.trim() || null,
        })
        .eq("tenant_id", tenantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Branding mis à jour");
      qc.invalidateQueries({ queryKey: ["tenant-settings"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  /* ── Upload logo ───────────────────────────────────────────────── */
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${tenantId}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
      setLogoUrl(publicUrl);
      toast.success("Logo uploadé");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const storeUrl = tenant?.slug ? `${window.location.origin}` : null;
  const createdAt = tenant?.created_at ? new Date(tenant.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;

  return (
    <>
      <TopBar title="Paramètres" subtitle="Configuration et personnalisation de votre boutique" />
      <div className="p-6 max-w-3xl mx-auto space-y-5 overflow-auto pb-12">

        {/* ─── Informations générales ──────────────────────────────── */}
        <Section
          icon={Building2}
          title="Informations générales"
          description="Nom et identifiant de votre boutique"
          actions={
            <Button
              size="sm"
              onClick={() => updateTenant.mutate()}
              disabled={updateTenant.isPending || tenantName === tenant?.name}
              className="gap-1.5"
            >
              {updateTenant.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Enregistrer
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nom de la boutique</Label>
                <Input value={tenantName} onChange={e => setTenantName(e.target.value)} placeholder="Ma boutique" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Slug (identifiant URL)</Label>
                <Input value={tenant?.slug || ""} disabled className="font-mono text-xs bg-muted" />
                <p className="text-[10px] text-muted-foreground">L'identifiant ne peut pas être modifié</p>
              </div>
            </div>

            <Separator />

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Entités", value: stats?.entities },
                { label: "Utilisateurs", value: stats?.users },
                { label: "Produits", value: stats?.products },
                { label: "Commandes", value: stats?.orders },
              ].map(s => (
                <div key={s.label} className="rounded-md bg-muted/50 px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-foreground">{s.value ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ─── Branding & Apparence ───────────────────────────────── */}
        <Section
          icon={Palette}
          title="Branding & Apparence"
          description="Logo, couleurs et titre affichés dans la boutique"
          actions={
            <Button
              size="sm"
              onClick={() => updateBranding.mutate()}
              disabled={updateBranding.isPending}
              className="gap-1.5"
            >
              {updateBranding.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Enregistrer
            </Button>
          }
        >
          <div className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Titre de la boutique</Label>
              <Input
                value={headTitle}
                onChange={e => setHeadTitle(e.target.value)}
                placeholder={tenant?.name || "Ma boutique"}
              />
              <p className="text-[10px] text-muted-foreground">Affiché dans l'onglet du navigateur</p>
            </div>

            {/* Logo upload */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Logo</Label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Image className="w-6 h-6 text-muted-foreground/40" />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="cursor-pointer">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {uploading ? "Upload..." : "Changer le logo"}
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                  </label>
                  <p className="text-[10px] text-muted-foreground">PNG, JPG ou SVG. Max 2 Mo.</p>
                </div>
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Couleur principale</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-md border border-border cursor-pointer bg-transparent"
                  />
                  <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="flex-1 font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Couleur d'accent</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-md border border-border cursor-pointer bg-transparent"
                  />
                  <Input value={accentColor} onChange={e => setAccentColor(e.target.value)} className="flex-1 font-mono text-xs" />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div
              className="rounded-lg p-4 flex items-center gap-3"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
            >
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded object-contain bg-white/20 p-0.5" />
              )}
              <div>
                <p className="text-white font-bold text-sm">{headTitle || tenant?.name || "Aperçu"}</p>
                <p className="text-white/70 text-xs mt-0.5">Aperçu du branding de votre boutique</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ─── Accès & URL ────────────────────────────────────────── */}
        <Section icon={Globe} title="Accès & URL" description="Liens d'accès à votre boutique">
          <div className="space-y-1 divide-y divide-border">
            <InfoRow label="Identifiant boutique" value={tenant?.slug} mono />
            <InfoRow label="Statut" value={tenant?.status === "active" ? "✅ Active" : "⏸️ Inactive"} />
            <InfoRow label="Créée le" value={createdAt} />
          </div>
          {tenant?.slug && (
            <div className="mt-4 rounded-md bg-muted/50 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">URL de la boutique</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {tenant.slug}.votredomaine.com
                </p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
                <a href={storeUrl || "#"} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ouvrir
                </a>
              </Button>
            </div>
          )}
        </Section>

        {/* ─── Sécurité ───────────────────────────────────────────── */}
        <Section icon={ShieldCheck} title="Sécurité" description="Paramètres de sécurité de votre espace">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Authentification à deux facteurs</p>
                <p className="text-xs text-muted-foreground mt-0.5">Ajouter une couche de sécurité supplémentaire pour les utilisateurs</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded">Bientôt</span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Expiration de session</p>
                <p className="text-xs text-muted-foreground mt-0.5">Durée maximale d'inactivité avant déconnexion automatique</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded">Bientôt</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ─── Notifications ──────────────────────────────────────── */}
        <Section icon={Bell} title="Notifications" description="Gérer les notifications de votre boutique">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Nouvelle commande</p>
                <p className="text-xs text-muted-foreground mt-0.5">Recevoir un email à chaque nouvelle commande</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded">Bientôt</span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Dépassement de budget</p>
                <p className="text-xs text-muted-foreground mt-0.5">Alerte lorsqu'une entité dépasse son budget</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded">Bientôt</span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Approbation requise</p>
                <p className="text-xs text-muted-foreground mt-0.5">Notification lorsqu'une commande nécessite une approbation</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded">Bientôt</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ─── Informations techniques ────────────────────────────── */}
        <Section icon={Info} title="Informations techniques" description="Détails techniques de votre espace">
          <div className="space-y-1 divide-y divide-border">
            <InfoRow label="ID Boutique" value={tenantId} mono />
            <InfoRow label="Nombre d'entités" value={String(stats?.entities ?? "—")} />
            <InfoRow label="Nombre d'utilisateurs" value={String(stats?.users ?? "—")} />
            <InfoRow label="Nombre de produits" value={String(stats?.products ?? "—")} />
            <InfoRow label="Commandes totales" value={String(stats?.orders ?? "—")} />
          </div>
        </Section>
      </div>
    </>
  );
};

export default TenantSettings;
