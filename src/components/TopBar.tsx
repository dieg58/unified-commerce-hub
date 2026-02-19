import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const TopBar = ({ title, subtitle }: { title: string; subtitle?: string }) => {
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
            placeholder="Search…"
            className="pl-9 w-64 h-9 bg-secondary border-border text-sm"
          />
        </div>
        <button className="relative w-9 h-9 rounded-md flex items-center justify-center hover:bg-secondary transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
        </button>
        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
          SA
        </div>
      </div>
    </header>
  );
};

export default TopBar;
