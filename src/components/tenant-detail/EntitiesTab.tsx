import { SectionHeader } from "@/components/DashboardWidgets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function EntitiesTab({ tenantId, entities }: { tenantId: string; entities: any[] }) {
  const { t } = useTranslation();
  return (
    <div className="bg-card rounded-lg border border-border shadow-card">
      <div className="p-5 border-b border-border"><SectionHeader title={`${t("tenantDetail.entities")} (${entities.length})`} /></div>
      {!entities.length ? (
        <div className="p-8 text-center"><Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">{t("tenantDetail.noEntity")}</p></div>
      ) : (
        <Table><TableHeader><TableRow>
          <TableHead className="text-xs">{t("common.name")}</TableHead><TableHead className="text-xs">Code</TableHead>
          <TableHead className="text-xs">{t("tenantDetail.vat")}</TableHead><TableHead className="text-xs">{t("tenantDetail.vatRate")}</TableHead>
          <TableHead className="text-xs">{t("tenantDetail.approvalRequired")}</TableHead><TableHead className="text-xs">{t("tenantDetail.paymentOnOrder")}</TableHead>
        </TableRow></TableHeader><TableBody>
          {entities.map((e) => (
            <TableRow key={e.id} className="text-sm">
              <TableCell className="font-medium">{e.name}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{e.code}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{e.vat || "—"}</TableCell>
              <TableCell>{e.vat_rate}%</TableCell>
              <TableCell><Badge variant="outline" className={`text-[10px] ${e.requires_approval ? "bg-warning/10 text-warning" : "bg-muted"}`}>{e.requires_approval ? t("common.yes") : t("common.no")}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={`text-[10px] ${e.payment_on_order ? "bg-primary/10 text-primary" : "bg-muted"}`}>{e.payment_on_order ? t("tenantDetail.paymentOnOrder") : t("tenantDetail.paymentOnInvoice")}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      )}
    </div>
  );
}
