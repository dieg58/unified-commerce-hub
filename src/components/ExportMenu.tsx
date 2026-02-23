import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet, FileText, CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ExportColumn, exportCSV, exportPDF, exportMeta } from "@/lib/export-utils";

interface ExportMenuProps {
  title: string;
  filename: string;
  columns: ExportColumn[];
  data: any[];
  /** Show store type filter */
  showStoreFilter?: boolean;
  /** External filter already applied — just for meta display */
  storeType?: string;
  onFilterChange?: (filters: { from?: Date; to?: Date; storeType?: string }) => void;
}

const ExportMenu = ({ title, filename, columns, data, showStoreFilter, storeType, onFilterChange }: ExportMenuProps) => {
  const [from, setFrom] = useState<Date>();
  const [to, setTo] = useState<Date>();
  const [localStore, setLocalStore] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const effectiveStore = storeType || localStore;

  const handleExport = (type: "csv" | "pdf") => {
    const meta = exportMeta(from, to, effectiveStore);
    if (type === "csv") {
      exportCSV(filename, columns, data);
    } else {
      exportPDF(filename, title, columns, data, meta);
    }
  };

  const handleFilterApply = () => {
    onFilterChange?.({ from, to, storeType: localStore });
  };

  const clearFilters = () => {
    setFrom(undefined);
    setTo(undefined);
    setLocalStore("all");
    onFilterChange?.({ from: undefined, to: undefined, storeType: "all" });
  };

  const hasFilters = from || to || localStore !== "all";

  return (
    <div className="flex items-center gap-1.5">
      {onFilterChange && (
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs", hasFilters && "border-primary text-primary")}>
              <Filter className="w-3.5 h-3.5" />
              Filtres
              {hasFilters && <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-primary" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4 space-y-3" align="end">
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Période</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("text-xs justify-start w-32", !from && "text-muted-foreground")}>
                      <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                      {from ? format(from, "dd/MM/yyyy") : "Début"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={from} onSelect={setFrom} locale={fr} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("text-xs justify-start w-32", !to && "text-muted-foreground")}>
                      <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                      {to ? format(to, "dd/MM/yyyy") : "Fin"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={to} onSelect={setTo} locale={fr} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {showStoreFilter && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Type boutique</label>
                <Select value={localStore} onValueChange={setLocalStore}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="bulk">Interne</SelectItem>
                    <SelectItem value="staff">Employé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button variant="ghost" size="sm" className="text-xs" onClick={clearFilters}>Réinitialiser</Button>
              <Button size="sm" className="text-xs" onClick={() => { handleFilterApply(); setShowFilters(false); }}>
                Appliquer
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Exporter
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-1" align="end">
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
            onClick={() => handleExport("csv")}
          >
            <FileSpreadsheet className="w-4 h-4 text-success" /> CSV
          </button>
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
            onClick={() => handleExport("pdf")}
          >
            <FileText className="w-4 h-4 text-destructive" /> PDF
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ExportMenu;
