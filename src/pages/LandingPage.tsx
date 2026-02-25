import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowRight, Loader2, Package, Truck, Warehouse, Monitor,
  ChevronRight, Shield, BarChart3, Globe, Users, Zap,
  CheckCircle, Star, Clock, HeartHandshake, Palette, Settings2,
  ShoppingBag, Box, ArrowUpRight, Menu, X
} from "lucide-react";
import heroImg from "@/assets/hero-inkoo.jpg";
import DemoRequestDialog from "@/components/DemoRequestDialog";
import LoginDialog from "@/components/LoginDialog";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import PlatformShowcase from "@/components/landing/PlatformShowcase";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

const clients = [
  "Spotify", "Deloitte", "Deliveroo", "Dior", "Accenture", "Oatly",
  "WeTransfer", "Bain & Company", "Caudalie", "Highsnobiety",
];

const LandingPage = () => {
  const { session, loading, isSuperAdmin } = useAuth();
  const [demoOpen, setDemoOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (session) {
    if (isSuperAdmin) return <Navigate to="/dashboard" replace />;
    return <Navigate to="/shop" replace />;
  }

  const features = [
    {
      icon: Palette,
      title: "Sourcing & création",
      desc: "Nous trouvons et personnalisons les meilleurs produits pour votre marque. Textile premium, goodies, objets — tout est brandé à votre image.",
    },
    {
      icon: Monitor,
      title: "Webshop dédié",
      desc: "Une boutique en ligne à vos couleurs. Vos collaborateurs commandent en autonomie avec gestion des droits, budgets et catalogues.",
    },
    {
      icon: Warehouse,
      title: "Stockage & logistique",
      desc: "Nous stockons votre merch dans nos entrepôts. Gestion des stocks en temps réel, réassort automatique, zéro contrainte.",
    },
    {
      icon: Truck,
      title: "Expédition mondiale",
      desc: "Envoi individuel ou en masse, en France et à l'international. Suivi en temps réel et packaging soigné.",
    },
  ];

  const platformFeatures = [
    { icon: Users, title: "Multi-tenant", desc: "Gérez plusieurs boutiques et entités depuis une seule plateforme." },
    { icon: Shield, title: "Approbations", desc: "Workflow de validation configurable par entité avec alertes automatiques." },
    { icon: BarChart3, title: "Budgets & analytics", desc: "Budgets par entité et par utilisateur, statistiques temps réel." },
    { icon: Settings2, title: "ERP intégré", desc: "Synchronisation automatique avec votre ERP (Odoo, SAP…)." },
    { icon: Globe, title: "Multilingue", desc: "Interface disponible en français, anglais et néerlandais." },
    { icon: ShoppingBag, title: "Boutiques Bulk & Staff", desc: "Commandes en gros et dotation individuelle dans un seul outil." },
  ];

  const stats = [
    { value: "500+", label: "Marques accompagnées" },
    { value: "2M+", label: "Articles expédiés" },
    { value: "45", label: "Pays livrés" },
    { value: "98%", label: "Clients satisfaits" },
  ];

  const testimonials = [
    {
      quote: "INKOO a transformé notre gestion de dotation. Nos collaborateurs commandent en autonomie et nous avons divisé par 3 le temps de traitement.",
      author: "Marie Lefèvre", role: "Directrice RH", company: "Groupe Véolia",
    },
    {
      quote: "Le webshop est magnifique, parfaitement intégré à notre branding. La mise en place a été ultra rapide.",
      author: "Thomas Durand", role: "Directeur Marketing", company: "Bouygues Telecom",
    },
    {
      quote: "Enfin une solution complète : sourcing, stockage, expédition. On ne gère plus rien, INKOO s'occupe de tout.",
      author: "Sophie Martin", role: "Responsable Achats", company: "Accor Hotels",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <span className="text-xl font-serif tracking-tight">INKOO</span>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#services" className="text-muted-foreground hover:text-foreground transition-colors">{t("landing.servicesSection")}</a>
            <a href="#platform" className="text-muted-foreground hover:text-foreground transition-colors">{t("landing.platformSection")}</a>
            <a href="#how" className="text-muted-foreground hover:text-foreground transition-colors">{t("landing.howItWorks")}</a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">{t("landing.testimonials")}</a>
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="ghost" />
            <Button variant="outline" size="sm" className="rounded-full px-6 hidden sm:inline-flex" onClick={() => setLoginOpen(true)}>
              {t("landing.login")}
            </Button>
            <Button size="sm" className="rounded-full px-6 hidden sm:inline-flex" onClick={() => setDemoOpen(true)}>
              {t("landing.requestDemo")}
            </Button>
            <button
              className="md:hidden p-2 rounded-md hover:bg-secondary transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background px-6 py-4 space-y-3 animate-fade-in">
            <a href="#services" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground">{t("landing.servicesSection")}</a>
            <a href="#platform" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground">{t("landing.platformSection")}</a>
            <a href="#how" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground">{t("landing.howItWorks")}</a>
            <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground">{t("landing.testimonials")}</a>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="rounded-full flex-1" onClick={() => { setLoginOpen(true); setMobileMenuOpen(false); }}>
                {t("landing.login")}
              </Button>
              <Button size="sm" className="rounded-full flex-1" onClick={() => { setDemoOpen(true); setMobileMenuOpen(false); }}>
                {t("landing.requestDemo")}
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-32 grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
              <Zap className="w-3.5 h-3.5" />
              La plateforme B2B de merchandising
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif leading-[1.08] tracking-tight">
              Votre merch corporate,<br />
              <em className="font-serif">simplifié.</em>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-lg leading-relaxed">
              INKOO gère tout votre merchandising d'entreprise de A à Z : sourcing, webshop dédié, stockage, logistique et expédition dans 45+ pays.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-start gap-4">
              <Button size="lg" className="text-base px-8 rounded-full shadow-card-hover" onClick={() => setDemoOpen(true)}>
                Demander une démo gratuite <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 rounded-full" onClick={() => setLoginOpen(true)}>
                Accéder à mon espace
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-accent" /> Setup en 48h</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-accent" /> Sans engagement</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-accent" /> Support dédié</span>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative">
            <img src={heroImg} alt="Collection de merchandising corporate premium INKOO" className="w-full h-[400px] md:h-[520px] object-cover rounded-2xl shadow-card-hover" />
            <div className="absolute -bottom-4 -left-4 bg-card border border-border rounded-xl p-4 shadow-card-hover">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold">+12 400 commandes</p>
                  <p className="text-xs text-muted-foreground">Ce trimestre</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Client logos ticker */}
      <section className="border-y border-border py-6 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...clients, ...clients].map((name, i) => (
            <span key={i} className="mx-8 text-sm font-medium text-muted-foreground/60 uppercase tracking-widest">{name}</span>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <motion.div key={s.label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center">
                <p className="text-4xl md:text-5xl font-serif text-foreground">{s.value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="max-w-2xl mb-16">
            <p className="text-sm font-medium text-accent uppercase tracking-wider mb-3">Services</p>
            <h2 className="text-3xl md:text-5xl font-serif tracking-tight leading-tight">
              Tout ce dont vous avez besoin, rien de superflu.
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">Du sourcing à l'expédition, nous gérons chaque étape pour que vous vous concentriez sur l'essentiel.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((s, i) => (
              <motion.div key={s.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={fadeUp}
                className="group relative overflow-hidden rounded-2xl bg-card border border-border p-8 hover:shadow-card-hover transition-all duration-300">
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <s.icon className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform showcase (screenshots) */}
      <PlatformShowcase />

      {/* Platform features */}
      <section id="platform" className="py-24 md:py-32 bg-secondary/50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="max-w-2xl mb-16">
            <p className="text-sm font-medium text-accent uppercase tracking-wider mb-3">Plateforme</p>
            <h2 className="text-3xl md:text-5xl font-serif tracking-tight leading-tight">
              Une plateforme pensée pour le B2B.
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">Fonctionnalités avancées conçues spécifiquement pour la gestion de merchandising en entreprise.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {platformFeatures.map((f, i) => (
              <motion.div key={f.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={fadeUp}
                className="bg-card rounded-xl border border-border p-6 hover:shadow-card-hover transition-all duration-300">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 md:py-32 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-6">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-3xl md:text-5xl font-serif tracking-tight mb-4">Comment ça marche ?</motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            className="text-primary-foreground/70 text-lg mb-16 max-w-xl">3 étapes simples pour externaliser votre merchandising.</motion.p>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { step: "01", title: "On source & on crée", desc: "Nous sélectionnons les meilleurs produits et les personnalisons avec votre branding. Vous validez, on produit.", icon: Palette },
              { step: "02", title: "On stocke & on gère", desc: "Votre merch est stocké dans nos entrepôts. Votre webshop dédié permet à vos équipes de commander en toute autonomie.", icon: Box },
              { step: "03", title: "On expédie partout", desc: "Commande individuelle ou en masse, en France ou à l'international. Packaging soigné, suivi en temps réel.", icon: Globe },
            ].map((item, i) => (
              <motion.div key={item.step} custom={i + 2} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <div className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center mb-6">
                  <item.icon className="h-6 w-6 text-primary-foreground/80" />
                </div>
                <span className="text-5xl font-serif text-primary-foreground/15">{item.step}</span>
                <h3 className="text-xl font-semibold mt-4 mb-3">{item.title}</h3>
                <p className="text-primary-foreground/70 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="max-w-2xl mb-16">
            <p className="text-sm font-medium text-accent uppercase tracking-wider mb-3">Témoignages</p>
            <h2 className="text-3xl md:text-5xl font-serif tracking-tight">Ils nous font confiance</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((tt, i) => (
              <motion.div key={tt.author} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={fadeUp}
                className="flex flex-col bg-card rounded-xl border border-border p-8">
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-accent text-accent" />)}
                </div>
                <p className="text-base leading-relaxed flex-1 mb-6">"{tt.quote}"</p>
                <div className="border-t border-border pt-4">
                  <p className="font-semibold">{tt.author}</p>
                  <p className="text-sm text-muted-foreground">{tt.role} — {tt.company}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ-like benefits */}
      <section className="py-24 md:py-32 bg-secondary/50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-serif tracking-tight">Pourquoi choisir INKOO ?</h2>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-8 max-w-4xl mx-auto">
            {[
              { icon: Clock, title: "Mise en place en 48h", desc: "Votre webshop personnalisé est opérationnel en moins de 2 jours. Pas de développement, pas d'intégration complexe." },
              { icon: HeartHandshake, title: "Un interlocuteur unique", desc: "Un account manager dédié gère tout pour vous : sourcing, production, logistique, SAV." },
              { icon: Shield, title: "Qualité garantie", desc: "Nous sélectionnons uniquement des fournisseurs certifiés. Chaque produit est contrôlé avant expédition." },
              { icon: BarChart3, title: "Reporting complet", desc: "Statistiques en temps réel sur les commandes, budgets, stocks et performances par entité." },
            ].map((b, i) => (
              <motion.div key={b.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-1">
                  <b.icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-2xl bg-primary text-primary-foreground p-12 md:p-20 text-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="text-3xl md:text-5xl font-serif mb-4">Prêt à simplifier votre merchandising ?</h2>
              <p className="text-primary-foreground/70 text-lg mb-10 max-w-lg mx-auto">
                Rejoignez les 500+ marques qui font confiance à INKOO pour leur merchandising corporate.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" variant="secondary" className="text-base px-8 rounded-full" onClick={() => setDemoOpen(true)}>
                  Demander une démo gratuite <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="text-base px-8 rounded-full border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setLoginOpen(true)}>
                  Se connecter <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-lg font-serif">INKOO</span>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} INKOO B2B. Tous droits réservés.</p>
        </div>
      </footer>

      <DemoRequestDialog open={demoOpen} onOpenChange={setDemoOpen} />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
};

export default LandingPage;
