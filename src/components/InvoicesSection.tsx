import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  not_paid: "bg-warning/10 text-warning border-warning/20",
  in_payment: "bg-primary/10 text-primary border-primary/20",
  paid: "bg-success/10 text-success border-success/20",
  partial: "bg-accent/10 text-accent border-accent/20",
  reversed: "bg-destructive/10 text-destructive border-destructive/20",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  not_paid: "Non payée",
  in_payment: "En paiement",
  paid: "Payée",
  partial: "Partielle",
  reversed: "Annulée",
};

interface InvoicesSectionProps {
  orderId: string;
}

const InvoicesSection = ({ orderId }: InvoicesSectionProps) => {
  const { t } = useTranslation();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("order_id", orderId)
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const downloadPdf = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("odoo-get-invoice-pdf", {
        body: { invoice_id: invoiceId },
      });
      if (error) throw error;

      // If we got a blob/arraybuffer, download it
      if (data instanceof Blob || data instanceof ArrayBuffer) {
        const blob = data instanceof Blob ? data : new Blob([data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${invoiceNumber}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(`Erreur téléchargement: ${err.message}`);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border shadow-card">
      <div className="p-5 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Factures ({invoices?.length || 0})
        </h3>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : !invoices?.length ? (
        <div className="p-8 text-center">
          <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aucune facture</p>
          <p className="text-xs text-muted-foreground mt-1">
            Les factures apparaîtront ici une fois créées dans Odoo
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">N° Facture</TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Échéance</TableHead>
              <TableHead className="text-xs text-right">HT</TableHead>
              <TableHead className="text-xs text-right">TVA</TableHead>
              <TableHead className="text-xs text-right">TTC</TableHead>
              <TableHead className="text-xs">Paiement</TableHead>
              <TableHead className="text-xs w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv: any) => (
              <TableRow key={inv.id} className="text-sm">
                <TableCell className="font-mono text-xs font-medium">{inv.invoice_number}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(inv.invoice_date).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(Number(inv.amount_untaxed))}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatCurrency(Number(inv.amount_tax))}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(Number(inv.amount_total))}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-xs ${PAYMENT_STATUS_COLORS[inv.payment_status] || ""}`}
                  >
                    {PAYMENT_STATUS_LABELS[inv.payment_status] || inv.payment_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {inv.odoo_invoice_id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => downloadPdf(inv.id, inv.invoice_number)}
                      title="Télécharger PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default InvoicesSection;
