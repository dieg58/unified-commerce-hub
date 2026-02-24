import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Package, Sparkles, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  base_price: number;
  image_url: string | null;
  description: string | null;
  sku: string;
  stock_qty: number;
  is_new: boolean;
}

interface Props {
  product: CatalogProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alreadyRequested?: boolean;
}

const CatalogProductDetailDialog = ({ product, open, onOpenChange, alreadyRequested }: Props) => {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!product || !profile?.tenant_id || !profile?.id) throw new Error("Données manquantes");
      const { error } = await supabase.from("product_requests").insert({
        catalog_product_id: product.id,
        tenant_id: profile.tenant_id,
        requested_by: profile.id,
        note: note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demande d'ajout envoyée !");
      qc.invalidateQueries({ queryKey: ["tenant-product-requests"] });
      setNote("");
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(`Erreur : ${err.message}`),
  });

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {product.is_new && <Sparkles className="w-4 h-4 text-warning" />}
            {product.name}
          </DialogTitle>
          <DialogDescription className="capitalize">{product.category}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-48 object-contain rounded-lg bg-muted"
            />
          ) : (
            <div className="w-full h-48 rounded-lg bg-muted flex items-center justify-center">
              <Package className="w-12 h-12 text-muted-foreground" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Référence</p>
              <p className="font-mono font-medium text-foreground">{product.sku}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Prix indicatif</p>
              <p className="font-semibold text-primary">{formatCurrency(Number(product.base_price))}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Stock fournisseur</p>
              <p className="font-medium text-foreground">{product.stock_qty}</p>
            </div>
          </div>

          {product.description && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p className="text-sm text-foreground">{product.description}</p>
            </div>
          )}

          {!alreadyRequested && (
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Note (optionnelle)</label>
              <Textarea
                placeholder="Précisez vos besoins : personnalisation, quantités, couleurs..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <Button
            className="w-full"
            disabled={alreadyRequested || requestMutation.isPending}
            onClick={() => requestMutation.mutate()}
          >
            {requestMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : alreadyRequested ? (
              "Déjà demandé"
            ) : (
              "Demander l'ajout à ma boutique"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CatalogProductDetailDialog;
