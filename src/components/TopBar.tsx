import NotificationBell from "@/components/NotificationBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import GlobalSearch from "@/components/GlobalSearch";
import { useAuth } from "@/hooks/useAuth";

const TopBar = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  const { profile } = useAuth();
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
        <GlobalSearch />
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
