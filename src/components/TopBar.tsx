import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import NotificationBell from "@/components/NotificationBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

const TopBar = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("topbar.search")}
            className="pl-9 w-64 h-9 bg-secondary border-border text-sm"
          />
        </div>
        <LanguageSwitcher />
        <NotificationBell />
        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
          {initials}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
