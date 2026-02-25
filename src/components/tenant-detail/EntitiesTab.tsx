import { SectionHeader } from "@/components/DashboardWidgets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

export function EntitiesTab({ tenantId, entities }: { tenantId: string; entities: any[] }) {
  return (
    <div className="bg-card rounded-lg border border-border shadow-card">
      <div className="p-5 border-b border-border"><SectionHeader title={`Entités (${entities.length})`} /></div>
      {!entities.length ? (
        <div className="p-8 text-center"><Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">Aucune entité</p></div>
      ) : (
        <Table><TableHeader><TableRow>
          <TableHead className="text-xs">Nom</TableHead><TableHead className="text-xs">Code</TableHead>
          <TableHead className="text-xs">TVA</TableHead><TableHead className="text-xs">Taux TVA</TableHead>
          <TableHead className="text-xs">Approbation</TableHead><TableHead className="text-xs">Paiement</TableHead>
        </TableRow></TableHeader><TableBody>
          {entities.map((e) => (
            <TableRow key={e.id} className="text-sm">
              <TableCell className="font-medium">{e.name}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{e.code}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{e.vat || "—"}</TableCell>
              <TableCell>{e.vat_rate}%</TableCell>
              <TableCell><Badge variant="outline" className={`text-[10px] ${e.requires_approval ? "bg-warning/10 text-warning" : "bg-muted"}`}>{e.requires_approval ? "Requise" : "Non"}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={`text-[10px] ${e.payment_on_order ? "bg-primary/10 text-primary" : "bg-muted"}`}>{e.payment_on_order ? "À la commande" : "Sur facture"}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      )}
    </div>
  );
}
