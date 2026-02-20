import { useState } from "react";
import TopBar from "@/components/TopBar";
import { SectionHeader } from "@/components/DashboardWidgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Mail, Settings, Shield, Save, Loader2, ExternalLink, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const SettingsPage = () => {
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

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
            <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in p-6 space-y-6">
              <SectionHeader title="Configuration des emails" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nom de l'expéditeur</Label>
                  <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label>Email de l'expéditeur</Label>
                  <Input value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} className="h-9" />
                </div>
              </div>

              <Separator />

              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">Notifications email</h4>
                <p className="text-xs text-muted-foreground">Activez ou désactivez les emails automatiques envoyés aux utilisateurs.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Email de bienvenue</p>
                    <p className="text-xs text-muted-foreground">Envoyé à chaque nouvel utilisateur inscrit</p>
                  </div>
                  <Switch checked={welcomeEnabled} onCheckedChange={setWelcomeEnabled} />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Notification de commande</p>
                    <p className="text-xs text-muted-foreground">Envoyé au gestionnaire de boutique à chaque nouvelle commande</p>
                  </div>
                  <Switch checked={orderNotif} onCheckedChange={setOrderNotif} />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Alerte budget dépassé</p>
                    <p className="text-xs text-muted-foreground">Envoyé quand un département dépasse 90% de son budget</p>
                  </div>
                  <Switch checked={budgetAlert} onCheckedChange={setBudgetAlert} />
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
