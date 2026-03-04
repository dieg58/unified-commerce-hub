import { createContext, useContext, ReactNode } from "react";

interface TenantContextType {
  tenantId: string | null;
  /** Base path prefix for tenant admin nav links: "/tenant" or "/tenants/:id/manage" */
  basePath: string;
  /** Whether the current view is a super admin impersonating */
  isSuperAdminView: boolean;
}

const TenantContext = createContext<TenantContextType>({
  tenantId: null,
  basePath: "/tenant",
  isSuperAdminView: false,
});

export const TenantContextProvider = ({
  tenantId,
  basePath,
  isSuperAdminView,
  children,
}: TenantContextType & { children: ReactNode }) => (
  <TenantContext.Provider value={{ tenantId, basePath, isSuperAdminView }}>
    {children}
  </TenantContext.Provider>
);

export const useTenantContext = () => useContext(TenantContext);
