import { Outlet, useLocation } from "react-router-dom";
import TenantAdminSidebar from "./TenantAdminSidebar";
import HelpBubble from "./HelpBubble";
import GuidedTour from "./GuidedTour";
import { useAuth } from "@/hooks/useAuth";
import { TenantContextProvider } from "@/hooks/useTenantContext";

const TenantAdminLayout = () => {
  const location = useLocation();
  const isDemo = new URLSearchParams(location.search).get("demo") === "1";
  const { profile } = useAuth();

  return (
    <TenantContextProvider
      tenantId={profile?.tenant_id ?? null}
      basePath="/tenant"
      isSuperAdminView={false}
    >
      <div className="flex min-h-screen bg-background">
        <TenantAdminSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <Outlet />
        </main>
        <div data-tour="help-bubble">
          <HelpBubble />
        </div>
        <GuidedTour active={isDemo} />
      </div>
    </TenantContextProvider>
  );
};

export default TenantAdminLayout;
