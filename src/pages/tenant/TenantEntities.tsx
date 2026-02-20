import { useNavigate } from "react-router-dom";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Pencil, Building2 } from "lucide-react";

const TenantEntities = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const navigate = useNavigate();

  const { data: entities, isLoading } = useQuery({
    queryKey: ["tenant-entities", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("*").eq("tenant_id", tenantId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  return (
    <>
      <TopBar title="Entités" subtitle="Gérer les départements et entités de votre boutique" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Entités ({entities?.length || 0})
            </h3>
            <Button size="sm" className="gap-1.5" onClick={() => navigate("/tenant/entities/new")}>
              <Plus className="w-4 h-4" /> Ajouter
            </Button>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !entities?.length ? (
            <p className="p-12 text-center text-sm text-muted-foreground">Aucune entité</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nom</TableHead>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">Taux TVA</TableHead>
                  <TableHead className="text-xs">N° TVA</TableHead>
                  <TableHead className="text-xs">Approbation</TableHead>
                  <TableHead className="text-xs">Paiement à la commande</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entities.map(entity => (
                  <TableRow key={entity.id} className="text-sm cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/tenant/entities/${entity.id}`)}>
                    <TableCell className="font-medium">{entity.name}</TableCell>
                    <TableCell className="font-mono text-xs">{entity.code}</TableCell>
                    <TableCell>{entity.vat_rate}%</TableCell>
                    <TableCell className="font-mono text-xs">{entity.vat || "—"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${entity.requires_approval ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>
                        {entity.requires_approval ? "Oui" : "Non"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${entity.payment_on_order ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {entity.payment_on_order ? "Oui" : "Non"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); navigate(`/tenant/entities/${entity.id}`); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
};

export default TenantEntities;
