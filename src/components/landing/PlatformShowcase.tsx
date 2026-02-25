import { motion } from "framer-motion";
import { ShoppingBag, BarChart3, Package, Search, Bell, User, ChevronDown, Plus, Eye, TrendingUp, ArrowUpRight, Clock, CheckCircle2, Truck } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

/* ---------- reusable browser chrome ---------- */
const BrowserFrame = ({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-border bg-card shadow-card-hover overflow-hidden ${className}`}>
    {/* title bar */}
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-secondary/60">
      <span className="w-3 h-3 rounded-full bg-destructive/60" />
      <span className="w-3 h-3 rounded-full bg-warning/60" />
      <span className="w-3 h-3 rounded-full bg-success/60" />
      <span className="ml-3 text-xs text-muted-foreground font-medium truncate">{title}</span>
    </div>
    <div className="relative">{children}</div>
  </div>
);

/* ---------- Webshop mockup ---------- */
const WebshopMockup = () => (
  <BrowserFrame title="shop.votreentreprise.com" className="w-full">
    <div className="p-0">
      {/* top nav */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <span className="font-serif text-sm">VOTRE MARQUE</span>
        <div className="flex items-center gap-4 text-muted-foreground">
          <Search className="w-4 h-4" />
          <Bell className="w-4 h-4" />
          <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
            <User className="w-3 h-3 text-accent" />
          </div>
        </div>
      </div>
      {/* product grid */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Boutique Staff</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-1 rounded bg-secondary">Textile</span>
            <span className="px-2 py-1 rounded bg-secondary">Accessoires</span>
            <ChevronDown className="w-3 h-3" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { name: "T-shirt Premium", price: "24,90 €", color: "bg-accent/15" },
            { name: "Hoodie Classic", price: "49,90 €", color: "bg-primary/10" },
            { name: "Casquette Logo", price: "19,90 €", color: "bg-accent/10" },
            { name: "Tote Bag", price: "14,90 €", color: "bg-secondary" },
            { name: "Gourde Inox", price: "22,90 €", color: "bg-accent/20" },
            { name: "Carnet A5", price: "12,90 €", color: "bg-primary/5" },
          ].map((p) => (
            <div key={p.name} className="rounded-lg border border-border overflow-hidden group cursor-pointer hover:shadow-card-hover transition-shadow">
              <div className={`${p.color} h-20 flex items-center justify-center`}>
                <ShoppingBag className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <div className="p-2.5">
                <p className="text-xs font-medium truncate">{p.name}</p>
                <p className="text-xs text-accent font-semibold mt-0.5">{p.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </BrowserFrame>
);

/* ---------- Dashboard mockup ---------- */
const DashboardMockup = () => (
  <BrowserFrame title="app.inkoo.io — Dashboard" className="w-full">
    <div className="p-5 space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Commandes", value: "1 247", icon: Package, trend: "+12%" },
          { label: "Chiffre d'affaires", value: "89,4K€", icon: TrendingUp, trend: "+8%" },
          { label: "En transit", value: "34", icon: Truck, trend: "" },
          { label: "Satisfaction", value: "98%", icon: CheckCircle2, trend: "+2%" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-border p-3 bg-card">
            <div className="flex items-center justify-between mb-2">
              <kpi.icon className="w-4 h-4 text-muted-foreground" />
              {kpi.trend && <span className="text-[10px] text-success font-medium">{kpi.trend}</span>}
            </div>
            <p className="text-lg font-serif">{kpi.value}</p>
            <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>
      {/* mini chart placeholder */}
      <div className="rounded-lg border border-border p-4 bg-card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold">Commandes par mois</p>
          <span className="text-[10px] text-muted-foreground">12 derniers mois</span>
        </div>
        <div className="flex items-end gap-1.5 h-16">
          {[35, 42, 38, 55, 48, 62, 58, 72, 68, 80, 75, 90].map((v, i) => (
            <div key={i} className="flex-1 rounded-sm bg-accent/30 hover:bg-accent/50 transition-colors" style={{ height: `${v}%` }} />
          ))}
        </div>
      </div>
      {/* recent orders */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <p className="text-xs font-semibold">Dernières commandes</p>
          <span className="text-[10px] text-accent cursor-pointer">Tout voir</span>
        </div>
        {[
          { id: "#4521", entity: "Marketing FR", items: 12, status: "Expédiée", statusColor: "text-success" },
          { id: "#4520", entity: "RH Belgique", items: 3, status: "En préparation", statusColor: "text-warning" },
          { id: "#4519", entity: "Sales UK", items: 45, status: "Livrée", statusColor: "text-muted-foreground" },
        ].map((o) => (
          <div key={o.id} className="flex items-center justify-between px-4 py-2 border-b border-border last:border-0 text-xs">
            <span className="font-medium w-14">{o.id}</span>
            <span className="text-muted-foreground flex-1">{o.entity}</span>
            <span className="text-muted-foreground w-16 text-right">{o.items} art.</span>
            <span className={`w-24 text-right font-medium ${o.statusColor}`}>{o.status}</span>
          </div>
        ))}
      </div>
    </div>
  </BrowserFrame>
);

/* ---------- Order management mockup ---------- */
const OrderMockup = () => (
  <BrowserFrame title="app.inkoo.io — Gestion des commandes" className="w-full">
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Commandes</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground">
            <Search className="w-3 h-3" /> Rechercher…
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs flex items-center gap-1">
            <Plus className="w-3 h-3" /> Nouvelle
          </div>
        </div>
      </div>
      {/* table header */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="grid grid-cols-6 gap-2 px-4 py-2 border-b border-border bg-secondary/40 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          <span>Réf.</span><span>Client</span><span>Entité</span><span>Total</span><span>Date</span><span>Statut</span>
        </div>
        {[
          { ref: "#4521", client: "Marie L.", entity: "Marketing", total: "1 240 €", date: "Aujourd'hui", status: "Validée", dot: "bg-success" },
          { ref: "#4520", client: "Thomas D.", entity: "RH", total: "380 €", date: "Hier", status: "En attente", dot: "bg-warning" },
          { ref: "#4519", client: "Sophie M.", entity: "Sales", total: "4 560 €", date: "22 fév.", status: "Expédiée", dot: "bg-accent" },
          { ref: "#4518", client: "Pierre B.", entity: "Tech", total: "890 €", date: "21 fév.", status: "Livrée", dot: "bg-muted-foreground" },
        ].map((r) => (
          <div key={r.ref} className="grid grid-cols-6 gap-2 px-4 py-2.5 border-b border-border last:border-0 text-xs items-center hover:bg-secondary/30 cursor-pointer transition-colors">
            <span className="font-medium">{r.ref}</span>
            <span>{r.client}</span>
            <span className="text-muted-foreground">{r.entity}</span>
            <span className="font-medium">{r.total}</span>
            <span className="text-muted-foreground">{r.date}</span>
            <span className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${r.dot}`} />{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  </BrowserFrame>
);

/* ---------- Main export ---------- */
const PlatformShowcase = () => {
  return (
    <section className="py-24 md:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="max-w-2xl mb-16">
          <p className="text-sm font-medium text-accent uppercase tracking-wider mb-3">Aperçu de la plateforme</p>
          <h2 className="text-3xl md:text-5xl font-serif tracking-tight leading-tight">
            Un outil pensé pour les pros.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Découvrez une interface intuitive qui centralise la gestion de votre merchandising : webshop, commandes, stocks et analytics.
          </p>
        </motion.div>

        {/* Hero screenshot — webshop */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="mb-12">
          <WebshopMockup />
          <p className="text-center text-sm text-muted-foreground mt-4">
            <span className="font-medium text-foreground">Webshop dédié</span> — Vos collaborateurs commandent en autonomie depuis une boutique à vos couleurs.
          </p>
        </motion.div>

        {/* Two-column — dashboard + orders */}
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={fadeUp} custom={2}>
            <DashboardMockup />
            <p className="text-sm text-muted-foreground mt-4">
              <span className="font-medium text-foreground">Dashboard en temps réel</span> — KPIs, graphiques et suivi des commandes.
            </p>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={fadeUp} custom={3}>
            <OrderMockup />
            <p className="text-sm text-muted-foreground mt-4">
              <span className="font-medium text-foreground">Gestion des commandes</span> — Filtres, validations et suivi détaillé.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PlatformShowcase;
