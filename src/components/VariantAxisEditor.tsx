import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Sparkles, Boxes, MapPin } from "lucide-react";

export interface VariantAxis {
  label: string;
  values: string[];
}

export interface VariantCombination {
  label: string;       // e.g. "Couleur / Taille"
  value: string;       // e.g. "Navy - S"
  skuSuffix: string;
  priceAdj: string;
  stockQty: string;
  location: string;
}

interface VariantAxisEditorProps {
  axes: VariantAxis[];
  onAxesChange: (axes: VariantAxis[]) => void;
  combinations: VariantCombination[];
  onCombinationsChange: (combos: VariantCombination[]) => void;
}

const PRESETS = ["Couleur", "Taille", "Matière", "Longueur", "Capacité"];

/** Generate the cross-product of all axes */
function generateCombinations(axes: VariantAxis[]): { label: string; values: string[] }[] {
  const validAxes = axes.filter((a) => a.label.trim() && a.values.length > 0);
  if (validAxes.length === 0) return [];

  const label = validAxes.map((a) => a.label).join(" / ");

  // Cross-product
  let combos: string[][] = [[]];
  for (const axis of validAxes) {
    const next: string[][] = [];
    for (const existing of combos) {
      for (const val of axis.values) {
        if (val.trim()) next.push([...existing, val.trim()]);
      }
    }
    combos = next;
  }

  return combos.map((vals) => ({ label, values: vals }));
}

function generateSkuSuffix(values: string[]): string {
  return values
    .map((v) =>
      v
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 3)
    )
    .join("-");
}

const VariantAxisEditor = ({ axes, onAxesChange, combinations, onCombinationsChange }: VariantAxisEditorProps) => {
  const [newValueInputs, setNewValueInputs] = useState<Record<number, string>>({});

  const addAxis = (presetLabel?: string) => {
    onAxesChange([...axes, { label: presetLabel || "", values: [] }]);
  };

  const removeAxis = (i: number) => {
    const next = axes.filter((_, idx) => idx !== i);
    onAxesChange(next);
  };

  const updateAxisLabel = (i: number, label: string) => {
    const next = axes.map((a, idx) => (idx === i ? { ...a, label } : a));
    onAxesChange(next);
  };

  const addValue = (axisIdx: number) => {
    const raw = newValueInputs[axisIdx]?.trim();
    if (!raw) return;
    // Support comma-separated
    const newVals = raw.split(",").map((v) => v.trim()).filter(Boolean);
    const next = axes.map((a, idx) =>
      idx === axisIdx ? { ...a, values: [...a.values, ...newVals.filter((v) => !a.values.includes(v))] } : a
    );
    onAxesChange(next);
    setNewValueInputs((p) => ({ ...p, [axisIdx]: "" }));
  };

  const removeValue = (axisIdx: number, valIdx: number) => {
    const next = axes.map((a, idx) =>
      idx === axisIdx ? { ...a, values: a.values.filter((_, vi) => vi !== valIdx) } : a
    );
    onAxesChange(next);
  };

  const handleGenerate = useCallback(() => {
    const combos = generateCombinations(axes);
    const existing = new Map(combinations.map((c) => [c.value, c]));
    const result: VariantCombination[] = combos.map(({ label, values }) => {
      const value = values.join(" - ");
      const ex = existing.get(value);
      if (ex) return ex;
      return {
        label,
        value,
        skuSuffix: generateSkuSuffix(values),
        priceAdj: "0",
        stockQty: "0",
        location: "",
      };
    });
    onCombinationsChange(result);
  }, [axes, combinations, onCombinationsChange]);

  const updateCombo = (i: number, field: keyof VariantCombination, val: string) => {
    onCombinationsChange(combinations.map((c, idx) => (idx === i ? { ...c, [field]: val } : c)));
  };

  const removeCombo = (i: number) => {
    onCombinationsChange(combinations.filter((_, idx) => idx !== i));
  };

  const validAxes = axes.filter((a) => a.label.trim() && a.values.length > 0);
  const canGenerate = validAxes.length > 0;
  const expectedCount = canGenerate
    ? validAxes.reduce((total, a) => total * a.values.filter((v) => v.trim()).length, 1)
    : 0;

  const unusedPresets = PRESETS.filter((p) => !axes.some((a) => a.label === p));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-semibold">Axes de variantes</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Définissez vos axes (couleur, taille…) puis générez les déclinaisons.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => addAxis()}>
          <Plus className="w-3.5 h-3.5" /> Axe
        </Button>
      </div>

      {/* Preset buttons */}
      {unusedPresets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unusedPresets.map((preset) => (
            <Button
              key={preset}
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => addAxis(preset)}
            >
              {preset}
            </Button>
          ))}
        </div>
      )}

      {/* Axes */}
      {axes.map((axis, ai) => (
        <div key={ai} className="rounded-lg border border-border p-3 bg-muted/30 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              value={axis.label}
              onChange={(e) => updateAxisLabel(ai, e.target.value)}
              placeholder="Nom de l'axe (ex: Couleur)"
              className="h-8 text-sm font-medium flex-1"
              maxLength={50}
            />
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive shrink-0" onClick={() => removeAxis(ai)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Existing values */}
          <div className="flex flex-wrap gap-1.5">
            {axis.values.map((val, vi) => (
              <Badge key={vi} variant="secondary" className="gap-1 text-xs pl-2 pr-1 py-1">
                {val}
                <button
                  type="button"
                  className="rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                  onClick={() => removeValue(ai, vi)}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>

          {/* Add values input */}
          <div className="flex gap-1.5">
            <Input
              value={newValueInputs[ai] || ""}
              onChange={(e) => setNewValueInputs((p) => ({ ...p, [ai]: e.target.value }))}
              placeholder="Valeurs séparées par virgule (ex: S, M, L, XL)"
              className="h-7 text-xs flex-1"
              maxLength={200}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addValue(ai);
                }
              }}
            />
            <Button type="button" variant="secondary" size="sm" className="h-7 text-xs px-2" onClick={() => addValue(ai)}>
              Ajouter
            </Button>
          </div>
        </div>
      ))}

      {axes.length === 0 && (
        <div className="rounded-md border border-dashed border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Aucun axe de variante. Cliquez "Axe" ou un preset pour commencer.
          </p>
        </div>
      )}

      {/* Generate button */}
      {canGenerate && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            {expectedCount} déclinaison{expectedCount > 1 ? "s" : ""} seront générées
          </p>
          <Button type="button" size="sm" className="gap-1.5" onClick={handleGenerate}>
            <Sparkles className="w-3.5 h-3.5" /> Générer les déclinaisons
          </Button>
        </div>
      )}

      {/* Combinations table */}
      {combinations.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            Déclinaisons ({combinations.length})
          </Label>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Déclinaison</TableHead>
                  <TableHead className="text-[10px] w-20">Suffixe SKU</TableHead>
                  <TableHead className="text-[10px] w-20">Ajust. €</TableHead>
                  <TableHead className="text-[10px] w-20">
                    <span className="flex items-center gap-1"><Boxes className="w-3 h-3" /> Stock</span>
                  </TableHead>
                  <TableHead className="text-[10px] w-28">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Emplacement</span>
                  </TableHead>
                  <TableHead className="text-[10px] w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combinations.map((combo, ci) => (
                  <TableRow key={ci}>
                    <TableCell className="text-xs font-medium py-1.5">{combo.value}</TableCell>
                    <TableCell className="py-1.5">
                      <Input
                        value={combo.skuSuffix}
                        onChange={(e) => updateCombo(ci, "skuSuffix", e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
                        className="h-7 text-[10px] w-full"
                        maxLength={15}
                      />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Input
                        type="number"
                        value={combo.priceAdj}
                        onChange={(e) => updateCombo(ci, "priceAdj", e.target.value)}
                        className="h-7 text-[10px] w-full"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Input
                        type="number"
                        value={combo.stockQty}
                        onChange={(e) => updateCombo(ci, "stockQty", e.target.value)}
                        className="h-7 text-[10px] w-full"
                        min="0"
                      />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Input
                        value={combo.location}
                        onChange={(e) => updateCombo(ci, "location", e.target.value)}
                        className="h-7 text-[10px] w-full"
                        placeholder="—"
                        maxLength={100}
                      />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeCombo(ci)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

export default VariantAxisEditor;

/** Convert flat variant rows from DB into axes + combinations */
export function variantsToAxesAndCombinations(
  dbVariants: { variant_label: string; variant_value: string; sku_suffix: string | null; price_adjustment: number; stock_qty: number; location: string | null }[]
): { axes: VariantAxis[]; combinations: VariantCombination[] } {
  if (!dbVariants?.length) return { axes: [], combinations: [] };

  // Check if they use the multi-axis format (label contains " / ")
  const firstLabel = dbVariants[0].variant_label;
  const isMultiAxis = firstLabel.includes(" / ");

  if (isMultiAxis) {
    const axisLabels = firstLabel.split(" / ").map((s) => s.trim());
    const axesMap: Record<string, Set<string>> = {};
    axisLabels.forEach((l) => (axesMap[l] = new Set()));

    dbVariants.forEach((v) => {
      const parts = v.variant_value.split(" - ").map((s) => s.trim());
      parts.forEach((p, i) => {
        if (axisLabels[i]) axesMap[axisLabels[i]].add(p);
      });
    });

    const axes: VariantAxis[] = axisLabels.map((l) => ({ label: l, values: Array.from(axesMap[l]) }));
    const combinations: VariantCombination[] = dbVariants.map((v) => ({
      label: v.variant_label,
      value: v.variant_value,
      skuSuffix: v.sku_suffix || "",
      priceAdj: String(v.price_adjustment || 0),
      stockQty: String(v.stock_qty || 0),
      location: v.location || "",
    }));

    return { axes, combinations };
  }

  // Legacy single-axis format: group by label
  const groups: Record<string, string[]> = {};
  dbVariants.forEach((v) => {
    if (!groups[v.variant_label]) groups[v.variant_label] = [];
    groups[v.variant_label].push(v.variant_value);
  });

  const axes: VariantAxis[] = Object.entries(groups).map(([label, values]) => ({ label, values }));
  const combinations: VariantCombination[] = dbVariants.map((v) => ({
    label: v.variant_label,
    value: v.variant_value,
    skuSuffix: v.sku_suffix || "",
    priceAdj: String(v.price_adjustment || 0),
    stockQty: String(v.stock_qty || 0),
    location: v.location || "",
  }));

  return { axes, combinations };
}
