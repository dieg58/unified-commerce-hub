import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  tenant_branding: any;
}

interface Props {
  tenant: TenantRow | null;
  onClose: () => void;
}

export default function EditTenantDialog({ tenant, onClose }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("info");

  // Info
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("active");

  // Branding
  const [primaryColor, setPrimaryColor] = useState("#0ea5e9");
  const [accentColor, setAccentColor] = useState("#10b981");
  const [headTitle, setHeadTitle] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    if (tenant) {
      setName(tenant.name);
      setSlug(tenant.slug);
      setStatus(tenant.status);
      const b = tenant.tenant_branding;
      setPrimaryColor(b?.primary_color || "#0ea5e9");
      setAccentColor(b?.accent_color || "#10b981");
      setHeadTitle(b?.head_title || "");
      setLogoUrl(b?.logo_url || "");
      setTab("info");
    }
  }, [tenant]);

  const handleSave = async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      const { error: tErr } = await supabase.from("tenants").update({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        status,
      }).eq("id", tenant.id);
      if (tErr) throw tErr;

      // Upsert branding
      const brandingPayload = {
        tenant_id: tenant.id,
        primary_color: primaryColor,
        accent_color: accentColor,
        head_title: headTitle || null,
        logo_url: logoUrl || null,
      };

      const { error: bErr } = await supabase.from("tenant_branding").upsert(brandingPayload, { onConflict: "tenant_id" });
      if (bErr) throw bErr;

      toast.success("Boutique mise à jour");
      qc.invalidateQueries({ queryKey: ["tenants"] });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Échec de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!tenant} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier la Boutique</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Info & Status</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nom de la boutique</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/g, ""))} maxLength={50} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="branding" className="space-y-4 mt-4">
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
              <Input value={headTitle} onChange={(e) => setHeadTitle(e.target.value)} placeholder="Displayed in browser tab" maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." maxLength={500} />
            </div>

            {/* Preview */}
            <div className="rounded-lg border border-border p-4 bg-muted/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-md flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: primaryColor + "20", color: primaryColor }}>
                {name?.charAt(0) || "?"}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: primaryColor }}>{name || "Tenant"}</p>
                <p className="text-xs" style={{ color: accentColor }}>{headTitle || slug}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
