import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { RequireSuperAdmin, RequireTenantUser } from "@/components/RouteGuards";
import AppLayout from "./components/AppLayout";
import TenantAdminLayout from "./components/TenantAdminLayout";
import StorefrontLayout from "./components/StorefrontLayout";
import Dashboard from "./pages/Dashboard";
import Tenants from "./pages/Tenants";
import TenantDetail from "./pages/TenantDetail";
import SettingsPage from "./pages/SettingsPage";
import TenantDashboard from "./pages/TenantDashboard";
import TenantOrders from "./pages/tenant/TenantOrders";
import TenantStats from "./pages/tenant/TenantStats";
import TenantUsers from "./pages/tenant/TenantUsers";
import TenantSettings from "./pages/tenant/TenantSettings";
import Storefront from "./pages/Storefront";
import MyOrders from "./pages/shop/MyOrders";
import MyProfile from "./pages/shop/MyProfile";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";
import ResetPassword from "./pages/ResetPassword";
import SubdomainRouter, { useSubdomain } from "./components/SubdomainRouter";

const queryClient = new QueryClient();

/** When a subdomain is detected, show only the storefront experience */
const SubdomainAwareRoutes = () => {
  const { isSubdomain } = useSubdomain();

  if (isSubdomain) {
    // Subdomain mode: employee-facing storefront only
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<RequireTenantUser><StorefrontLayout /></RequireTenantUser>}>
          <Route path="/" element={<Storefront />} />
          <Route path="/shop" element={<Storefront />} />
          <Route path="/shop/orders" element={<MyOrders />} />
          <Route path="/shop/profile" element={<MyProfile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Normal mode: full application
  return (
    <Routes>
      {/* Public landing page */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Super Admin routes */}
      <Route element={<RequireSuperAdmin><AppLayout /></RequireSuperAdmin>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tenants" element={<Tenants />} />
        <Route path="/tenants/:id" element={<TenantDetail />} />
        <Route path="/store/:tenantId" element={<Storefront />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Tenant admin routes (shop_manager, dept_manager) */}
      <Route element={<RequireTenantUser><TenantAdminLayout /></RequireTenantUser>}>
        <Route path="/tenant" element={<TenantDashboard />} />
        <Route path="/tenant/orders" element={<TenantOrders />} />
        <Route path="/tenant/stats" element={<TenantStats />} />
        <Route path="/tenant/users" element={<TenantUsers />} />
        <Route path="/tenant/settings" element={<TenantSettings />} />
      </Route>

      {/* Employee storefront routes */}
      <Route element={<RequireTenantUser><StorefrontLayout /></RequireTenantUser>}>
        <Route path="/shop" element={<Storefront />} />
        <Route path="/shop/orders" element={<MyOrders />} />
        <Route path="/shop/profile" element={<MyProfile />} />
        <Route path="/store" element={<Storefront />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SubdomainRouter>
              <SubdomainAwareRoutes />
            </SubdomainRouter>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
