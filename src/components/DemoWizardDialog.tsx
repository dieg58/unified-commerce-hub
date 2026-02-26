import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, ArrowLeft, Loader2, CheckCircle, Globe, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

interface DemoWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DemoWizardDialog = ({ open, onOpenChange }: DemoWizardDialogProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2 fields
  const [websiteUrl, setWebsiteUrl] = useState("");

  const resetForm = () => {
    setStep(1);
    setFullName("");
    setEmail("");
    setCompany("");
    setPhone("");
    setWebsiteUrl("");
    setError("");
    setLoading(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setStep(3);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("create-demo-tenant", {
        body: { full_name: fullName, email, company, phone, website_url: websiteUrl },
      });

      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);

      // Auto-login
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInErr) throw new Error(signInErr.message);

      setLoading(false);

      // Small delay then redirect
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
        navigate("/tenant");
      }, 2000);
    } catch (err: any) {
      console.error("Demo creation failed:", err);
      setError(err.message || "Une erreur est survenue");
      setLoading(false);
      setStep(2);
    }
  };

  const canProceedStep1 = fullName.trim() && email.trim() && company.trim();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { onOpenChange(v); if (!v) resetForm(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">
            {step === 1 && "Créer ma boutique démo"}
            {step === 2 && "Personnaliser ma boutique"}
            {step === 3 && (loading ? "Création en cours…" : "Votre boutique est prête !")}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Renseignez vos coordonnées pour créer votre espace démo en quelques secondes."}
            {step === 2 && "Optionnel : ajoutez votre site web pour personnaliser automatiquement votre boutique."}
            {step === 3 && (loading ? "Nous configurons votre espace, patientez…" : "Vous allez être redirigé vers votre tableau de bord.")}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="demo-name">Nom complet *</Label>
                <Input id="demo-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jean Dupont" maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-email">Email professionnel *</Label>
                <Input id="demo-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jean@entreprise.com" maxLength={255} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-company">Entreprise *</Label>
                <Input id="demo-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Mon Entreprise SA" maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-phone">Téléphone</Label>
                <Input id="demo-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+32 470 00 00 00" maxLength={30} />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button className="w-full rounded-full" disabled={!canProceedStep1} onClick={() => { setError(""); setStep(2); }}>
                Continuer <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="demo-website" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" /> URL de votre site web
                </Label>
                <Input
                  id="demo-website"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="www.mon-entreprise.com"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  Si fourni, nous extrairons automatiquement vos couleurs et votre logo pour personnaliser votre boutique.
                </p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                </Button>
                <Button className="flex-1 rounded-full" onClick={handleSubmit}>
                  <Sparkles className="mr-2 h-4 w-4" /> Créer ma boutique
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-8 gap-4">
              {loading ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground text-center">
                    Configuration de votre boutique, extraction du branding, ajout des produits démo…
                  </p>
                  <Progress value={60} className="w-full max-w-xs h-2" />
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="font-semibold text-lg">Bienvenue, {fullName.split(" ")[0]} !</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Votre boutique démo est prête. Vous êtes connecté en tant que gestionnaire de boutique.
                  </p>
                  <p className="text-xs text-muted-foreground">Redirection automatique…</p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default DemoWizardDialog;
