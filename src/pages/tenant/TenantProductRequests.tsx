import { useState, useMemo } from "react";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Package,
  Search,
  Send,
  Eye,
  Sparkles,
  ArrowLeft,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/mock-data";

/* ── Status config ── */
const statusConfig: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  requested: { label: "Demandé", className: "bg-blue-500/10 text-blue-600 border-blue-200", icon: Clock },
  in_discussion: { label: "En discussion", className: "bg-amber-500/10 text-amber-600 border-amber-200", icon: MessageSquare },
  bat_sent: { label: "BAT envoyé", className: "bg-purple-500/10 text-purple-600 border-purple-200", icon: Eye },
  validated: { label: "Validé", className: "bg-green-500/10 text-green-600 border-green-200", icon: CheckCircle2 },
  added: { label: "Ajouté", className: "bg-emerald-500/10 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  rejected: { label: "Rejeté", className: "bg-red-500/10 text-red-600 border-red-200", icon: XCircle },
};

/* ── Category helpers ── */
function getParentCategory(category: string): string {
  const parts = category.split(">").map((s) => s.trim());
  return parts[0] || category;
}

function getAllCategories(products: any[]): string[] {
  const cats = new Set<string>();
  products.forEach((p) => cats.add(getParentCategory(p.category)));
  const sorted = Array.from(cats).sort();
  return sorted;
}

const TenantProductRequests = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("catalog");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [detailProduct, setDetailProduct] = useState<any>(null);
  const [note, setNote] = useState("");
  const [viewRequest, setViewRequest] = useState<any>(null);
  const [requestSearch, setRequestSearch] = useState("");
  const [requestFilter, setRequestFilter] = useState<string>("all");

  /* ── Queries ── */
  const { data: catalogProducts, isLoading: catalogLoading } = useQuery({
    queryKey: ["catalog-for-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_products")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ["product-requests", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_requests")
        .select(
          "*, catalog_products(name, sku, image_url, base_price, category, description), profiles:requested_by(full_name, email)"
        )
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Map of catalog_product_id → request (active ones)
  const requestMap = useMemo(() => {
    const map = new Map<string, any>();
    requests?.forEach((r) => {
      if (!["rejected"].includes(r.status)) {
        map.set(r.catalog_product_id, r);
      }
    });
    return map;
  }, [requests]);

  /* ── Submit request ── */
  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!detailProduct || !tenantId || !profile) return;
      const { error } = await supabase.from("product_requests").insert({
        tenant_id: tenantId,
        catalog_product_id: detailProduct.id,
        requested_by: profile.id,
        note: note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demande envoyée avec succès !");
      qc.invalidateQueries({ queryKey: ["product-requests"] });
      setNote("");
      setDetailProduct(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  /* ── Filtered catalog ── */
  const categories = useMemo(() => getAllCategories(catalogProducts || []), [catalogProducts]);

  const filteredCatalog = useMemo(() => {
    let list = catalogProducts || [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    if (selectedCategory) {
      list = list.filter((p) => getParentCategory(p.category) === selectedCategory);
    }
    if (showNewOnly) {
      list = list.filter((p) => p.is_new);
    }
    return list;
  }, [catalogProducts, search, selectedCategory, showNewOnly]);

  const newCount = catalogProducts?.filter((p) => p.is_new).length || 0;

  /* ── Filtered requests ── */
  const filteredRequests = useMemo(() => {
    let list = requests || [];
    if (requestSearch) {
      const q = requestSearch.toLowerCase();
      list = list.filter(
        (r) =>
          (r.catalog_products as any)?.name?.toLowerCase().includes(q) ||
          r.status.includes(q)
      );
    }
    if (requestFilter !== "all") {
      if (requestFilter === "active") {
        list = list.filter((r) => !["added", "rejected"].includes(r.status));
      } else {
        list = list.filter((r) => r.status === requestFilter);
      }
    }
    return list;
  }, [requests, requestSearch, requestFilter]);

  const activeRequestsCount = requests?.filter((r) => !["added", "rejected"].includes(r.status)).length || 0;

  return (
    <>
      <TopBar
        title="Catalogue & Demandes"
        subtitle="Parcourez le catalogue INKOO et demandez l'ajout de produits"
      />
      <div className="p-6 space-y-4 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="catalog" className="gap-2">
              <ShoppingBag className="w-4 h-4" />
              Catalogue
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <Clock className="w-4 h-4" />
              Mes demandes
              {activeRequestsCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {activeRequestsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ════════════ CATALOGUE TAB ════════════ */}
          <TabsContent value="catalog" className="space-y-4 mt-4">
            {/* Search + filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit, SKU, catégorie…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              {newCount > 0 && (
                <Button
                  variant={showNewOnly ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5 h-10 shrink-0"
                  onClick={() => setShowNewOnly(!showNewOnly)}
                >
                  <Sparkles className="w-4 h-4" />
                  Nouveautés
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {newCount}
                  </Badge>
                </Button>
              )}
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  !selectedCategory
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
              >
                Tout ({catalogProducts?.length || 0})
              </button>
              {categories.map((cat) => {
                const count = (catalogProducts || []).filter(
                  (p) => getParentCategory(p.category) === cat
                ).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Products grid */}
            {catalogLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : !filteredCatalog.length ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Aucun produit trouvé</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredCatalog.map((p, i) => {
                  const existing = requestMap.get(p.id);
                  const isRequested = !!existing;
                  const st = existing ? statusConfig[existing.status] : null;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setDetailProduct(p)}
                      className="group text-left bg-card border border-border rounded-xl overflow-hidden hover:shadow-card-hover hover:border-primary/20 transition-all animate-fade-in"
                      style={{ animationDelay: `${Math.min(i, 20) * 30}ms` }}
                    >
                      <div className="relative aspect-square bg-muted">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-10 h-10 text-muted-foreground/20" />
                          </div>
                        )}
                        {p.is_new && (
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-warning text-warning-foreground text-[10px] gap-1">
                              <Sparkles className="w-3 h-3" /> Nouveau
                            </Badge>
                          </div>
                        )}
                        {isRequested && st && (
                          <div className="absolute top-2 right-2">
                            <Badge variant="outline" className={`text-[9px] ${st.className} bg-background/90 backdrop-blur-sm`}>
                              {st.label}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="p-3 space-y-1">
                        <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono">{p.sku}</p>
                        <p className="text-sm font-semibold text-primary">
                          {formatCurrency(Number(p.base_price))}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ════════════ REQUESTS TAB ════════════ */}
          <TabsContent value="requests" className="space-y-4 mt-4">
            {/* Filters bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher dans mes demandes…"
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
            </div>

            {/* Status filter pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "Toutes" },
                { key: "active", label: "En cours" },
                { key: "added", label: "Ajoutés" },
                { key: "rejected", label: "Rejetés" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setRequestFilter(f.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    requestFilter === f.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Requests list */}
            {requestsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : !filteredRequests.length ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Aucune demande trouvée</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-2"
                  onClick={() => setActiveTab("catalog")}
                >
                  <ShoppingBag className="w-4 h-4" /> Parcourir le catalogue
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((r, i) => {
                  const cp = r.catalog_products as any;
                  const st = statusConfig[r.status] || {
                    label: r.status,
                    className: "",
                    icon: Clock,
                  };
                  const StatusIcon = st.icon;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setViewRequest(r)}
                      className="w-full text-left bg-card border border-border rounded-xl p-4 hover:shadow-card-hover hover:border-primary/20 transition-all animate-fade-in flex items-center gap-4"
                      style={{ animationDelay: `${Math.min(i, 15) * 30}ms` }}
                    >
                      {cp?.image_url ? (
                        <img
                          src={cp.image_url}
                          alt={cp.name}
                          className="w-14 h-14 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Package className="w-6 h-6 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{cp?.name}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{cp?.sku}</p>
                        {r.admin_note && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            💬 {r.admin_note}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge variant="outline" className={`text-[10px] gap-1 ${st.className}`}>
                          <StatusIcon className="w-3 h-3" />
                          {st.label}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ════════════ PRODUCT DETAIL DIALOG ════════════ */}
      <Dialog
        open={!!detailProduct}
        onOpenChange={(v) => {
          if (!v) {
            setDetailProduct(null);
            setNote("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {detailProduct && (() => {
            const existing = requestMap.get(detailProduct.id);
            const isRequested = !!existing;
            const st = existing ? statusConfig[existing.status] : null;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {detailProduct.is_new && <Sparkles className="w-4 h-4 text-warning" />}
                    {detailProduct.name}
                  </DialogTitle>
                  <DialogDescription className="capitalize">
                    {detailProduct.category}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {detailProduct.image_url ? (
                    <img
                      src={detailProduct.image_url}
                      alt={detailProduct.name}
                      className="w-full h-56 object-contain rounded-xl bg-muted"
                    />
                  ) : (
                    <div className="w-full h-56 rounded-xl bg-muted flex items-center justify-center">
                      <Package className="w-16 h-16 text-muted-foreground/20" />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-secondary/50 rounded-lg p-3">
                      <p className="text-[11px] text-muted-foreground">Référence</p>
                      <p className="font-mono text-sm font-medium text-foreground mt-0.5">
                        {detailProduct.sku}
                      </p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-3">
                      <p className="text-[11px] text-muted-foreground">Prix indicatif</p>
                      <p className="text-sm font-semibold text-primary mt-0.5">
                        {formatCurrency(Number(detailProduct.base_price))}
                      </p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-3">
                      <p className="text-[11px] text-muted-foreground">Stock</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">
                        {detailProduct.stock_qty}
                      </p>
                    </div>
                  </div>

                  {detailProduct.description && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-sm text-foreground leading-relaxed">
                        {detailProduct.description}
                      </p>
                    </div>
                  )}

                  {isRequested && st ? (
                    <div className={`rounded-lg border p-4 ${st.className}`}>
                      <div className="flex items-center gap-2">
                        <st.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">Demande {st.label.toLowerCase()}</span>
                      </div>
                      {existing.admin_note && (
                        <p className="text-sm mt-2 opacity-80">💬 {existing.admin_note}</p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 gap-1.5"
                        onClick={() => {
                          setDetailProduct(null);
                          setViewRequest(existing);
                        }}
                      >
                        <Eye className="w-3.5 h-3.5" /> Voir ma demande
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">
                          Note pour l'équipe INKOO (optionnel)
                        </label>
                        <Textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Précisez vos besoins : couleurs, quantités, emplacement du logo…"
                          rows={3}
                        />
                      </div>
                      <Button
                        className="w-full gap-2"
                        onClick={() => submitRequest.mutate()}
                        disabled={submitRequest.isPending}
                      >
                        {submitRequest.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Demander l'ajout à ma boutique
                      </Button>
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ════════════ VIEW REQUEST DETAIL DIALOG ════════════ */}
      <Dialog open={!!viewRequest} onOpenChange={(v) => !v && setViewRequest(null)}>
        <DialogContent className="sm:max-w-md">
          {viewRequest &&
            (() => {
              const cp = viewRequest.catalog_products as any;
              const st = statusConfig[viewRequest.status] || {
                label: viewRequest.status,
                className: "",
                icon: Clock,
              };
              const StatusIcon = st.icon;

              // Build timeline from status
              const allStatuses = ["requested", "in_discussion", "bat_sent", "validated", "added"];
              const currentIdx = allStatuses.indexOf(viewRequest.status);
              const isRejected = viewRequest.status === "rejected";

              return (
                <>
                  <DialogHeader>
                    <DialogTitle>Suivi de la demande</DialogTitle>
                    <DialogDescription>{cp?.name}</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-5">
                    {/* Product preview */}
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-secondary/50 border border-border">
                      {cp?.image_url ? (
                        <img
                          src={cp.image_url}
                          alt={cp.name}
                          className="w-14 h-14 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{cp?.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{cp?.sku}</p>
                        <p className="text-sm font-medium text-primary mt-0.5">
                          {formatCurrency(Number(cp?.base_price || 0))}
                        </p>
                      </div>
                    </div>

                    {/* Status timeline */}
                    <div className="space-y-0">
                      {(isRejected
                        ? [
                            ...allStatuses.slice(0, Math.max(currentIdx, 1)),
                            "rejected",
                          ]
                        : allStatuses
                      ).map((s, idx) => {
                        const sc = statusConfig[s];
                        if (!sc) return null;
                        const Icon = sc.icon;
                        const isActive = s === viewRequest.status;
                        const isPast = !isRejected && idx < currentIdx;
                        const isFuture = !isRejected && idx > currentIdx;
                        return (
                          <div key={s} className="flex items-center gap-3 relative">
                            {idx > 0 && (
                              <div
                                className={`absolute left-[11px] -top-3 w-0.5 h-3 ${
                                  isPast || isActive ? "bg-primary/30" : "bg-border"
                                }`}
                              />
                            )}
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                isActive
                                  ? "bg-primary text-primary-foreground"
                                  : isPast
                                  ? "bg-primary/20 text-primary"
                                  : "bg-secondary text-muted-foreground"
                              }`}
                            >
                              <Icon className="w-3 h-3" />
                            </div>
                            <span
                              className={`text-sm py-2 ${
                                isActive
                                  ? "font-semibold text-foreground"
                                  : isFuture
                                  ? "text-muted-foreground/50"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {sc.label}
                            </span>
                            {isActive && (
                              <Badge variant="outline" className="text-[9px] ml-auto">
                                Étape actuelle
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Notes */}
                    {viewRequest.note && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">Votre note</p>
                        <div className="text-sm bg-secondary/50 rounded-lg p-3 border border-border">
                          {viewRequest.note}
                        </div>
                      </div>
                    )}
                    {viewRequest.admin_note && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">Réponse INKOO</p>
                        <div className="text-sm bg-primary/5 rounded-lg p-3 border border-primary/10">
                          💬 {viewRequest.admin_note}
                        </div>
                      </div>
                    )}

                    {/* Meta */}
                    <p className="text-[11px] text-muted-foreground text-center">
                      Demande créée le{" "}
                      {new Date(viewRequest.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TenantProductRequests;
