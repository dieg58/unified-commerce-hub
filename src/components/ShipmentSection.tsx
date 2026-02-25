import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/DashboardWidgets";
import { Truck, Plus, Loader2, Package, Send } from "lucide-react";
import { toast } from "sonner";

const CARRIERS = ["Colissimo", "Chronopost", "DHL", "UPS", "FedEx", "DPD", "GLS", "Mondial Relay", "Autre"];

const STATUS_LABELS: Record<string, string> = {
  preparing: "En préparation",
  shipped: "Expédié",
  delivered: "Livré",
};

interface ShipmentSectionProps {
  orderId: string;
  tenantId: string;
}

const ShipmentSection = ({ orderId, tenantId }: ShipmentSectionProps) => {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [notes, setNotes] = useState("");

  const { data: shipments, isLoading } = useQuery({
    queryKey: ["shipments", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*, profiles:created_by(full_name)")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createShipment = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .insert({
          order_id: orderId,
          tenant_id: tenantId,
          carrier,
          tracking_number: trackingNumber || null,
          notes: notes || null,
          status: "preparing",
          created_by: profile!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Expédition créée");
      qc.invalidateQueries({ queryKey: ["shipments", orderId] });
      setOpen(false);
      setCarrier("");
      setTrackingNumber("");
      setNotes("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateShipmentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "shipped") updates.shipped_at = new Date().toISOString();
      if (status === "delivered") updates.delivered_at = new Date().toISOString();

      const { error } = await supabase.from("shipments").update(updates).eq("id", id);
      if (error) throw error;

      // Send notification emails
      if (status === "shipped" || status === "delivered") {
        const emailEvent = status === "shipped" ? "order_shipped" : "order_delivered";
        Promise.all([
          supabase.functions.invoke("notify-shipment", { body: { shipment_id: id } }),
          supabase.functions.invoke("send-order-email", { body: { order_id: orderId, event_type: emailEvent } }),
        ]).catch((e) => console.warn("Notification email failed:", e));
      }
    },
    onSuccess: (_, { status }) => {
      toast.success(`Statut mis à jour : ${STATUS_LABELS[status] || status}`);
      qc.invalidateQueries({ queryKey: ["shipments", orderId] });
      qc.invalidateQueries({ queryKey: ["order-detail", orderId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="bg-card rounded-lg border border-border shadow-card">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Truck className="w-4 h-4 text-primary" /> Expéditions ({shipments?.length || 0})
        </h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="w-3.5 h-3.5" /> Nouvelle expédition
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer une expédition</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Transporteur</Label>
                <Select value={carrier} onValueChange={setCarrier}>
                  <SelectTrigger><SelectValue placeholder="Choisir un transporteur" /></SelectTrigger>
                  <SelectContent>
                    {CARRIERS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Numéro de suivi</Label>
                <Input
                  placeholder="Ex: 1Z999AA10123456784"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Notes internes (optionnel)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
              <Button
                className="w-full gap-2"
                disabled={!carrier || createShipment.isPending}
                onClick={() => createShipment.mutate()}
              >
                {createShipment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                Créer l'expédition
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : !shipments?.length ? (
        <p className="p-8 text-center text-sm text-muted-foreground">Aucune expédition</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Transporteur</TableHead>
              <TableHead className="text-xs">N° suivi</TableHead>
              <TableHead className="text-xs">Statut</TableHead>
              <TableHead className="text-xs">Créé par</TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipments.map((s: any) => (
              <TableRow key={s.id} className="text-sm">
                <TableCell className="font-medium">{s.carrier || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{s.tracking_number || "—"}</TableCell>
                <TableCell><StatusBadge status={s.status} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">{(s.profiles as any)?.full_name || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {s.status === "preparing" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      disabled={updateShipmentStatus.isPending}
                      onClick={() => updateShipmentStatus.mutate({ id: s.id, status: "shipped" })}
                    >
                      <Send className="w-3 h-3" /> Expédier
                    </Button>
                  )}
                  {s.status === "shipped" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      disabled={updateShipmentStatus.isPending}
                      onClick={() => updateShipmentStatus.mutate({ id: s.id, status: "delivered" })}
                    >
                      <Package className="w-3 h-3" /> Livré
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

export default ShipmentSection;
