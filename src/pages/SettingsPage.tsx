import TopBar from "@/components/TopBar";
import { SectionHeader } from "@/components/DashboardWidgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const SettingsPage = () => {
  return (
    <>
      <TopBar title="Settings" subtitle="Platform configuration" />
      <div className="p-6 space-y-6 overflow-auto max-w-2xl">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in p-6 space-y-6">
          <SectionHeader title="Platform Settings" />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Platform Name</Label>
              <Input defaultValue="CommercePro" className="h-9" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Support Email</Label>
              <Input defaultValue="support@commercepro.com" className="h-9" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Default Currency</Label>
              <Input defaultValue="USD" className="h-9" />
            </div>
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button size="sm">Save Changes</Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
