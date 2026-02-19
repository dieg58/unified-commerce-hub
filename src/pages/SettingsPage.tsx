import TopBar from "@/components/TopBar";
import { SectionHeader } from "@/components/DashboardWidgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const SettingsPage = () => {
  return (
    <>
      <TopBar title="Paramètres" subtitle="Configuration de la plateforme" />
      <div className="p-6 space-y-6 overflow-auto max-w-2xl">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in p-6 space-y-6">
          <SectionHeader title="Paramètres généraux" />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Nom de la plateforme</Label>
              <Input defaultValue="CommercePro" className="h-9" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Email de support</Label>
              <Input defaultValue="support@commercepro.com" className="h-9" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Devise par défaut</Label>
              <Input defaultValue="EUR" className="h-9" />
            </div>
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button size="sm">Enregistrer</Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
