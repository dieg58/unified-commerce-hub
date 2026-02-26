import { useState, useEffect } from "react";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStorefrontUrl } from "@/lib/subdomain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Save, Loader2, Palette, Building2, Globe, Image, Upload, ShieldCheck,
  Bell, Store, Info, ExternalLink, Copy, Check, RefreshCw, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

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
      toast.success(t("tenantSettings.infoUpdated"));
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
      toast.success(t("tenantSettings.brandingUpdated"));
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
      toast.success(t("tenantSettings.logoUploaded"));
    } catch (err: any) {
      toast.error(err.message || t("common.error"));
    } finally {
      setUploading(false);
    }
  };

  const storeUrl = tenant?.slug ? getStorefrontUrl(tenant.slug) : null;
  const createdAt = tenant?.created_at ? new Date(tenant.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;

  return (
    <>
      <TopBar title={t("tenantSettings.title")} subtitle={t("tenantSettings.subtitle")} />
      <div className="p-6 max-w-3xl mx-auto space-y-5 overflow-auto pb-12">

        {/* ─── Informations générales ──────────────────────────────── */}
        <Section
          icon={Building2}
          title={t("tenantSettings.generalInfo")}
          description={t("tenantSettings.generalInfoDesc")}
          actions={
            <Button
              size="sm"
              onClick={() => updateTenant.mutate()}
              disabled={updateTenant.isPending || tenantName === tenant?.name}
              className="gap-1.5"
            >
              {updateTenant.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {t("common.save")}
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t("tenantSettings.shopName")}</Label>
                <Input value={tenantName} onChange={e => setTenantName(e.target.value)} placeholder={t("tenantSettings.shopName")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t("tenantSettings.slug")}</Label>
                <Input value={tenant?.slug || ""} disabled className="font-mono text-xs bg-muted" />
                <p className="text-[10px] text-muted-foreground">{t("tenantSettings.slugReadonly")}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: t("nav.entities"), value: stats?.entities },
                { label: t("common.users"), value: stats?.users },
                { label: t("common.products"), value: stats?.products },
                { label: t("common.orders"), value: stats?.orders },
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
          title={t("tenantSettings.brandingTitle")}
          description={t("tenantSettings.brandingDesc")}
          actions={
            <Button
              size="sm"
              onClick={() => updateBranding.mutate()}
              disabled={updateBranding.isPending}
              className="gap-1.5"
            >
              {updateBranding.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {t("common.save")}
            </Button>
          }
        >
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("tenantSettings.shopTitle")}</Label>
              <Input
                value={headTitle}
                onChange={e => setHeadTitle(e.target.value)}
                placeholder={tenant?.name || t("tenantSettings.shopName")}
              />
              <p className="text-[10px] text-muted-foreground">{t("tenantSettings.shopTitleHint")}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("tenantSettings.logo")}</Label>
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
                      {uploading ? t("common.loading") : t("tenantSettings.changeLogo")}
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                  </label>
                  <p className="text-[10px] text-muted-foreground">PNG, JPG, SVG. Max 2 MB.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t("tenantSettings.primaryColor")}</Label>
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
                <Label className="text-xs font-medium">{t("tenantSettings.accentColor")}</Label>
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

            <div
              className="rounded-lg p-4 flex items-center gap-3"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
            >
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded object-contain bg-white/20 p-0.5" />
              )}
              <div>
                <p className="text-white font-bold text-sm">{headTitle || tenant?.name || t("common.preview")}</p>
                <p className="text-white/70 text-xs mt-0.5">{t("tenantSettings.brandingPreview")}</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ─── Accès & URL ────────────────────────────────────────── */}
        <Section icon={Globe} title={t("tenantSettings.accessUrl")} description={t("tenantSettings.accessUrlDesc")}>
          <div className="space-y-1 divide-y divide-border">
            <InfoRow label={t("tenantSettings.shopId")} value={tenant?.slug} mono />
            <InfoRow label={t("tenantSettings.domain")} value={storeUrl || "—"} mono />
            <InfoRow label={t("common.status")} value={tenant?.status === "active" ? "✅ " + t("common.active") : "⏸️ " + t("common.inactive")} />
            <InfoRow label={t("common.createdOn")} value={createdAt} />
          </div>
          {tenant?.slug && (
            <div className="mt-4 rounded-md bg-muted/50 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">{t("tenantSettings.shopUrl")}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {tenant.slug}.inkoo.eu
                </p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
                <a href={storeUrl || "#"} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t("tenantSettings.open")}
                </a>
              </Button>
            </div>
          )}
        </Section>

        {/* ─── Sécurité ───────────────────────────────────────────── */}
        <Section icon={ShieldCheck} title={t("tenantSettings.security")} description={t("tenantSettings.securityDesc")}>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{t("tenantSettings.twoFactor")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("tenantSettings.twoFactorDesc")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded">{t("tenantSettings.comingSoon")}</span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{t("tenantSettings.sessionExpiry")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("tenantSettings.sessionExpiryDesc")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded">{t("tenantSettings.comingSoon")}</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ─── Notifications ──────────────────────────────────────── */}
        <Section icon={Bell} title={t("tenantSettings.notifications")} description={t("tenantSettings.notificationsDesc")}>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{t("tenantSettings.newOrder")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("tenantSettings.newOrderDesc")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded">{t("tenantSettings.comingSoon")}</span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{t("tenantSettings.budgetExceeded")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("tenantSettings.budgetExceededDesc")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded">{t("tenantSettings.comingSoon")}</span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{t("tenantSettings.approvalRequired")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("tenantSettings.approvalRequiredDesc")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded">{t("tenantSettings.comingSoon")}</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ─── Données de démonstration ─────────────────────────── */}
        <Section icon={RefreshCw} title="Produits de démonstration" description="Régénérer les 20 produits démo avec le logo de la boutique.">
          <div className="space-y-4">
            <div className="rounded-md bg-destructive/5 border border-destructive/20 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Attention : action destructive</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cette action va <strong>supprimer tous les produits existants</strong> de la boutique (y compris les commandes liées) 
                  puis recréer 20 produits de démonstration avec le logo actuel. Cette opération est irréversible.
                </p>
              </div>
            </div>
            <RegenerateDemoButton tenantId={tenantId} logoUrl={logoUrl} />
          </div>
        </Section>

        {/* ─── Informations techniques ────────────────────────────── */}
        <Section icon={Info} title={t("tenantSettings.technicalInfo")} description={t("tenantSettings.technicalInfoDesc")}>
          <div className="space-y-1 divide-y divide-border">
            <InfoRow label={t("tenantSettings.shopIdLabel")} value={tenantId} mono />
            <InfoRow label={t("tenantSettings.entitiesCount")} value={String(stats?.entities ?? "—")} />
            <InfoRow label={t("tenantSettings.usersCount")} value={String(stats?.users ?? "—")} />
            <InfoRow label={t("tenantSettings.productsCount")} value={String(stats?.products ?? "—")} />
            <InfoRow label={t("tenantSettings.ordersCount")} value={String(stats?.orders ?? "—")} />
          </div>
        </Section>
      </div>
    </>
  );
};

/* ─── Regenerate Demo Button with confirmation ───────────────────────── */
const RegenerateDemoButton = ({ tenantId, logoUrl }: { tenantId?: string | null; logoUrl: string }) => {
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const handleRegenerate = async () => {
    if (!tenantId) return;
    setLoading(true);
    toast.info("Suppression des anciens produits et régénération en cours…", {
      description: "Les packshots personnalisés seront prêts dans quelques instants.",
    });

    try {
      // Delete existing products (cascade will handle prices, variants, order_items)
      const { error: delErr } = await supabase
        .from("products")
        .delete()
        .eq("tenant_id", tenantId);
      if (delErr) throw delErr;

      // Get first entity for the tenant
      const { data: entities } = await supabase
        .from("entities")
        .select("id")
        .eq("tenant_id", tenantId)
        .limit(1);
      const entityId = entities?.[0]?.id;

      // Invoke seed function
      const { error: fnErr } = await supabase.functions.invoke("seed-demo-products", {
        body: {
          tenant_id: tenantId,
          entity_id: entityId,
          logo_url: logoUrl || null,
          app_url: "https://b2b-inkoo.lovable.app",
        },
      });
      if (fnErr) throw fnErr;

      toast.success("20 produits démo régénérés avec succès !");
      qc.invalidateQueries({ queryKey: ["tenant-products-manage"] });
      qc.invalidateQueries({ queryKey: ["tenant-settings-stats"] });
    } catch (err: any) {
      console.error("Regenerate demo error:", err);
      toast.error(err.message || "Erreur lors de la régénération");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2" disabled={loading || !tenantId}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {loading ? "Régénération en cours…" : "Régénérer les produits démo"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Régénérer les produits de démonstration ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action va <strong>supprimer définitivement tous les produits</strong> de cette boutique, 
            puis recréer 20 produits de démonstration avec le logo actuel. 
            Les commandes existantes liées à ces produits seront également impactées.
            <br /><br />
            <strong>Cette action est irréversible.</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRegenerate}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Oui, régénérer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default TenantSettings;
