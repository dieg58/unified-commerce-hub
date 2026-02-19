import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { RequireSuperAdmin, RequireTenantUser } from "@/components/RouteGuards";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Tenants from "./pages/Tenants";
import TenantDetail from "./pages/TenantDetail";
import UsersPage from "./pages/UsersPage";
import Orders from "./pages/Orders";
import Budgets from "./pages/Budgets";
import Catalog from "./pages/Catalog";
import SettingsPage from "./pages/SettingsPage";
import TenantDashboard from "./pages/TenantDashboard";
import Storefront from "./pages/Storefront";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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

              {/* Tenant user routes */}
              <Route element={<RequireTenantUser><AppLayout /></RequireTenantUser>}>
                <Route path="/tenant" element={<TenantDashboard />} />
                <Route path="/store" element={<Storefront />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
