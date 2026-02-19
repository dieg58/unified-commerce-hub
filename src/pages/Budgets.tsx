import { useState } from "react";
import TopBar from "@/components/TopBar";
import { StatCard, SectionHeader } from "@/components/DashboardWidgets";
import { Wallet, TrendingDown, AlertTriangle, CheckCircle, Loader2, Pencil, Save, X, ShieldAlert } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type BudgetRow = {
  id: string;
  amount: number;
  spent: number;
  period: string;
  store_type: string;
  entity_id: string;
  tenant_id: string;
  entities: { name: string } | null;
  tenants: { name: string } | null;
};

const Budgets = () => {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const { data: budgets, isLoading: budgetsLoading } = useQuery({
    queryKey: ["budgets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*, entities(name), tenants(name)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as BudgetRow[];
    },
  });

  const { data: orderSpending } = useQuery({
    queryKey: ["order-spending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("entity_id, store_type, total, status")
        .not("status", "eq", "rejected");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const o of data || []) {
        const key = `${o.entity_id}:${o.store_type}`;
        map[key] = (map[key] || 0) + Number(o.total);
      }
      return map;
    },
  });

  const enriched = budgets?.map((b) => {
    const key = `${b.entity_id}:${b.store_type}`;
    const computedSpent = orderSpending?.[key] || 0;
    const amount = Number(b.amount);
    const pct = amount > 0 ? Math.round((computedSpent / amount) * 100) : 0;
    return { ...b, computedSpent, pct };
  });

  const totalBudget = enriched?.reduce((s, b) => s + Number(b.amount), 0) || 0;
  const totalSpent = enriched?.reduce((s, b) => s + b.computedSpent, 0) || 0;
  const warningCount = enriched?.filter((b) => b.pct >= 80 && b.pct <= 100).length || 0;
  const blockedCount = enriched?.filter((b) => b.pct > 100).length || 0;
  const utilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const updateAmount = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { error } = await supabase.from("budgets").update({ amount }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Budget mis à jour");
      qc.invalidateQueries({ queryKey: ["budgets"] });
      setEditingId(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const syncSpent = useMutation({
    mutationFn: async () => {
      if (!enriched) return;
      for (const b of enriched) {
        if (Number(b.spent) !== b.computedSpent) {
          await supabase.from("budgets").update({ spent: b.computedSpent }).eq("id", b.id);
        }
      }
    },
    onSuccess: () => {
      toast.success("Dépenses synchronisées");
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const getStatusInfo = (pct: number) => {
    if (pct > 100) return { label: "Dépassé", color: "text-destructive", bgColor: "bg-destructive/10", progressColor: "bg-destructive" };
    if (pct >= 80) return { label: "Attention", color: "text-warning", bgColor: "bg-warning/10", progressColor: "bg-warning" };
    return { label: "OK", color: "text-success", bgColor: "bg-success/10", progressColor: "" };
  };

  if (budgetsLoading) {
    return (
      <>
        <TopBar title="Budgets" subtitle="Allocation et suivi des budgets" />
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Budgets" subtitle="Allocation et suivi des budgets par entité" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Budget total" value={formatCurrency(totalBudget)} icon={<Wallet className="w-4 h-4 text-primary" />} delay={0} />
          <StatCard label="Total dépensé" value={formatCurrency(totalSpent)} icon={<TrendingDown className="w-4 h-4 text-primary" />} delay={50} />
          <StatCard label="Alertes" value={warningCount.toString()} icon={<AlertTriangle className="w-4 h-4 text-warning" />} delay={100} />
          <StatCard
            label="Utilisation"
            value={`${utilization}%`}
            icon={blockedCount > 0 ? <ShieldAlert className="w-4 h-4 text-destructive" /> : <CheckCircle className="w-4 h-4 text-success" />}
            delay={150}
          />
        </div>

        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in" style={{ animationDelay: "200ms" }}>
          <div className="p-5 border-b border-border">
            <SectionHeader
              title="Budgets par entité"
              action={
                <Button variant="outline" size="sm" onClick={() => syncSpent.mutate()} disabled={syncSpent.isPending}>
                  {syncSpent.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Synchroniser les dépenses
                </Button>
              }
            />
          </div>
          {!enriched?.length ? (
            <p className="p-12 text-center text-sm text-muted-foreground">Aucun budget configuré</p>
          ) : (
            <div className="divide-y divide-border">
              {enriched.map((b, i) => {
                const status = getStatusInfo(b.pct);
                const isEditing = editingId === b.id;
                return (
                  <div key={b.id} className={`p-5 animate-fade-in ${b.pct > 100 ? "bg-destructive/5" : ""}`} style={{ animationDelay: `${(i + 4) * 50}ms` }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{(b.entities as any)?.name || "—"}</p>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.bgColor} ${status.color} border-transparent`}>
                              {status.label}
                            </Badge>
                            {b.pct > 100 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger><ShieldAlert className="w-4 h-4 text-destructive" /></TooltipTrigger>
                                  <TooltipContent><p className="text-xs">Budget dépassé — les commandes staff sont bloquées.</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground capitalize">
                            {(b.tenants as any)?.name || "—"} · {b.store_type} · {b.period === "monthly" ? "mensuel" : b.period === "quarterly" ? "trimestriel" : "annuel"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-28 h-8 text-sm" min={0} autoFocus />
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
                              const val = parseFloat(editAmount);
                              if (isNaN(val) || val < 0) { toast.error("Montant invalide"); return; }
                              updateAmount.mutate({ id: b.id, amount: val });
                            }} disabled={updateAmount.isPending}>
                              <Save className="w-4 h-4 text-success" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditingId(null)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className={`text-sm font-semibold ${status.color}`}>{formatCurrency(b.computedSpent)}</p>
                              <p className="text-xs text-muted-foreground">sur {formatCurrency(Number(b.amount))}</p>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditingId(b.id); setEditAmount(String(b.amount)); }}>
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 relative">
                        <Progress value={Math.min(b.pct, 100)} className={`h-2 ${b.pct > 100 ? "[&>div]:bg-destructive" : b.pct >= 80 ? "[&>div]:bg-warning" : ""}`} />
                      </div>
                      <span className={`text-xs font-bold min-w-[40px] text-right ${status.color}`}>{b.pct}%</span>
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
