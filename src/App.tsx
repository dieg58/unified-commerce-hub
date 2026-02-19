import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { RequireSuperAdmin, RequireTenantUser } from "@/components/RouteGuards";
import AppLayout from "./components/AppLayout";
import TenantAdminLayout from "./components/TenantAdminLayout";
import Dashboard from "./pages/Dashboard";
import Tenants from "./pages/Tenants";
import TenantDetail from "./pages/TenantDetail";
import UsersPage from "./pages/UsersPage";
import Orders from "./pages/Orders";
import Budgets from "./pages/Budgets";
import Catalog from "./pages/Catalog";
import SettingsPage from "./pages/SettingsPage";
import TenantDashboard from "./pages/TenantDashboard";
import TenantOrders from "./pages/tenant/TenantOrders";
import TenantStats from "./pages/tenant/TenantStats";
import TenantUsers from "./pages/tenant/TenantUsers";
import TenantSettings from "./pages/tenant/TenantSettings";
import Storefront from "./pages/Storefront";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import SubdomainRouter from "./components/SubdomainRouter";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SubdomainRouter>
              <Routes>
                <Route path="/login" element={<Login />} />

                {/* Super Admin routes */}
                <Route element={<RequireSuperAdmin><AppLayout /></RequireSuperAdmin>}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/tenants" element={<Tenants />} />
                  <Route path="/tenants/:id" element={<TenantDetail />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/budgets" element={<Budgets />} />
                  <Route path="/catalog" element={<Catalog />} />
                  <Route path="/store/:tenantId" element={<Storefront />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                {/* Tenant user routes (shop_manager, dept_manager, employee) */}
                <Route element={<RequireTenantUser><TenantAdminLayout /></RequireTenantUser>}>
                  <Route path="/tenant" element={<TenantDashboard />} />
                  <Route path="/tenant/orders" element={<TenantOrders />} />
                  <Route path="/tenant/stats" element={<TenantStats />} />
                  <Route path="/tenant/users" element={<TenantUsers />} />
                  <Route path="/tenant/settings" element={<TenantSettings />} />
                </Route>

                {/* Storefront for tenant users */}
                <Route element={<RequireTenantUser><AppLayout /></RequireTenantUser>}>
                  <Route path="/store" element={<Storefront />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </SubdomainRouter>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
