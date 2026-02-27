import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

interface TourStep {
  selector: string;
  titleKey: string;
  descKey: string;
  placement?: "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
  { selector: "[data-tour='sidebar']", titleKey: "tour.sidebarTitle", descKey: "tour.sidebarDesc", placement: "right" },
  { selector: "[data-tour='kpis']", titleKey: "tour.kpisTitle", descKey: "tour.kpisDesc", placement: "bottom" },
  { selector: "[data-tour='onboarding']", titleKey: "tour.onboardingTitle", descKey: "tour.onboardingDesc", placement: "bottom" },
  { selector: "[data-tour='view-shop']", titleKey: "tour.viewShopTitle", descKey: "tour.viewShopDesc", placement: "right" },
  { selector: "[data-tour='help-bubble']", titleKey: "tour.helpTitle", descKey: "tour.helpDesc", placement: "top" },
];

const STORAGE_KEY = "inkoo_tour_completed";

interface GuidedTourProps {
  active: boolean;
}

const GuidedTour = ({ active }: GuidedTourProps) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    if (localStorage.getItem(STORAGE_KEY) === "true") return;
    // Delay to let the dashboard render
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [active]);

  const updatePosition = useCallback(() => {
    if (!visible) return;
    const step = TOUR_STEPS[currentStep];
    const el = document.querySelector(step.selector);
    if (!el) {
      // Try next step if element not found
      if (currentStep < TOUR_STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        finish();
      }
      return;
    }
    const r = el.getBoundingClientRect();
    setRect(r);

    const placement = step.placement || "bottom";
    const pad = 12;
    let top = 0, left = 0;
    const tw = 320; // tooltip width estimate

    switch (placement) {
      case "right":
        top = r.top + r.height / 2;
        left = r.right + pad;
        break;
      case "left":
        top = r.top + r.height / 2;
        left = r.left - tw - pad;
        break;
      case "top":
        top = r.top - pad;
        left = r.left + r.width / 2 - tw / 2;
        break;
      case "bottom":
      default:
        top = r.bottom + pad;
        left = r.left + r.width / 2 - tw / 2;
        break;
    }

    // Clamp to viewport
    left = Math.max(16, Math.min(left, window.innerWidth - tw - 16));
    top = Math.max(16, top);

    setTooltipPos({ top, left });
  }, [visible, currentStep]);

  useEffect(() => {
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [updatePosition]);

  const finish = useCallback(() => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const next = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      finish();
    }
  };

  if (!visible) return null;

  const step = TOUR_STEPS[currentStep];
  const spotlightPad = 8;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999]"
        style={{ pointerEvents: "auto" }}
      >
        {/* Semi-transparent overlay with spotlight cutout */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              {rect && (
                <rect
                  x={rect.left - spotlightPad}
                  y={rect.top - spotlightPad}
                  width={rect.width + spotlightPad * 2}
                  height={rect.height + spotlightPad * 2}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.55)"
            mask="url(#tour-mask)"
          />
        </svg>

        {/* Spotlight border */}
        {rect && (
          <div
            className="absolute border-2 border-primary rounded-lg pointer-events-none"
            style={{
              left: rect.left - spotlightPad,
              top: rect.top - spotlightPad,
              width: rect.width + spotlightPad * 2,
              height: rect.height + spotlightPad * 2,
              boxShadow: "0 0 0 4px hsl(var(--primary) / 0.2)",
            }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          ref={tooltipRef}
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute bg-card border border-border rounded-xl shadow-xl p-5 z-[10000]"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            width: 320,
            pointerEvents: "auto",
          }}
        >
          <button onClick={finish} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
          <h4 className="font-semibold text-foreground mb-1">{t(step.titleKey)}</h4>
          <p className="text-sm text-muted-foreground mb-4">{t(step.descKey)}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {currentStep + 1} / {TOUR_STEPS.length}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={finish}>
                {t("tour.skip")}
              </Button>
              <Button size="sm" onClick={next}>
                {currentStep < TOUR_STEPS.length - 1 ? (
                  <>{t("common.next")} <ArrowRight className="ml-1 h-3 w-3" /></>
                ) : (
                  t("tour.finish")
                )}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Click-blocker for non-spotlight areas */}
        <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} style={{ pointerEvents: "auto", zIndex: -1 }} />
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default GuidedTour;
