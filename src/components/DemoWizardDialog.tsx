import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, ArrowLeft, Loader2, CheckCircle, Globe, Sparkles, Store, Package, Settings, Palette } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

interface DemoWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FREE_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "yahoo.fr", "hotmail.com", "hotmail.fr",
  "outlook.com", "outlook.fr", "live.com", "live.fr", "aol.com",
  "icloud.com", "me.com", "mail.com", "gmx.com", "gmx.fr",
  "protonmail.com", "proton.me", "ymail.com", "msn.com",
  "wanadoo.fr", "orange.fr", "free.fr", "sfr.fr", "laposte.net",
  "bbox.fr", "numericable.fr",
];

const PHONE_REGEX = /^\+?[\d\s\-().]{7,25}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const URL_REGEX = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$/i;

const CREATION_STEPS = [
  { icon: Globe, labelKey: "demoWizard.stepAnalyze" },
  { icon: Palette, labelKey: "demoWizard.stepBranding" },
  { icon: Store, labelKey: "demoWizard.stepCreateSpace" },
  { icon: Package, labelKey: "demoWizard.stepAddProducts" },
  { icon: Settings, labelKey: "demoWizard.stepConfigure" },
];

const DemoWizardDialog = ({ open, onOpenChange }: DemoWizardDialogProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [activeCreationStep, setActiveCreationStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [creationDone, setCreationDone] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  const resetForm = () => {
    setStep(1);
    setFullName(""); setEmail(""); setCompany(""); setPhone(""); setWebsiteUrl("");
    setError(""); setFieldErrors({}); setLoading(false);
    setActiveCreationStep(0); setCompletedSteps([]); setCreationDone(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = "Le nom est requis";
    if (!email.trim()) {
      errors.email = "L'email est requis";
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = "Email invalide";
    } else {
      const domain = email.trim().split("@")[1]?.toLowerCase();
      if (FREE_EMAIL_DOMAINS.includes(domain)) {
        errors.email = "Merci d'utiliser votre email professionnel";
      }
    }
    if (!company.trim()) errors.company = "L'entreprise est requise";
    if (!phone.trim()) {
      errors.phone = "Le téléphone est requis";
    } else if (!PHONE_REGEX.test(phone.trim())) {
      errors.phone = "Numéro de téléphone invalide";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!websiteUrl.trim()) {
      errors.websiteUrl = "L'URL du site web est requise";
    } else if (!URL_REGEX.test(websiteUrl.trim())) {
      errors.websiteUrl = "URL invalide (ex: www.mon-entreprise.com)";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Simulated step progression for creation phase
  useEffect(() => {
    if (step !== 3 || !loading) return;
    setActiveCreationStep(0);
    setCompletedSteps([]);
    let currentStep = 0;

    const intervals = [2000, 2500, 2000, 3000, 2000]; // ms per step
    const advanceStep = () => {
      setCompletedSteps(prev => [...prev, currentStep]);
      currentStep++;
      if (currentStep < CREATION_STEPS.length) {
        setActiveCreationStep(currentStep);
        timerRef.current = setTimeout(advanceStep, intervals[currentStep]);
      }
    };

    timerRef.current = setTimeout(advanceStep, intervals[0]);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [step, loading]);

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

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (signInErr) throw new Error(signInErr.message);

      // Mark all steps as complete
      setCompletedSteps([0, 1, 2, 3, 4]);
      setActiveCreationStep(5);
      setLoading(false);
      setCreationDone(true);

      setTimeout(() => {
        onOpenChange(false);
        resetForm();
        navigate("/tenant?demo=1");
      }, 2000);
    } catch (err: any) {
      console.error("Demo creation failed:", err);
      setError(err.message || "Une erreur est survenue");
      setLoading(false);
      setStep(2);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  };

  const progressValue = step === 3
    ? creationDone
      ? 100
      : Math.min((completedSteps.length / CREATION_STEPS.length) * 100 + 10, 95)
    : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { onOpenChange(v); if (!v) resetForm(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">
            {step === 1 && t("demoWizard.titleStep1")}
            {step === 2 && t("demoWizard.titleStep2")}
            {step === 3 && (loading ? t("demoWizard.titleCreating") : t("demoWizard.titleReady"))}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && t("demoWizard.descStep1")}
            {step === 2 && t("demoWizard.descStep2")}
            {step === 3 && (loading ? t("demoWizard.descCreating") : t("demoWizard.descReady"))}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="demo-name">{t("demoWizard.fullName")} *</Label>
                <Input id="demo-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jean Dupont" maxLength={100} className={fieldErrors.fullName ? "border-destructive" : ""} />
                {fieldErrors.fullName && <p className="text-xs text-destructive">{fieldErrors.fullName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-email">{t("demoWizard.email")} *</Label>
                <Input id="demo-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jean@entreprise.com" maxLength={255} className={fieldErrors.email ? "border-destructive" : ""} />
                {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-company">{t("demoWizard.company")} *</Label>
                <Input id="demo-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Mon Entreprise SA" maxLength={100} className={fieldErrors.company ? "border-destructive" : ""} />
                {fieldErrors.company && <p className="text-xs text-destructive">{fieldErrors.company}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-phone">{t("demoWizard.phone")} *</Label>
                <Input id="demo-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+32 470 00 00 00" maxLength={30} className={fieldErrors.phone ? "border-destructive" : ""} />
                {fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone}</p>}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="w-full rounded-full" onClick={() => { if (validateStep1()) { setError(""); setStep(2); } }}>
                {t("common.next")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="demo-website" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" /> {t("demoWizard.websiteUrl")} *
                </Label>
                <Input id="demo-website" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="www.mon-entreprise.com" maxLength={500} className={fieldErrors.websiteUrl ? "border-destructive" : ""} />
                {fieldErrors.websiteUrl && <p className="text-xs text-destructive">{fieldErrors.websiteUrl}</p>}
                <p className="text-xs text-muted-foreground">{t("demoWizard.websiteHint")}</p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> {t("common.back")}
                </Button>
                <Button className="flex-1 rounded-full" onClick={() => { if (validateStep2()) handleSubmit(); }}>
                  <Sparkles className="mr-2 h-4 w-4" /> {t("demoWizard.createShop")}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-6 space-y-5">
              {!creationDone ? (
                <>
                  <div className="space-y-3">
                    {CREATION_STEPS.map((cs, idx) => {
                      const isCompleted = completedSteps.includes(idx);
                      const isActive = activeCreationStep === idx && !isCompleted;
                      const isPending = idx > activeCreationStep;
                      const Icon = cs.icon;

                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                            isActive ? "bg-primary/5 border border-primary/20" :
                            isCompleted ? "bg-accent/5" : "opacity-50"
                          }`}
                        >
                          <div className="shrink-0">
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5 text-accent" />
                            ) : isActive ? (
                              <Loader2 className="w-5 h-5 text-primary animate-spin" />
                            ) : (
                              <Icon className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <span className={`text-sm ${
                            isActive ? "text-foreground font-medium" :
                            isCompleted ? "text-foreground" : "text-muted-foreground"
                          }`}>
                            {t(cs.labelKey)}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                  <Progress value={progressValue} className="w-full h-2" />
                </>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-4">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="font-semibold text-lg">{t("demoWizard.welcome", { name: fullName.split(" ")[0] })}</h3>
                  <p className="text-sm text-muted-foreground text-center">{t("demoWizard.readyMessage")}</p>
                  <p className="text-xs text-muted-foreground">{t("demoWizard.redirecting")}</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default DemoWizardDialog;
