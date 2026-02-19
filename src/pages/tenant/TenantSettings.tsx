import { useState } from "react";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Palette } from "lucide-react";
import { toast } from "sonner";

const TenantSettings = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

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

  const [headTitle, setHeadTitle] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [accentColor, setAccentColor] = useState("");

  // Initialize form when data loads
  const initialized = headTitle || primaryColor || accentColor;
  if (branding && !initialized) {
    setHeadTitle(branding.head_title || "");
    setPrimaryColor(branding.primary_color || "#0ea5e9");
    setAccentColor(branding.accent_color || "#10b981");
  }

  const updateBranding = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenant_branding")
        .update({
          head_title: headTitle.trim() || null,
          primary_color: primaryColor,
          accent_color: accentColor,
        })
        .eq("tenant_id", tenantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paramètres mis à jour");
      qc.invalidateQueries({ queryKey: ["tenant-settings"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <>
      <TopBar title="Paramètres" subtitle="Personnaliser votre boutique" />
      <div className="p-6 space-y-6 overflow-auto max-w-2xl">
        {/* Branding */}
        <div className="bg-card rounded-lg border border-border p-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-5">
            <Palette className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Branding & Apparence</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titre de la boutique</Label>
              <Input value={headTitle} onChange={(e) => setHeadTitle(e.target.value)} placeholder={tenant?.name || "Ma boutique"} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Couleur principale</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                  <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Couleur accent</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                  <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="flex-1" />
                </div>
              </div>
            </div>
            {/* Preview */}
            <div className="rounded-lg p-4" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
              <p className="text-white font-bold text-sm">Aperçu du branding</p>
              <p className="text-white/70 text-xs mt-1">{headTitle || tenant?.name}</p>
            </div>
            <Button onClick={() => updateBranding.mutate()} disabled={updateBranding.isPending} className="gap-1.5">
              {updateBranding.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </Button>
          </div>
        </div>

        {/* Tenant info (read-only) */}
        <div className="bg-card rounded-lg border border-border p-6 animate-fade-in">
          <h3 className="text-sm font-semibold text-foreground mb-4">Informations</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nom</span>
              <span className="font-medium text-foreground">{tenant?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slug</span>
              <span className="font-mono text-xs text-foreground">{tenant?.slug}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Statut</span>
              <span className="capitalize text-foreground">{tenant?.status}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TenantSettings;
