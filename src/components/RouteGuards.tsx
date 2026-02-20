import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubdomain } from "@/components/SubdomainRouter";
import { Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const RequireSuperAdmin = ({ children }: { children: ReactNode }) => {
  const { session, loading, isSuperAdmin, rolesLoaded } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (!rolesLoaded) return <LoadingScreen />;
  if (!isSuperAdmin) return <Navigate to="/tenant" replace />;
  return <>{children}</>;
};

export const RequireTenantUser = ({ children }: { children: ReactNode }) => {
  const { session, loading, isSuperAdmin, rolesLoaded, profile, signOut } = useAuth();
  const { isSubdomain } = useSubdomain();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (!rolesLoaded) return <LoadingScreen />;
  if (isSuperAdmin) return <Navigate to="/dashboard" replace />;
  // On subdomain, if user has no tenant_id they're pending approval
  if (isSubdomain && !profile?.tenant_id) {
    return <PendingApprovalScreen onSignOut={signOut} />;
  }
  return <>{children}</>;
};

export const RequireShopManager = ({ children }: { children: ReactNode }) => {
  const { session, loading, isSuperAdmin, isShopManager } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (isSuperAdmin) return <Navigate to="/dashboard" replace />;
  if (!isShopManager) return <Navigate to="/shop" replace />;
  return <>{children}</>;
};

/** Redirects to the right home based on role – only employees can access /shop */
export const RequireEmployee = ({ children }: { children: ReactNode }) => {
  const { session, loading, isSuperAdmin, isShopManager, isDeptManager, rolesLoaded, profile, signOut } = useAuth();
  const { isSubdomain } = useSubdomain();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (!rolesLoaded) return <LoadingScreen />;
  if (isSuperAdmin) return <Navigate to="/dashboard" replace />;
  if (isShopManager || isDeptManager) return <Navigate to="/tenant" replace />;
  // On subdomain, if user has no tenant_id they're pending approval
  if (isSubdomain && !profile?.tenant_id) {
    return <PendingApprovalScreen onSignOut={signOut} />;
  }
  return <>{children}</>;
};

const PendingApprovalScreen = ({ onSignOut }: { onSignOut: () => void }) => (
  <div className="flex min-h-screen items-center justify-center bg-background px-4">
    <div className="text-center space-y-4 max-w-sm animate-fade-in">
      <div className="w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
        <Clock className="w-7 h-7 text-warning" />
      </div>
      <h1 className="text-xl font-bold text-foreground">En attente d'approbation</h1>
      <p className="text-sm text-muted-foreground">
        Votre demande d'accès a été envoyée au responsable de la boutique. Vous recevrez un accès dès qu'elle sera approuvée.
      </p>
      <Button variant="outline" onClick={onSignOut} className="mt-4">
        Se déconnecter
      </Button>
    </div>
  </div>
);

const LoadingScreen = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);
