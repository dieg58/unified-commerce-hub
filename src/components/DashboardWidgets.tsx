import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const StatCard = ({
  label,
  value,
  change,
  icon,
  delay = 0,
}: {
  label: string;
  value: string;
  change?: string;
  icon: ReactNode;
  delay?: number;
}) => (
  <div
    className="bg-card rounded-lg border border-border p-5 shadow-card hover:shadow-card-hover transition-shadow animate-fade-in"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-muted-foreground font-medium">{label}</span>
      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
        {icon}
      </div>
    </div>
    <div className="text-2xl font-bold text-foreground">{value}</div>
    {change && (
      <p className="text-xs text-success font-medium mt-1">{change}</p>
    )}
  </div>
);

export const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    active: "bg-success/10 text-success border-success/20",
    trial: "bg-warning/10 text-warning border-warning/20",
    suspended: "bg-destructive/10 text-destructive border-destructive/20",
    inactive: "bg-muted text-muted-foreground border-border",
    pending: "bg-warning/10 text-warning border-warning/20",
    approved: "bg-primary/10 text-primary border-primary/20",
    rejected: "bg-destructive/10 text-destructive border-destructive/20",
    processing: "bg-primary/10 text-primary border-primary/20",
    shipped: "bg-accent/10 text-accent border-accent/20",
    delivered: "bg-success/10 text-success border-success/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize",
        colors[status] || "bg-muted text-muted-foreground border-border"
      )}
    >
      {status}
    </span>
  );
};

export const SectionHeader = ({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) => (
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-base font-semibold text-foreground">{title}</h2>
    {action}
  </div>
);
