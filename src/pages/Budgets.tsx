import TopBar from "@/components/TopBar";
import { StatCard, SectionHeader } from "@/components/DashboardWidgets";
import { Wallet, TrendingDown, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Budgets = () => {
  const { data: entities, isLoading } = useQuery({
    queryKey: ["entities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("*, tenants(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalBudget = entities?.reduce((s, b) => s + Number(b.budget), 0) || 0;
  const totalUsed = entities?.reduce((s, b) => s + Number(b.budget_used), 0) || 0;
  const overBudget = entities?.filter((b) => Number(b.budget) > 0 && Number(b.budget_used) / Number(b.budget) > 0.9) || [];
  const utilization = totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0;

  if (isLoading) {
    return (
      <>
        <TopBar title="Budgets" subtitle="Entity budget allocation & tracking" />
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Budgets" subtitle="Entity budget allocation & tracking" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Allocated" value={formatCurrency(totalBudget)} icon={<Wallet className="w-4 h-4 text-primary" />} delay={0} />
          <StatCard label="Total Spent" value={formatCurrency(totalUsed)} icon={<TrendingDown className="w-4 h-4 text-primary" />} delay={50} />
          <StatCard label="Near Limit" value={overBudget.length.toString()} icon={<AlertTriangle className="w-4 h-4 text-warning" />} delay={100} />
          <StatCard label="Utilization" value={`${utilization}%`} icon={<CheckCircle className="w-4 h-4 text-success" />} delay={150} />
        </div>

        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in" style={{ animationDelay: "200ms" }}>
          <div className="p-5 border-b border-border">
            <SectionHeader title="Entity Budgets" />
          </div>
          {!entities?.length ? (
            <p className="p-12 text-center text-sm text-muted-foreground">No entities with budgets yet</p>
          ) : (
            <div className="divide-y divide-border">
              {entities.map((b, i) => {
                const budget = Number(b.budget);
                const used = Number(b.budget_used);
                const pct = budget > 0 ? Math.round((used / budget) * 100) : 0;
                const isWarning = pct > 90;
                const tenant = b.tenants as any;
                return (
                  <div key={b.id} className="p-5 animate-fade-in" style={{ animationDelay: `${(i + 4) * 50}ms` }}>
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="text-sm font-medium text-foreground">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{tenant?.name || "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(used)}</p>
                        <p className="text-xs text-muted-foreground">of {formatCurrency(budget)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className={`text-xs font-medium min-w-[36px] text-right ${isWarning ? "text-warning" : "text-muted-foreground"}`}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Budgets;
