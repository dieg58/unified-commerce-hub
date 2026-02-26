import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cookie, X, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_KEY = "inkoo_cookie_consent";

const getStoredConsent = (): CookiePreferences | null => {
  try {
    const raw = localStorage.getItem(COOKIE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = useCallback((prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify(prefs));
    setVisible(false);
  }, []);

  const acceptAll = () => {
    const all: CookiePreferences = { necessary: true, analytics: true, marketing: true };
    setPreferences(all);
    saveConsent(all);
  };

  const rejectOptional = () => {
    const minimal: CookiePreferences = { necessary: true, analytics: false, marketing: false };
    setPreferences(minimal);
    saveConsent(minimal);
  };

  const saveCustom = () => {
    saveConsent(preferences);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-[100] bg-card border border-border rounded-2xl shadow-card-hover p-6"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Cookie className="w-5 h-5 text-accent shrink-0" />
              <h3 className="font-semibold text-sm">Gestion des cookies</h3>
            </div>
            <button onClick={rejectOptional} className="p-1 rounded-md hover:bg-secondary transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Nous utilisons des cookies pour améliorer votre expérience. Les cookies nécessaires assurent le bon fonctionnement du site.
            Vous pouvez personnaliser vos préférences.{" "}
            <Link to="/politique-de-confidentialite" className="underline hover:text-foreground">
              En savoir plus
            </Link>
          </p>

          {/* Details toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            Personnaliser
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 mb-4 border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium">Nécessaires</p>
                      <p className="text-[11px] text-muted-foreground">Essentiels au fonctionnement du site</p>
                    </div>
                    <Switch checked disabled className="data-[state=checked]:bg-accent" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium">Analytiques</p>
                      <p className="text-[11px] text-muted-foreground">Mesure d'audience et performance</p>
                    </div>
                    <Switch
                      checked={preferences.analytics}
                      onCheckedChange={(v) => setPreferences((p) => ({ ...p, analytics: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium">Marketing</p>
                      <p className="text-[11px] text-muted-foreground">Publicités personnalisées et suivi</p>
                    </div>
                    <Switch
                      checked={preferences.marketing}
                      onCheckedChange={(v) => setPreferences((p) => ({ ...p, marketing: v }))}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2">
            {showDetails ? (
              <>
                <Button size="sm" variant="outline" className="flex-1 rounded-full text-xs" onClick={rejectOptional}>
                  Refuser optionnels
                </Button>
                <Button size="sm" className="flex-1 rounded-full text-xs" onClick={saveCustom}>
                  Enregistrer
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" className="flex-1 rounded-full text-xs" onClick={rejectOptional}>
                  Refuser
                </Button>
                <Button size="sm" className="flex-1 rounded-full text-xs" onClick={acceptAll}>
                  Tout accepter
                </Button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
