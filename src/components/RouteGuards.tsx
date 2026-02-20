import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const RequireSuperAdmin = ({ children }: { children: ReactNode }) => {
  const { session, loading, isSuperAdmin, roles } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  // Wait for roles to be loaded before redirecting
  if (roles.length === 0) return <LoadingScreen />;
  if (!isSuperAdmin) return <Navigate to="/tenant" replace />;
  return <>{children}</>;
};

export const RequireTenantUser = ({ children }: { children: ReactNode }) => {
  const { session, loading, isSuperAdmin, roles } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  // Wait for roles to be loaded before redirecting
  if (roles.length === 0) return <LoadingScreen />;
  if (isSuperAdmin) return <Navigate to="/dashboard" replace />;
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
  const { session, loading, isSuperAdmin, isShopManager, isDeptManager, roles } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (roles.length === 0) return <LoadingScreen />;
  if (isSuperAdmin) return <Navigate to="/dashboard" replace />;
  if (isShopManager || isDeptManager) return <Navigate to="/tenant" replace />;
  return <>{children}</>;
};

const LoadingScreen = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);
