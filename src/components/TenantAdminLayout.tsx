import { Outlet } from "react-router-dom";
import TenantAdminSidebar from "./TenantAdminSidebar";
import HelpBubble from "./HelpBubble";

const TenantAdminLayout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <TenantAdminSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </main>
      <HelpBubble />
    </div>
  );
};

export default TenantAdminLayout;
