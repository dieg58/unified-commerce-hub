import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import TopBar from "@/components/TopBar";
import { SectionHeader } from "@/components/DashboardWidgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Globe, Mail, Settings, Shield, Save, Loader2, ExternalLink, Copy, Check, Pencil, Eye } from "lucide-react";
import { toast } from "sonner";

const SettingsPage = () => {
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editTemplate, setEditTemplate] = useState<any>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const qc = useQueryClient();

  // General
  const [platformName, setPlatformName] = useState("Inkoo B2B");
  const [supportEmail, setSupportEmail] = useState("support@b2b-inkoo.com");
  const [defaultCurrency, setDefaultCurrency] = useState("EUR");
  const [defaultLang, setDefaultLang] = useState("fr");

  // Domain
  const [customDomain, setCustomDomain] = useState("b2b-inkoo.com");

  // Email
  const [senderName, setSenderName] = useState("Inkoo B2B");
  const [senderEmail, setSenderEmail] = useState("noreply@b2b-inkoo.com");
  const [welcomeEnabled, setWelcomeEnabled] = useState(true);
  const [orderNotif, setOrderNotif] = useState(true);
  const [budgetAlert, setBudgetAlert] = useState(true);

  // Security
  const [enforce2FA, setEnforce2FA] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("480");
  const [ipWhitelist, setIpWhitelist] = useState("");

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast.success("Paramètres enregistrés");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <TopBar title="Paramètres" subtitle="Configuration de la plateforme" />
      <div className="p-6 overflow-auto">
        <Tabs defaultValue="general" className="max-w-3xl">
          <TabsList className="mb-6">
            <TabsTrigger value="general" className="gap-1.5">
              <Settings className="w-4 h-4" /> Général
            </TabsTrigger>
            <TabsTrigger value="domain" className="gap-1.5">
              <Globe className="w-4 h-4" /> Domaine
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5">
              <Mail className="w-4 h-4" /> Emails
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5">
              <Shield className="w-4 h-4" /> Sécurité
            </TabsTrigger>
          </TabsList>

          {/* GENERAL */}
          <TabsContent value="general">
            <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in p-6 space-y-6">
              <SectionHeader title="Paramètres généraux" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nom de la plateforme</Label>
                  <Input value={platformName} onChange={(e) => setPlatformName(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label>Email de support</Label>
                  <Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label>Devise par défaut</Label>
                  <Input value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)} className="h-9" placeholder="EUR" />
                </div>
                <div className="space-y-2">
                  <Label>Langue par défaut</Label>
                  <Input value={defaultLang} onChange={(e) => setDefaultLang(e.target.value)} className="h-9" placeholder="fr" />
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* DOMAIN */}
          <TabsContent value="domain">
            <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in p-6 space-y-6">
              <SectionHeader title="Gestion du domaine" />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Domaine personnalisé</Label>
                  <div className="flex gap-2">
                    <Input value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} className="h-9 flex-1" placeholder="mondomaine.com" />
                    <Button variant="outline" size="sm" className="gap-1.5 h-9">
                      <ExternalLink className="w-3.5 h-3.5" /> Vérifier
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pointez votre DNS vers notre serveur pour activer le domaine personnalisé.
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Enregistrements DNS requis</Label>
                  <div className="rounded-md bg-muted/50 border border-border p-4 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-muted-foreground">Type:</span> A &nbsp;
                        <span className="text-muted-foreground">Nom:</span> @ &nbsp;
                        <span className="text-muted-foreground">Valeur:</span> <span className="text-foreground font-medium">185.158.133.1</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard("185.158.133.1")}>
                        {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                    <Separator />
                    <div>
                      <span className="text-muted-foreground">Type:</span> CNAME &nbsp;
                      <span className="text-muted-foreground">Nom:</span> www &nbsp;
                      <span className="text-muted-foreground">Valeur:</span> <span className="text-foreground font-medium">{customDomain}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Sous-domaines boutiques</p>
                      <p className="text-xs text-muted-foreground">Chaque boutique est accessible via <code className="text-primary">[slug].{customDomain}</code></p>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Actif</span>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* EMAILS */}
          <TabsContent value="email">
            <EmailTemplatesTab
              editTemplate={editTemplate}
              setEditTemplate={setEditTemplate}
              previewHtml={previewHtml}
              setPreviewHtml={setPreviewHtml}
            />
          </TabsContent>

          {/* SECURITY */}
          <TabsContent value="security">
            <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in p-6 space-y-6">
              <SectionHeader title="Sécurité & accès" />

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Forcer l'authentification 2FA</p>
                    <p className="text-xs text-muted-foreground">Tous les utilisateurs devront configurer un second facteur</p>
                  </div>
                  <Switch checked={enforce2FA} onCheckedChange={setEnforce2FA} />
                </div>

                <div className="space-y-2">
                  <Label>Timeout de session (minutes)</Label>
                  <Input value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} className="h-9 max-w-[200px]" type="number" />
                  <p className="text-xs text-muted-foreground">Durée d'inactivité avant déconnexion automatique</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Whitelist d'adresses IP</Label>
                  <Input value={ipWhitelist} onChange={(e) => setIpWhitelist(e.target.value)} className="h-9" placeholder="Ex: 192.168.1.0/24, 10.0.0.1" />
                  <p className="text-xs text-muted-foreground">
                    Restreindre l'accès admin à certaines IP. Laissez vide pour autoriser tout.
                  </p>
                </div>
              </div>

              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default SettingsPage;

/* ─── Email Templates Management Tab ─── */
const EmailTemplatesTab = ({
  editTemplate, setEditTemplate, previewHtml, setPreviewHtml,
}: {
  editTemplate: any; setEditTemplate: (t: any) => void;
  previewHtml: string | null; setPreviewHtml: (h: string | null) => void;
}) => {
  const qc = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("*").order("event_type");
      if (error) throw error;
      return data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("email_templates").update({ enabled, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template mis à jour");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (t: { id: string; subject: string; body_html: string }) => {
      const { error } = await supabase.from("email_templates").update({
        subject: t.subject, body_html: t.body_html, updated_at: new Date().toISOString(),
      }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      setEditTemplate(null);
      toast.success("Template enregistré");
    },
  });

  const sampleVars: Record<string, string> = {
    order_ref: "A1B2C3D4",
    order_total: "149.90",
    customer_name: "Jean Dupont",
    entity_name: "Marketing",
    tenant_name: "BeVet",
    carrier: "Colissimo",
    tracking_number: "6X123456789",
    tracking_url: "https://www.laposte.fr/outils/suivre-vos-envois?code=6X123456789",
  };

  const renderPreview = (html: string) => {
    let result = html;
    for (const [key, value] of Object.entries(sampleVars)) {
      result = result.split(`{{${key}}}`).join(value);
    }
    result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, content) => {
      return sampleVars[key] ? content : "";
    });
    return result;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in p-6 space-y-6">
        <SectionHeader title="Templates de notifications email" />
        <p className="text-xs text-muted-foreground -mt-4">
          Activez/désactivez et personnalisez les emails envoyés automatiquement lors des événements de commande.
          Variables disponibles : <code className="text-primary">{"{{order_ref}}"}</code>, <code className="text-primary">{"{{customer_name}}"}</code>,
          <code className="text-primary">{"{{order_total}}"}</code>, <code className="text-primary">{"{{tenant_name}}"}</code>,
          <code className="text-primary">{"{{entity_name}}"}</code>, <code className="text-primary">{"{{carrier}}"}</code>,
          <code className="text-primary">{"{{tracking_number}}"}</code>, <code className="text-primary">{"{{tracking_url}}"}</code>
        </p>

        <div className="space-y-3">
          {templates?.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{t.label}</p>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{t.event_type}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">Objet : {t.subject}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <Button
                  variant="ghost" size="sm" className="h-8 w-8 p-0"
                  onClick={() => setPreviewHtml(renderPreview(t.body_html))}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost" size="sm" className="h-8 w-8 p-0"
                  onClick={() => setEditTemplate({ ...t })}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Switch
                  checked={t.enabled}
                  onCheckedChange={(v) => toggleMutation.mutate({ id: t.id, enabled: v })}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editTemplate} onOpenChange={(v) => { if (!v) setEditTemplate(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le template : {editTemplate?.label}</DialogTitle>
          </DialogHeader>
          {editTemplate && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Objet de l'email</Label>
                <Input
                  value={editTemplate.subject}
                  onChange={(e) => setEditTemplate({ ...editTemplate, subject: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label>Corps HTML</Label>
                <Textarea
                  value={editTemplate.body_html}
                  onChange={(e) => setEditTemplate({ ...editTemplate, body_html: e.target.value })}
                  className="min-h-[250px] font-mono text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPreviewHtml(renderPreview(editTemplate.body_html))}
                  className="gap-1.5"
                >
                  <Eye className="w-4 h-4" /> Prévisualiser
                </Button>
              </div>
              <Separator />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditTemplate(null)}>Annuler</Button>
                <Button
                  onClick={() => saveMutation.mutate(editTemplate)}
                  disabled={saveMutation.isPending}
                  className="gap-1.5"
                >
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewHtml} onOpenChange={(v) => { if (!v) setPreviewHtml(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prévisualisation</DialogTitle>
          </DialogHeader>
          {previewHtml && (
            <div
              className="border border-border rounded-lg p-6 bg-white text-foreground"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
