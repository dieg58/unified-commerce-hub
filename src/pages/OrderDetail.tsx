import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import TopBar from "@/components/TopBar";
import { StatusBadge } from "@/components/DashboardWidgets";
import { formatCurrency } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Loader2, User, Building2, Package,
  CheckCircle, XCircle, Truck, Calendar
} from "lucide-react";
import { toast } from "sonner";
import ShipmentSection from "@/components/ShipmentSection";
import OdooSyncSection from "@/components/OdooSyncSection";
import InvoicesSection from "@/components/InvoicesSection";
import { useTranslation } from "react-i18next";

const OrderDetail = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useTranslation();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-detail", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, profiles:created_by(full_name, email), entities(name, code, requires_approval), shipping_entity:entities!orders_shipping_entity_id_fkey(name, code), tenants(name, slug)")
        .eq("id", orderId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  const { data: items } = useQuery({
    queryKey: ["order-items", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("*, products(name, sku, image_url, category)")
        .eq("order_id", orderId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", orderId!);
      if (error) throw error;

      // Auto-sync to Odoo on approval
      if (status === "approved") {
        supabase.functions.invoke("sync-to-odoo", { body: { order_id: orderId } })
          .then((res) => {
            if (res.data?.success) toast.success("Commande synchronisée vers Odoo");
            else if (res.data?.error) console.warn("Odoo sync warning:", res.data.error);
          })
          .catch((e) => console.warn("Odoo sync failed:", e));
      }

      // Send email notification
      if (status === "approved" || status === "rejected") {
        const emailEvent = status === "approved" ? "order_confirmed" : "order_rejected";
        supabase.functions.invoke("send-order-email", { body: { order_id: orderId, event_type: emailEvent } })
          .catch((e) => console.warn("Email send failed:", e));
      }
    },
    onSuccess: (_, status) => {
      toast.success(`${t("common.order")} ${status === "approved" ? t("common.approved") : status === "rejected" ? t("common.rejected") : status}`);
      qc.invalidateQueries({ queryKey: ["order-detail", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <>
        <TopBar title={t("common.order")} subtitle={t("common.loading")} />
        <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <TopBar title={t("common.order")} subtitle="Introuvable" />
        <div className="p-6">
          <Button variant="outline" onClick={() => navigate("/orders")} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> {t("common.back")}
          </Button>
          <p className="text-center text-muted-foreground mt-12">Commande introuvable</p>
        </div>
      </>
    );
  }

  const profile = order.profiles as any;
  const entity = order.entities as any;
  const shippingEntity = (order as any).shipping_entity as any;
  const tenant = (order as any).tenants as any;
  const isPending = order.status === "pending_approval" || order.status === "pending";
  const totalItems = items?.reduce((s, it) => s + it.qty, 0) || 0;

  return (
    <>
      <TopBar title={`${t("common.order")} ${order.id.slice(0, 8)}`} subtitle={tenant?.name || ""} />
      <div className="p-6 space-y-6 overflow-auto animate-fade-in">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => navigate("/orders")} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> {t("common.back")}
          </Button>
          <div className="flex items-center gap-2">
            {isPending && (
              <>
                <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate("rejected")}>
                  <XCircle className="w-3.5 h-3.5" /> {t("common.reject")}
                </Button>
                <Button size="sm" className="gap-1" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate("approved")}>
                  <CheckCircle className="w-3.5 h-3.5" /> {t("common.approve")}
                </Button>
              </>
            )}
            {order.status === "approved" && (
              <Button size="sm" className="gap-1" onClick={() => updateStatus.mutate("processing")}>
                <Package className="w-3.5 h-3.5" /> En traitement
              </Button>
            )}
            {order.status === "processing" && (
              <Button size="sm" className="gap-1" onClick={() => updateStatus.mutate("shipped")}>
                <Truck className="w-3.5 h-3.5" /> Marquer expédié
              </Button>
            )}
            {order.status === "shipped" && (
              <Button size="sm" className="gap-1" onClick={() => updateStatus.mutate("delivered")}>
                <CheckCircle className="w-3.5 h-3.5" /> Marquer livré
              </Button>
            )}
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border border-border p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> Informations
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">ID</span><span className="font-mono text-xs text-foreground">{order.id.slice(0, 12)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("common.status")}</span><StatusBadge status={order.status} /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${order.store_type === "bulk" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>{order.store_type === "bulk" ? "Bulk" : "Staff"}</span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("common.total")}</span><span className="font-semibold text-foreground">{formatCurrency(Number(order.total))}</span></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">{t("common.date")}</span>
                <span className="text-xs text-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Client</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t("common.name")}</span><span className="text-foreground">{profile?.full_name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("common.email")}</span><span className="text-foreground text-xs">{profile?.email || "—"}</span></div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Boutique & Entités</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Boutique</span><span className="text-foreground">{tenant?.name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Facturation</span><span className="text-foreground">{entity?.name || "—"} {entity?.code ? `(${entity.code})` : ""}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Livraison</span><span className="text-foreground">{shippingEntity?.name || entity?.name || "—"} {shippingEntity?.code ? `(${shippingEntity.code})` : entity?.code ? `(${entity.code})` : ""}</span></div>
              {entity?.requires_approval && (
                <div className="flex justify-between"><span className="text-muted-foreground">Approbation</span><span className="text-xs text-warning font-medium">Requise</span></div>
              )}
            </div>
          </div>
        </div>

        {/* Order items */}
        <div className="bg-card rounded-lg border border-border shadow-card">
          <div className="p-5 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Articles ({totalItems} {t("common.product")}{totalItems > 1 ? "s" : ""})
            </h3>
          </div>
          {!items?.length ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{t("common.noData")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t("common.product")}</TableHead>
                  <TableHead className="text-xs">SKU</TableHead>
                  <TableHead className="text-xs">{t("common.category")}</TableHead>
                  <TableHead className="text-xs text-right">{t("common.price")}</TableHead>
                  <TableHead className="text-xs text-right">{t("common.quantity")}</TableHead>
                  <TableHead className="text-xs text-right">Sous-total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const product = item.products as any;
                  return (
                    <TableRow key={item.id} className="text-sm">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product?.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded-md object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0"><Package className="w-4 h-4 text-muted-foreground" /></div>
                          )}
                          <span className="font-medium text-foreground">{product?.name || "Produit supprimé"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{product?.sku || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground capitalize">{product?.category || "—"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(item.unit_price))}</TableCell>
                      <TableCell className="text-right font-medium">{item.qty}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(Number(item.unit_price) * item.qty)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <div className="p-5 border-t border-border flex justify-end">
            <div className="text-right">
              <span className="text-sm text-muted-foreground mr-4">{t("common.total")}</span>
              <span className="text-lg font-bold text-foreground">{formatCurrency(Number(order.total))}</span>
            </div>
          </div>
        </div>

        {/* Odoo sync */}
        <OdooSyncSection
          orderId={order.id}
          odooOrderId={(order as any).odoo_order_id}
          odooOrderStatus={(order as any).odoo_order_status}
          odooSyncedAt={(order as any).odoo_synced_at}
        />

        {/* Invoices from Odoo */}
        <InvoicesSection orderId={order.id} />

        {/* Shipments */}
        <ShipmentSection orderId={order.id} tenantId={order.tenant_id} />
      </div>
    </>
  );
};

export default OrderDetail;
