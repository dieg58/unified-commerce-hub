import TopBar from "@/components/TopBar";
import DemoProductEditor from "@/components/DemoProductEditor";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Simple SVG rectangle with "LOGO" text as placeholder
const PLACEHOLDER_LOGO = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><rect width="120" height="60" rx="4" fill="none" stroke="%239ca3af" stroke-width="1.5" stroke-dasharray="4 2"/><text x="60" y="35" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="600" fill="%236b7280">LOGO</text></svg>')}`;

const DemoProducts = () => {
  const [previewTenantId, setPreviewTenantId] = useState<string>("");

  const { data: tenants } = useQuery({
    queryKey: ["tenants-for-preview"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("id, name, tenant_branding(logo_url)").order("name");
      if (error) throw error;
      return data;
    },
  });

  const selectedTenant = tenants?.find((t) => t.id === previewTenantId);
  const tenantLogo = (selectedTenant?.tenant_branding as any)?.logo_url || null;
  const logoUrl = tenantLogo || PLACEHOLDER_LOGO;

  return (
    <>
      <TopBar title="Produits Démo" subtitle="Templates globaux de marquage pour les boutiques de démonstration" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Templates de marquage</h3>
              <p className="text-xs text-muted-foreground">
                Sélectionnez des produits du catalogue global et définissez la zone de marquage. Ces templates sont appliqués à toutes les nouvelles boutiques.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Prévisualiser avec :</Label>
              <Select value={previewTenantId} onValueChange={setPreviewTenantId}>
                <SelectTrigger className="w-48 h-8 text-xs">
                  <SelectValue placeholder="Choisir une boutique" />
                </SelectTrigger>
                <SelectContent>
                  {tenants?.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DemoProductEditor previewLogoUrl={logoUrl} />
        </div>
      </div>
    </>
  );
};

export default DemoProducts;
