import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Palette, Building2, Package, Users } from "lucide-react";

export interface OnboardingStep {
  id: string;
  icon: any;
  title: string;
  description: string;
  route: string;
  completed: boolean;
}

export function useOnboarding() {
  const { profile, isShopManager } = useAuth();
  const tenantId = profile?.tenant_id;
  const { t } = useTranslation();

  // Check branding
  const { data: branding } = useQuery({
    queryKey: ["onboarding-branding", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenant_branding")
        .select("logo_url, primary_color")
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      return data;
    },
    enabled: !!tenantId && isShopManager,
  });

  // Check entities
  const { data: entitiesCount } = useQuery({
    queryKey: ["onboarding-entities", tenantId],
    queryFn: async () => {
      const { count } = await supabase
        .from("entities")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId!);
      return count || 0;
    },
    enabled: !!tenantId && isShopManager,
  });

  // Check products
  const { data: productsCount } = useQuery({
    queryKey: ["onboarding-products", tenantId],
    queryFn: async () => {
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId!)
        .eq("active", true);
      return count || 0;
    },
    enabled: !!tenantId && isShopManager,
  });

  // Check users (more than just the manager)
  const { data: usersCount } = useQuery({
    queryKey: ["onboarding-users", tenantId],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId!);
      return count || 0;
    },
    enabled: !!tenantId && isShopManager,
  });

  const steps: OnboardingStep[] = useMemo(() => [
    {
      id: "branding",
      icon: Palette,
      title: t("onboarding.stepBrandingTitle", "Personnaliser votre boutique"),
      description: t("onboarding.stepBrandingDesc", "Ajoutez votre logo, vos couleurs et votre identité visuelle"),
      route: "/tenant/settings",
      completed: !!(branding?.logo_url),
    },
    {
      id: "entities",
      icon: Building2,
      title: t("onboarding.stepEntitiesTitle", "Créer vos entités"),
      description: t("onboarding.stepEntitiesDesc", "Définissez vos départements, adresses de livraison et budgets"),
      route: "/tenant/entities",
      completed: (entitiesCount || 0) > 0,
    },
    {
      id: "products",
      icon: Package,
      title: t("onboarding.stepProductsTitle", "Ajouter des produits"),
      description: t("onboarding.stepProductsDesc", "Sélectionnez des produits du catalogue ou créez les vôtres"),
      route: "/tenant/products",
      completed: (productsCount || 0) > 0,
    },
    {
      id: "users",
      icon: Users,
      title: t("onboarding.stepUsersTitle", "Inviter votre équipe"),
      description: t("onboarding.stepUsersDesc", "Ajoutez les employés qui pourront commander sur la boutique"),
      route: "/tenant/users",
      completed: (usersCount || 0) > 1,
    },
  ], [branding, entitiesCount, productsCount, usersCount, t]);

  const completedCount = steps.filter((s) => s.completed).length;
  const allCompleted = completedCount === steps.length;
  const progress = Math.round((completedCount / steps.length) * 100);

  // Show onboarding if manager and not all steps done
  const showOnboarding = isShopManager && !allCompleted;

  // Dismissed state from localStorage
  const dismissKey = `onboarding-dismissed-${tenantId}`;
  const isDismissed = typeof window !== "undefined" ? localStorage.getItem(dismissKey) === "true" : false;
  const dismiss = () => {
    if (tenantId) localStorage.setItem(dismissKey, "true");
  };
  const resetDismiss = () => {
    if (tenantId) localStorage.removeItem(dismissKey);
  };

  return {
    steps,
    completedCount,
    allCompleted,
    progress,
    showOnboarding,
    isDismissed,
    dismiss,
    resetDismiss,
  };
}
