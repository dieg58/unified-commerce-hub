import { ReactNode, createContext, useContext, useMemo } from "react";
import { getTenantSlugFromSubdomain } from "@/lib/subdomain";

interface SubdomainContextType {
  tenantSlug: string | null;
  isSubdomain: boolean;
}

const SubdomainContext = createContext<SubdomainContextType>({
  tenantSlug: null,
  isSubdomain: false,
});

export const useSubdomain = () => useContext(SubdomainContext);

/**
 * Wraps the app and provides subdomain context.
 * When a tenant subdomain is detected, the storefront is shown directly.
 */
const SubdomainRouter = ({ children }: { children: ReactNode }) => {
  const value = useMemo(() => {
    const slug = getTenantSlugFromSubdomain();
    return { tenantSlug: slug, isSubdomain: !!slug };
  }, []);

  return (
    <SubdomainContext.Provider value={value}>
      {children}
    </SubdomainContext.Provider>
  );
};

export default SubdomainRouter;
