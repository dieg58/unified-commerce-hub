import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/DashboardWidgets";
import { RefreshCw, CheckCircle, XCircle, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const ODOO_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Devis envoyé",
  sale: "Bon de commande",
  done: "Verrouillé",
  cancel: "Annulé",
};

interface OdooSyncSectionProps {
  orderId: string;
  odooOrderId?: number | null;
  odooOrderStatus?: string | null;
  odooSyncedAt?: string | null;
}

const OdooSyncSection = ({ orderId, odooOrderId, odooOrderStatus, odooSyncedAt }: OdooSyncSectionProps) => {
  const qc = useQueryClient();
  const { t } = useTranslation();

  const syncToOdoo = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-to-odoo", {
        body: { order_id: orderId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Commande synchronisée vers Odoo (ID: ${data.odoo_order_id})`);
      qc.invalidateQueries({ queryKey: ["order-detail", orderId] });
    },
    onError: (err: any) => toast.error(`Erreur sync Odoo: ${err.message}`),
  });

  const isSynced = !!odooOrderId;

  return (
    <div className="bg-card rounded-lg border border-border shadow-card">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <img src="https://www.odoo.com/favicon.ico" alt="Odoo" className="w-4 h-4" />
          Odoo ERP
        </h3>
        <Button
          size="sm"
          variant={isSynced ? "outline" : "default"}
          className="gap-1.5"
          disabled={syncToOdoo.isPending}
          onClick={() => syncToOdoo.mutate()}
        >
          {syncToOdoo.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {isSynced ? "Re-sync" : "Synchroniser vers Odoo"}
        </Button>
      </div>
      <div className="p-5">
        {isSynced ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-foreground font-medium">Synchronisé avec Odoo</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">ID Odoo</span>
                <p className="font-mono text-foreground">{odooOrderId}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Statut Odoo</span>
                <p className="text-foreground">
                  {ODOO_STATUS_LABELS[odooOrderStatus || ""] || odooOrderStatus || "—"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Dernière sync</span>
                <p className="text-foreground text-xs">
                  {odooSyncedAt
                    ? new Date(odooSyncedAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <XCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Non synchronisé avec Odoo</p>
            <p className="text-xs text-muted-foreground mt-1">
              Cliquez sur "Synchroniser" pour pousser cette commande vers Odoo
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OdooSyncSection;
