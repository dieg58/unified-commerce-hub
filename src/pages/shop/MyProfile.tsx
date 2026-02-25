import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Save, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const MyProfile = () => {
  const { profile, user } = useAuth();
  const { t } = useTranslation();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const handleSaveName = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", profile.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("profile.profileUpdated"));
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error(t("auth.passwordsNoMatch"));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t("auth.passwordMinLength"));
      return;
    }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("auth.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPw(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <div className="bg-background border-b border-border px-6 h-14 flex items-center gap-2">
        <User className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold text-foreground">{t("profile.title")}</h1>
      </div>

      <div className="p-6 max-w-2xl space-y-6">
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> {t("profile.personalInfo")}
          </h2>

          <div className="space-y-2">
            <Label className="text-xs">{t("common.email")}</Label>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{user?.email}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("auth.fullName")}</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("profile.yourName")}
              maxLength={100}
            />
          </div>

          <Button onClick={handleSaveName} disabled={saving || !fullName.trim()} className="gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t("common.save")}
          </Button>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> {t("auth.changePassword")}
          </h2>

          <div className="space-y-2">
            <Label>{t("auth.newPassword")}</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("auth.confirmPassword")}</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={changingPw || !newPassword || !confirmPassword}
            variant="outline"
            className="gap-1.5"
          >
            {changingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {t("auth.changePassword")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
