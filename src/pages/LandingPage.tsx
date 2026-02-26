import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowRight, Loader2, Package, Truck, Warehouse, Monitor,
  ChevronRight, Shield, BarChart3, Globe, Users, Zap,
  CheckCircle, Star, Clock, HeartHandshake, Palette, Settings2,
  ShoppingBag, Box, ArrowUpRight, Menu, X, HelpCircle
} from "lucide-react";
import heroImg from "@/assets/hero-inkoo.jpg";
import DemoRequestDialog from "@/components/DemoRequestDialog";
import LoginDialog from "@/components/LoginDialog";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import PlatformShowcase from "@/components/landing/PlatformShowcase";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import SEOHead from "@/components/SEOHead";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

const clients = [
  "Midocean", "Stanley/Stella", "PF Concept", "TopTex",
  "Printcom", "Prodir", "Regatta", "Fruit of the Loom", "SG Accessories", "SOL'S",
];

const LandingPage = () => {
  const { session, loading, isSuperAdmin } = useAuth();
  const [demoOpen, setDemoOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();

  const faqItems = [
    { q: t("landing.faq1Q"), a: t("landing.faq1A") },
    { q: t("landing.faq2Q"), a: t("landing.faq2A") },
    { q: t("landing.faq3Q"), a: t("landing.faq3A") },
    { q: t("landing.faq4Q"), a: t("landing.faq4A") },
    { q: t("landing.faq5Q"), a: t("landing.faq5A") },
    { q: t("landing.faq6Q"), a: t("landing.faq6A") },
  ];

  const seoJsonLd = useMemo(() => [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "INKOO B2B",
      "url": "https://inkoo.eu",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://inkoo.eu/?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqItems.map((item) => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": { "@type": "Answer", "text": item.a },
      })),
    },
    ...[
      { name: t("landing.sourcingTitle"), desc: t("landing.sourcingDesc") },
      { name: t("landing.webshopTitle"), desc: t("landing.webshopDesc") },
      { name: t("landing.storageTitle"), desc: t("landing.storageDesc") },
      { name: t("landing.shippingTitle"), desc: t("landing.shippingDesc") },
    ].map((s) => ({
      "@context": "https://schema.org",
      "@type": "Service",
      "name": s.name,
      "description": s.desc,
      "provider": { "@type": "Organization", "name": "INKOO" },
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t]);

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
    { icon: Palette, title: t("landing.sourcingTitle"), desc: t("landing.sourcingDesc") },
    { icon: Monitor, title: t("landing.webshopTitle"), desc: t("landing.webshopDesc") },
    { icon: Warehouse, title: t("landing.storageTitle"), desc: t("landing.storageDesc") },
    { icon: Truck, title: t("landing.shippingTitle"), desc: t("landing.shippingDesc") },
  ];

  const platformFeatures = [
    { icon: Users, title: t("landing.multiTenant"), desc: t("landing.multiTenantDesc") },
    { icon: Shield, title: t("landing.approvalsFeature"), desc: t("landing.approvalsDesc") },
    { icon: BarChart3, title: t("landing.budgetsAnalytics"), desc: t("landing.budgetsAnalyticsDesc") },
    { icon: Settings2, title: t("landing.erpIntegration"), desc: t("landing.erpIntegrationDesc") },
    { icon: Globe, title: t("landing.multilingual"), desc: t("landing.multilingualDesc") },
    { icon: ShoppingBag, title: t("landing.bulkStaffStores"), desc: t("landing.bulkStaffDesc") },
  ];

  const stats = [
    { value: "500+", label: t("landing.brandsServed") },
    { value: "2M+", label: t("landing.itemsShipped") },
    { value: "45", label: t("landing.countriesServed") },
    { value: "98%", label: t("landing.satisfiedClients") },
  ];

  const testimonials = [
    { quote: t("landing.testimonial1"), author: t("landing.testimonial1Author"), role: t("landing.testimonial1Role"), company: t("landing.testimonial1Company") },
    { quote: t("landing.testimonial2"), author: t("landing.testimonial2Author"), role: t("landing.testimonial2Role"), company: t("landing.testimonial2Company") },
    { quote: t("landing.testimonial3"), author: t("landing.testimonial3Author"), role: t("landing.testimonial3Role"), company: t("landing.testimonial3Company") },
  ];




  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Merchandising d'entreprise"
        description="INKOO B2B simplifie le merchandising corporate : sourcing, webshop dédié, stockage, logistique et expédition mondiale. Demandez une démo."
        path="/"
        jsonLd={seoJsonLd}
      />
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <span className="text-xl font-serif tracking-tight">INKOO</span>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#services" className="text-muted-foreground hover:text-foreground transition-colors">{t("landing.servicesSection")}</a>
            <a href="#platform" className="text-muted-foreground hover:text-foreground transition-colors">{t("landing.platformSection")}</a>
            <a href="#how" className="text-muted-foreground hover:text-foreground transition-colors">{t("landing.howItWorks")}</a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
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
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background px-6 py-4 space-y-3 animate-fade-in">
            <a href="#services" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground">{t("landing.servicesSection")}</a>
            <a href="#platform" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground">{t("landing.platformSection")}</a>
            <a href="#how" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground">{t("landing.howItWorks")}</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground">FAQ</a>
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
              {t("landing.b2bPlatform")}
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif leading-[1.08] tracking-tight">
              {t("landing.heroMainTitle")}<br />
              <em className="font-serif">{t("landing.heroMainTitleEm")}</em>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-lg leading-relaxed">
              {t("landing.heroMainDesc")}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-start gap-4">
              <Button size="lg" className="text-base px-8 rounded-full shadow-card-hover" onClick={() => setDemoOpen(true)}>
                {t("landing.requestFreeDemo")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 rounded-full" onClick={() => setLoginOpen(true)}>
                {t("landing.accessMySpace")}
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-accent" /> {t("landing.setupIn48h")}</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-accent" /> {t("landing.noCommitment")}</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-accent" /> {t("landing.dedicatedSupport")}</span>
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
                  <p className="text-sm font-semibold">{t("landing.ordersThisQuarter")}</p>
                  <p className="text-xs text-muted-foreground">{t("landing.thisQuarter")}</p>
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
            <p className="text-sm font-medium text-accent uppercase tracking-wider mb-3">{t("landing.servicesSection")}</p>
            <h2 className="text-3xl md:text-5xl font-serif tracking-tight leading-tight">{t("landing.servicesTitle")}</h2>
            <p className="mt-4 text-muted-foreground text-lg">{t("landing.servicesDesc")}</p>
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
            <p className="text-sm font-medium text-accent uppercase tracking-wider mb-3">{t("landing.platformSection")}</p>
            <h2 className="text-3xl md:text-5xl font-serif tracking-tight leading-tight">{t("landing.platformTitle")}</h2>
            <p className="mt-4 text-muted-foreground text-lg">{t("landing.platformDesc")}</p>
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
            className="text-3xl md:text-5xl font-serif tracking-tight mb-4">{t("landing.howTitle")}</motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            className="text-primary-foreground/70 text-lg mb-16 max-w-xl">{t("landing.howSteps")}</motion.p>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { step: "01", title: t("landing.step1Title"), desc: t("landing.step1Desc"), icon: Palette },
              { step: "02", title: t("landing.step2Title"), desc: t("landing.step2Desc"), icon: Box },
              { step: "03", title: t("landing.step3Title"), desc: t("landing.step3Desc"), icon: Globe },
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
            <p className="text-sm font-medium text-accent uppercase tracking-wider mb-3">{t("landing.testimonials")}</p>
            <h2 className="text-3xl md:text-5xl font-serif tracking-tight">{t("landing.trustTitle")}</h2>
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

      {/* FAQ */}
      <section id="faq" className="py-24 md:py-32 bg-secondary/50">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              <HelpCircle className="w-3.5 h-3.5" />
              FAQ
            </div>
            <h2 className="text-3xl md:text-5xl font-serif tracking-tight">{t("landing.faqTitle")}</h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
            <Accordion type="single" collapsible className="space-y-3">
              {faqItems.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="bg-card rounded-xl border border-border px-6 data-[state=open]:shadow-card-hover transition-shadow">
                  <AccordionTrigger className="text-left font-semibold text-sm hover:no-underline py-5">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-5">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Why choose */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-serif tracking-tight">{t("landing.whyChoose")}</h2>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-8 max-w-4xl mx-auto">
            {[
              { icon: Clock, title: t("landing.setup48h"), desc: t("landing.setup48hDesc") },
              { icon: HeartHandshake, title: t("landing.singleContact"), desc: t("landing.singleContactDesc") },
              { icon: Shield, title: t("landing.qualityGuaranteed"), desc: t("landing.qualityGuaranteedDesc") },
              { icon: BarChart3, title: t("landing.completeReporting"), desc: t("landing.completeReportingDesc") },
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
              <h2 className="text-3xl md:text-5xl font-serif mb-4">{t("landing.ctaReadyTitle")}</h2>
              <p className="text-primary-foreground/70 text-lg mb-10 max-w-lg mx-auto">{t("landing.ctaReadyDesc")}</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" variant="secondary" className="text-base px-8 rounded-full" onClick={() => setDemoOpen(true)}>
                  {t("landing.demoCta")} <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="text-base px-8 rounded-full border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setLoginOpen(true)}>
                  {t("landing.loginCta")} <ChevronRight className="ml-2 h-4 w-4" />
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
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} INKOO B2B. {t("landing.allRights")}</p>
        </div>
      </footer>

      <DemoRequestDialog open={demoOpen} onOpenChange={setDemoOpen} />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
};

export default LandingPage;
