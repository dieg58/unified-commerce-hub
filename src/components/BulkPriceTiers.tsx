import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";

const TIER_QTYS = [50, 100, 200, 500, 1000, 2000];

interface BulkPriceTiersProps {
  tiers: Record<number, string>; // min_qty -> unit_price as string
  onChange: (tiers: Record<number, string>) => void;
  basePrice?: string; // bulk unit price for % savings display
}

export default function BulkPriceTiers({ tiers, onChange, basePrice }: BulkPriceTiersProps) {
  const base = parseFloat(basePrice || "0");

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold flex items-center gap-1.5">
        <Layers className="w-4 h-4" /> Prix dégressifs Bulk (par palier)
      </Label>
      <p className="text-xs text-muted-foreground">
        Définissez un prix unitaire par palier de quantité. Laissez vide pour ne pas appliquer de palier.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {TIER_QTYS.map((qty) => {
          const val = tiers[qty] || "";
          const tierPrice = parseFloat(val);
          const savings = base > 0 && tierPrice > 0 ? Math.round((1 - tierPrice / base) * 100) : 0;
          return (
            <div key={qty} className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground">{qty} pcs</Label>
                {savings > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-success/10 text-success border-success/20">
                    -{savings}%
                  </Badge>
                )}
              </div>
              <Input
                type="number"
                value={val}
                onChange={(e) => onChange({ ...tiers, [qty]: e.target.value })}
                placeholder="€/u"
                min="0"
                step="0.01"
                className="h-8 text-sm"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { TIER_QTYS };
