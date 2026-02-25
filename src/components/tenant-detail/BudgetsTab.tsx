import { useState } from "react";
import { SectionHeader } from "@/components/DashboardWidgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Pencil, Save, X, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";

export function BudgetsTab({ tenantId, budgets, entities }: { tenantId: string; budgets: any[]; entities: any[] }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const updateBudget = useMutation({
    mutationFn: async ({ budgetId, amount }: { budgetId: string; amount: number }) => {
      const { error } = await supabase.from("budgets").update({ amount }).eq("id", budgetId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Budget mis à jour");
      qc.invalidateQueries({ queryKey: ["budgets", tenantId] });
      setEditing(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="bg-card rounded-lg border border-border shadow-card">
      <div className="p-5 border-b border-border">
        <SectionHeader title={`Budgets (${budgets.length})`} />
      </div>
      {!budgets.length ? (
        <p className="p-8 text-center text-sm text-muted-foreground">Aucun budget</p>
      ) : (
        <div className="divide-y divide-border">
          {budgets.map((b) => {
            const amount = Number(b.amount);
            const spent = Number(b.spent);
            const pct = amount > 0 ? Math.round((spent / amount) * 100) : 0;
            const isWarning = pct >= 80;
            const isBlocked = pct > 100;
            const isEditing = editing === b.id;
            return (
              <div key={b.id} className={`p-5 ${isBlocked ? "bg-destructive/5" : ""}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{(b.entities as any)?.name || "—"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{b.store_type} · {b.period}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="h-7 w-24 text-xs" min="0" step="0.01" />
                        <Button size="sm" className="h-7 text-xs" onClick={() => updateBudget.mutate({ budgetId: b.id, amount: parseFloat(editAmount) || 0 })}>
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isBlocked ? "text-destructive" : isWarning ? "text-warning" : "text-foreground"}`}>
                          {formatCurrency(spent)} <span className="text-muted-foreground font-normal">/ {formatCurrency(amount)}</span>
                        </p>
                        <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={() => { setEditing(b.id); setEditAmount(amount.toString()); }}>
                          <Pencil className="w-3 h-3 mr-1" /> Modifier
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={Math.min(pct, 100)} className={`h-2 flex-1 ${isBlocked ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-warning" : ""}`} />
                  <span className={`text-xs font-bold min-w-[40px] text-right ${isBlocked ? "text-destructive" : isWarning ? "text-warning" : "text-muted-foreground"}`}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
