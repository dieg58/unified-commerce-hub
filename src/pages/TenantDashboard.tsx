import TopBar from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";

const TenantDashboard = () => {
  const { profile, roles } = useAuth();

  return (
    <>
      <TopBar title="Tenant Dashboard" subtitle={`Welcome, ${profile?.full_name || profile?.email}`} />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card p-8 text-center animate-fade-in">
          <h2 className="text-xl font-semibold text-foreground mb-2">Tenant Admin Area</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Your role: <span className="font-medium text-foreground capitalize">{roles.join(", ") || "none"}</span>
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            This is a placeholder for the tenant administration panel. 
            From here, tenant admins will manage entities, users, budgets, and orders within their organization.
          </p>
        </div>
      </div>
    </>
  );
};

export default TenantDashboard;
