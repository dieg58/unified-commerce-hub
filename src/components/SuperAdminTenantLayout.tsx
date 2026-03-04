import { Outlet, useParams, useNavigate } from "react-router-dom";
import TenantAdminSidebar from "./TenantAdminSidebar";
import { TenantContextProvider } from "@/hooks/useTenantContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

/**
 * Layout used by super admins to browse a tenant's admin view.
 * Sets the TenantContext from the URL :tenantId param.
 */
const SuperAdminTenantLayout = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

  return (
    <TenantContextProvider
      tenantId={tenantId ?? null}
      basePath={`/tenants/${tenantId}/manage`}
      isSuperAdminView={true}
    >
      <div className="flex min-h-screen bg-background">
        <TenantAdminSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          {/* Floating back button */}
          <div className="absolute top-3 right-4 z-30">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/tenants/${tenantId}`)}
              className="gap-1.5 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour fiche tenant
            </Button>
          </div>
          <Outlet />
        </main>
      </div>
    </TenantContextProvider>
  );
};

export default SuperAdminTenantLayout;
