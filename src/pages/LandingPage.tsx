import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, Loader2, Package, Truck, Warehouse, Monitor, ChevronRight } from "lucide-react";
import heroImg from "@/assets/hero-merch.jpg";
import webshopImg from "@/assets/services-webshop.jpg";
import storageImg from "@/assets/services-storage.jpg";
import shippingImg from "@/assets/services-shipping.jpg";
import DemoRequestDialog from "@/components/DemoRequestDialog";
import LoginDialog from "@/components/LoginDialog";

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

const services = [
  {
    icon: Package,
    title: "Merch sur mesure",
    desc: "Nous sourceons et personnalisons les meilleurs produits pour votre marque. Textile, objets, goodies — tout est brandé à votre image.",
    image: webshopImg,
  },
  {
    icon: Monitor,
    title: "Webshop dédié",
    desc: "Un e-shop à vos couleurs où vos collaborateurs commandent en autonomie. Gestion des droits, budgets et catalogues intégrée.",
    image: storageImg,
  },
  {
    icon: Warehouse,
    title: "Stockage & logistique",
    desc: "Nous stockons votre merch dans nos entrepôts. Gestion des stocks en temps réel, réassort automatique, zéro contrainte pour vous.",
    image: storageImg,
  },
  {
    icon: Truck,
    title: "Expédition mondiale",
    desc: "Envoi individuel ou en masse, en France et à l'international. Suivi en temps réel et packaging soigné.",
    image: shippingImg,
  },
];

const testimonials = [
  {
    quote: "Inkoo a transformé notre gestion de dotation. Nos collaborateurs commandent en autonomie et nous avons divisé par 3 le temps de traitement.",
    author: "Marie Lefèvre",
    role: "Directrice RH",
    company: "Groupe Véolia",
  },
  {
    quote: "Le webshop est magnifique, parfaitement intégré à notre branding. La mise en place a été ultra rapide.",
    author: "Thomas Durand",
    role: "Directeur Marketing",
    company: "Bouygues Telecom",
  },
  {
    quote: "Enfin une solution complète : sourcing, stockage, expédition. On ne gère plus rien, Inkoo s'occupe de tout.",
    author: "Sophie Martin",
    role: "Responsable Achats",
    company: "Accor Hotels",
  },
];

const LandingPage = () => {
  const { session, loading, isSuperAdmin } = useAuth();
  const [demoOpen, setDemoOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <span className="text-xl font-serif tracking-tight">Inkoo</span>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#services" className="text-muted-foreground hover:text-foreground transition-colors">Services</a>
            <a href="#how" className="text-muted-foreground hover:text-foreground transition-colors">Comment ça marche</a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Témoignages</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="rounded-full px-6" onClick={() => setLoginOpen(true)}>
              Se connecter
            </Button>
            <Button size="sm" className="rounded-full px-6" onClick={() => setDemoOpen(true)}>
              Demander une démo
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-32 grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif leading-[1.1] tracking-tight">
              Du beau merch,
              <br />
              <em className="font-serif">pour votre marque.</em>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-md leading-relaxed">
              Nous créons, stockons et expédions le merchandising de votre entreprise. Vos collaborateurs commandent depuis un webshop dédié.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-start gap-4">
              <Button size="lg" className="text-base px-8 rounded-full" onClick={() => setLoginOpen(true)}>
                  Accéder à la plateforme
                  <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 rounded-full" asChild>
                <a href="#services">Découvrir nos services</a>
              </Button>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <img
              src={heroImg}
              alt="Collection de merchandising corporate premium"
              className="w-full h-[400px] md:h-[520px] object-cover rounded-2xl"
            />
          </motion.div>
        </div>
      </section>

      {/* Client logos ticker */}
      <section className="border-y border-border py-6 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...clients, ...clients].map((name, i) => (
            <span
              key={i}
              className="mx-8 text-sm font-medium text-muted-foreground/60 uppercase tracking-widest"
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="max-w-2xl mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-serif tracking-tight leading-tight">
              Une solution complète pour votre merch d'entreprise.
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Du sourcing à l'expédition, nous gérons tout pour que vous n'ayez plus à y penser.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {services.map((s, i) => (
              <motion.div
                key={s.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
                className="group relative overflow-hidden rounded-2xl bg-card border border-border hover:shadow-card-hover transition-all duration-300"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={s.image}
                    alt={s.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-3">
                    <s.icon className="h-5 w-5 text-accent" />
                    <h3 className="text-lg font-semibold">{s.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 md:py-32 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-6">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-3xl md:text-5xl font-serif tracking-tight mb-16"
          >
            Comment ça marche ?
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: "01",
                title: "On source & on crée",
                desc: "Nous sélectionnons les meilleurs produits et les personnalisons avec votre branding. Vous validez, on produit.",
              },
              {
                step: "02",
                title: "On stocke & on gère",
                desc: "Votre merch est stocké dans nos entrepôts. Votre webshop dédié permet à vos équipes de commander en toute autonomie.",
              },
              {
                step: "03",
                title: "On expédie partout",
                desc: "Commande individuelle ou en masse, en France ou à l'international. Packaging soigné, suivi en temps réel.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <span className="text-5xl font-serif text-primary-foreground/20">{item.step}</span>
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
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-3xl md:text-5xl font-serif tracking-tight mb-16"
          >
            Ils nous font confiance
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.author}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
                className="flex flex-col"
              >
                <p className="text-lg leading-relaxed flex-1 mb-8">
                  "{t.quote}"
                </p>
                <div className="border-t border-border pt-4">
                  <p className="font-semibold">{t.author}</p>
                  <p className="text-sm text-muted-foreground">
                    {t.role} — {t.company}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-2xl bg-primary text-primary-foreground p-12 md:p-20 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-lg">
              <h2 className="text-3xl md:text-4xl font-serif mb-4">
                Prêt à simplifier votre merch ?
              </h2>
              <p className="text-primary-foreground/70 text-lg">
                Connectez-vous pour accéder à votre espace ou demandez une démo personnalisée.
              </p>
            </div>
            <Button
              size="lg"
              variant="secondary"
              className="text-base px-8 rounded-full shrink-0"
              onClick={() => setLoginOpen(true)}
            >
                Se connecter
                <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-lg font-serif">Inkoo</span>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Inkoo. Tous droits réservés.
          </p>
        </div>
      </footer>

      <DemoRequestDialog open={demoOpen} onOpenChange={setDemoOpen} />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
};

export default LandingPage;
