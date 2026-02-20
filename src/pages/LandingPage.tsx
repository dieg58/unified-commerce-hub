import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import {
  Store,
  ShieldCheck,
  Users,
  BarChart3,
  Package,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";

const features = [
  {
    icon: Store,
    title: "Boutiques personnalisées",
    desc: "Chaque entreprise dispose de sa propre boutique avec branding, catalogue et prix sur mesure.",
  },
  {
    icon: Users,
    title: "Gestion multi-tenant",
    desc: "Gérez des dizaines de clients depuis un seul tableau de bord centralisé.",
  },
  {
    icon: ShieldCheck,
    title: "Contrôle des budgets",
    desc: "Définissez des enveloppes budgétaires par entité, département ou période.",
  },
  {
    icon: Package,
    title: "Catalogue flexible",
    desc: "Produits en stock ou sur-mesure, variantes, catégories — tout est configurable.",
  },
  {
    icon: BarChart3,
    title: "Statistiques en temps réel",
    desc: "Suivez les commandes, le chiffre d'affaires et les tendances par boutique.",
  },
  {
    icon: CreditCard,
    title: "Facturation intégrée",
    desc: "Profils de facturation, adresses multiples et suivi des commandes automatisé.",
  },
];

const benefits = [
  "Déploiement rapide en quelques minutes",
  "Sous-domaine dédié par client",
  "Rôles & permissions granulaires",
  "Interface intuitive pour les employés",
  "Support multi-devises",
  "Tableau de bord Super Admin complet",
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const LandingPage = () => {
  const { session, loading, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect authenticated users to their dashboard
  if (session) {
    if (isSuperAdmin) return <Navigate to="/dashboard" replace />;
    return <Navigate to="/shop" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <Store className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">Inkoo</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Se connecter</Link>
            </Button>
            <Button asChild>
              <Link to="/login">Commencer</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-[0.04]" />
        <div className="container mx-auto px-4 py-24 md:py-32 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              Plateforme B2B nouvelle génération
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight max-w-3xl mx-auto">
              La boutique en ligne
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                pour vos collaborateurs
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Créez des boutiques personnalisées pour chaque entreprise cliente.
              Gérez les catalogues, budgets et commandes depuis une seule plateforme.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-base px-8" asChild>
                <Link to="/login">
                  Accéder à la plateforme
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8" asChild>
                <a href="#features">Découvrir les fonctionnalités</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-28 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Tout ce qu'il faut pour le B2B
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
              Une suite complète pour gérer vos boutiques entreprise de A à Z.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
              >
                <Card className="h-full border-border/60 hover:shadow-card-hover transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center mb-4">
                      <f.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {f.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
                Pourquoi choisir Inkoo ?
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Simplifiez la gestion de vos boutiques B2B avec une plateforme pensée
                pour la scalabilité et la simplicité d'utilisation.
              </p>
            </div>
            <div className="space-y-4">
              {benefits.map((b, i) => (
                <motion.div
                  key={b}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="flex items-center gap-3"
                >
                  <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                  <span className="font-medium">{b}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="rounded-2xl gradient-primary p-12 md:p-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Prêt à démarrer ?
            </h2>
            <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto mb-8">
              Connectez-vous pour accéder à votre espace de gestion ou découvrir votre boutique.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="text-base px-8"
              asChild
            >
              <Link to="/login">
                Se connecter
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Inkoo. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
