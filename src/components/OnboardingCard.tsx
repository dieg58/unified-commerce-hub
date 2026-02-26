import { useNavigate } from "react-router-dom";
import { useOnboarding, OnboardingStep } from "@/hooks/useOnboarding";
import { Check, ChevronRight, Rocket, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";

const OnboardingCard = () => {
  const { steps, completedCount, progress, showOnboarding, isDismissed, dismiss } = useOnboarding();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!showOnboarding || isDismissed) return null;

  const nextStep = steps.find((s) => !s.completed);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-card rounded-xl border border-primary/20 shadow-lg overflow-hidden animate-fade-in"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {t("onboarding.title", "Configurez votre boutique")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("onboarding.subtitle", "{{completed}} sur {{total}} étapes complétées", {
                    completed: completedCount,
                    total: steps.length,
                  })}
                </p>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={t("onboarding.dismiss", "Fermer")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <Progress value={progress} className="mt-3 h-1.5" />
        </div>

        {/* Steps */}
        <div className="p-3 space-y-1">
          {steps.map((step, idx) => (
            <StepRow
              key={step.id}
              step={step}
              index={idx}
              isNext={nextStep?.id === step.id}
              onClick={() => navigate(step.route)}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

const StepRow = ({
  step,
  index,
  isNext,
  onClick,
}: {
  step: OnboardingStep;
  index: number;
  isNext: boolean;
  onClick: () => void;
}) => {
  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all group",
        step.completed
          ? "opacity-60 hover:opacity-80"
          : isNext
          ? "bg-primary/5 border border-primary/20 shadow-sm hover:bg-primary/10"
          : "hover:bg-muted/50"
      )}
    >
      {/* Status indicator */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
          step.completed
            ? "bg-success/15 text-success"
            : isNext
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        {step.completed ? (
          <Check className="w-4 h-4" />
        ) : (
          <step.icon className="w-4 h-4" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium",
            step.completed ? "text-muted-foreground line-through" : "text-foreground"
          )}
        >
          {step.title}
        </p>
        {!step.completed && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{step.description}</p>
        )}
      </div>

      {/* Arrow */}
      {!step.completed && (
        <ChevronRight
          className={cn(
            "w-4 h-4 shrink-0 transition-transform",
            isNext ? "text-primary" : "text-muted-foreground",
            "group-hover:translate-x-0.5"
          )}
        />
      )}
    </motion.button>
  );
};

export default OnboardingCard;
