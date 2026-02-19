import TopBar from "@/components/TopBar";
import { StatCard, SectionHeader } from "@/components/DashboardWidgets";
import { Wallet, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";
import { Progress } from "@/components/ui/progress";

const budgets = [
  { entity: "Acme HQ", tenant: "Acme Corporation", budget: 50000, used: 32400, users: 45 },
  { entity: "Acme West", tenant: "Acme Corporation", budget: 25000, used: 24100, users: 22 },
  { entity: "GlobalTech Main", tenant: "GlobalTech Industries", budget: 80000, used: 45000, users: 89 },
  { entity: "Nordic Oslo", tenant: "Nordic Supply Co", budget: 15000, used: 4200, users: 10 },
  { entity: "Meridian Central", tenant: "Meridian Group", budget: 35000, used: 28900, users: 40 },
];

const totalBudget = budgets.reduce((s, b) => s + b.budget, 0);
const totalUsed = budgets.reduce((s, b) => s + b.used, 0);
const overBudget = budgets.filter(b => (b.used / b.budget) > 0.9);

const Budgets = () => {
  return (
    <>
      <TopBar title="Budgets" subtitle="Entity budget allocation & tracking" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Allocated"
            value={formatCurrency(totalBudget)}
            icon={<Wallet className="w-4 h-4 text-primary" />}
            delay={0}
          />
          <StatCard
            label="Total Spent"
            value={formatCurrency(totalUsed)}
            icon={<TrendingDown className="w-4 h-4 text-primary" />}
            delay={50}
          />
          <StatCard
            label="Near Limit"
            value={overBudget.length.toString()}
            icon={<AlertTriangle className="w-4 h-4 text-warning" />}
            delay={100}
          />
          <StatCard
            label="Utilization"
            value={`${Math.round((totalUsed / totalBudget) * 100)}%`}
            icon={<CheckCircle className="w-4 h-4 text-success" />}
            delay={150}
          />
        </div>

        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in" style={{ animationDelay: "200ms" }}>
          <div className="p-5 border-b border-border">
            <SectionHeader title="Entity Budgets" />
          </div>
          <div className="divide-y divide-border">
            {budgets.map((b, i) => {
              const pct = Math.round((b.used / b.budget) * 100);
              const isWarning = pct > 90;
              return (
                <div key={i} className="p-5 flex items-center gap-6 animate-fade-in" style={{ animationDelay: `${(i + 4) * 50}ms` }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="text-sm font-medium text-foreground">{b.entity}</p>
                        <p className="text-xs text-muted-foreground">{b.tenant} · {b.users} users</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(b.used)}</p>
                        <p className="text-xs text-muted-foreground">of {formatCurrency(b.budget)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className={`text-xs font-medium min-w-[36px] text-right ${isWarning ? "text-warning" : "text-muted-foreground"}`}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default Budgets;
