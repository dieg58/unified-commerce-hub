import { useNavigate } from "react-router-dom";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useTenantContext } from "@/hooks/useTenantContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Loader2, Pencil, Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/mock-data";

const TenantEntities = () => {
  const { profile } = useAuth();
  const { tenantId: ctxTenantId, basePath } = useTenantContext();
  const tenantId = ctxTenantId || profile?.tenant_id;
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: entities, isLoading } = useQuery({
    queryKey: ["tenant-entities", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("*").eq("tenant_id", tenantId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: budgets } = useQuery({
    queryKey: ["tenant-budgets-entities", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("budgets").select("*").eq("tenant_id", tenantId!);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const getBudgetInfo = (entityId: string) => {
    if (!budgets) return null;
    const entityBudgets = budgets.filter((b) => b.entity_id === entityId);
    if (!entityBudgets.length) return null;
    const totalAmount = entityBudgets.reduce((s, b) => s + Number(b.amount), 0);
    const totalSpent = entityBudgets.reduce((s, b) => s + Number(b.spent), 0);
    const pct = totalAmount > 0 ? Math.round((totalSpent / totalAmount) * 100) : 0;
    return { amount: totalAmount, spent: totalSpent, pct };
  };

  return (
    <>
      <TopBar title={t("tenantEntities.title")} subtitle={t("tenantEntities.subtitle")} />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> {t("tenantEntities.title")} ({entities?.length || 0})
            </h3>
            <Button size="sm" className="gap-1.5" onClick={() => navigate(`${basePath}/entities/new`)}>
              <Plus className="w-4 h-4" /> {t("common.add")}
            </Button>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !entities?.length ? (
            <p className="p-12 text-center text-sm text-muted-foreground">{t("tenantDetail.noEntity")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t("common.name")}</TableHead>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">{t("tenantDetail.vatRate")}</TableHead>
                  <TableHead className="text-xs">{t("tenantDetail.vat")}</TableHead>
                  <TableHead className="text-xs">{t("tenantDetail.approvalRequired")}</TableHead>
                  <TableHead className="text-xs">{t("tenantDetail.paymentOnOrder")}</TableHead>
                  <TableHead className="text-xs min-w-[160px]">{t("budgets.utilization")}</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entities.map(entity => {
                  const budget = getBudgetInfo(entity.id);
                  return (
                    <TableRow key={entity.id} className="text-sm cursor-pointer hover:bg-muted/50" onClick={() => navigate(`${basePath}/entities/${entity.id}`)}>
                      <TableCell className="font-medium">{entity.name}</TableCell>
                      <TableCell className="font-mono text-xs">{entity.code}</TableCell>
                      <TableCell>{entity.vat_rate}%</TableCell>
                      <TableCell className="font-mono text-xs">{entity.vat || "—"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${entity.requires_approval ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>
                          {entity.requires_approval ? t("common.yes") : t("common.no")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${entity.payment_on_order ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {entity.payment_on_order ? t("common.yes") : t("common.no")}
                        </span>
                      </TableCell>
                      <TableCell>
                        {budget ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-muted-foreground">{formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}</span>
                              <span className={`font-bold ${budget.pct > 90 ? "text-destructive" : budget.pct > 70 ? "text-warning" : "text-success"}`}>{budget.pct}%</span>
                            </div>
                            <Progress value={Math.min(budget.pct, 100)} className="h-1.5" />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); navigate(`${basePath}/entities/${entity.id}`); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
};

export default TenantEntities;
