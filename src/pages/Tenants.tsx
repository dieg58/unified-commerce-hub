import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/TopBar";
import { StatusBadge, SectionHeader } from "@/components/DashboardWidgets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Loader2, Pencil, Power, PowerOff, Search, Store, ExternalLink, Globe } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CreateTenantWizard from "@/components/tenants/CreateTenantWizard";
import EditTenantDialog from "@/components/tenants/EditTenantDialog";

const Tenants = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<any>(null);
  const [search, setSearch] = useState("");

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, tenant_branding(primary_color, accent_color, head_title, logo_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, current }: { id: string; current: string }) => {
      const next = current === "active" ? "suspended" : "active";
      const { error } = await supabase.from("tenants").update({ status: next }).eq("id", id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      toast.success(`Boutique ${next === "active" ? "activée" : "suspendue"}`);
      qc.invalidateQueries({ queryKey: ["tenants"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = tenants?.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = tenants?.filter((t) => t.status === "active").length || 0;
  const totalCount = tenants?.length || 0;

  return (
    <>
      <TopBar title="Boutiques" subtitle="Gérez toutes les boutiques partenaires" />
      <div className="p-6 space-y-6 overflow-auto">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border border-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Boutiques au total</p>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Power className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Actives</p>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalCount - activeCount}</p>
              <p className="text-xs text-muted-foreground">Inactives / Suspendues</p>
            </div>
          </div>
        </div>

        {/* Main table card */}
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          <div className="p-5 border-b border-border">
            <SectionHeader
              title={`Toutes les Boutiques (${filtered?.length || 0})`}
              action={
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 h-8 w-48 text-sm"
                    />
                  </div>
                  <Button size="sm" className="gap-1.5" onClick={() => setWizardOpen(true)}>
                    <Plus className="w-4 h-4" /> Nouvelle Boutique
                  </Button>
                </div>
              }
            />
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !filtered?.length ? (
            <p className="p-12 text-center text-sm text-muted-foreground">
              {search ? "Aucune boutique trouvée" : "Aucune boutique. Créez-en une pour commencer."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Boutique</TableHead>
                  <TableHead className="text-xs">Sous-domaine</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                  <TableHead className="text-xs">Branding</TableHead>
                  <TableHead className="text-xs">Créée le</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tenant, i) => {
                  const branding = tenant.tenant_branding as any;
                  const color = branding?.primary_color || "#0ea5e9";
                  const accent = branding?.accent_color || "#10b981";
                  return (
                    <TableRow
                      key={tenant.id}
                      className="text-sm animate-fade-in cursor-pointer hover:bg-muted/50"
                      style={{ animationDelay: `${i * 40}ms` }}
                      onClick={() => navigate(`/tenants/${tenant.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {branding?.logo_url ? (
                            <img src={branding.logo_url} alt={tenant.name} className="w-9 h-9 rounded-lg object-cover border border-border shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: color + "18", color }}>
                              {tenant.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-foreground">{tenant.name}</p>
                            {branding?.head_title && <p className="text-[11px] text-muted-foreground">{branding.head_title}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                          {tenant.slug}.domain.com
                        </span>
                      </TableCell>
                      <TableCell><StatusBadge status={tenant.status} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full border border-border/50" style={{ backgroundColor: color }} title={`Primary: ${color}`} />
                          <div className="w-4 h-4 rounded-full border border-border/50" style={{ backgroundColor: accent }} title={`Accent: ${accent}`} />
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{new Date(tenant.created_at).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/tenants/${tenant.id}`); }}>
                              <ExternalLink className="w-4 h-4 mr-2" /> Voir détails
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/store/${tenant.id}`); }}>
                              <Store className="w-4 h-4 mr-2" /> Voir la boutique
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditTenant(tenant); }}>
                              <Pencil className="w-4 h-4 mr-2" /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleStatus.mutate({ id: tenant.id, current: tenant.status }); }}>
                              {tenant.status === "active" ? <><PowerOff className="w-4 h-4 mr-2" /> Suspendre</> : <><Power className="w-4 h-4 mr-2" /> Activer</>}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <CreateTenantWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      <EditTenantDialog tenant={editTenant} onClose={() => setEditTenant(null)} />
    </>
  );
};

export default Tenants;
