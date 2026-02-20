/**
 * Detects the tenant slug from the current hostname's subdomain.
 * 
 * Examples:
 *   orange.b2b-inkoo.com → "orange"
 *   orange.localhost → "orange"
 *   b2b-inkoo.com → null (no subdomain)
 *   localhost:5173 → null
 *   preview--xxx.lovable.app → null (lovable preview)
 */
export function getTenantSlugFromSubdomain(): string | null {
  const hostname = window.location.hostname;

  // Skip lovable preview/project domains
  if (hostname.endsWith(".lovable.app") || hostname.endsWith(".lovableproject.com")) return null;

  // Skip localhost without subdomain
  if (hostname === "localhost" || hostname === "127.0.0.1") return null;

  const parts = hostname.split(".");

  // For localhost with subdomain: orange.localhost
  if (parts.length === 2 && parts[1] === "localhost") {
    return parts[0];
  }

  // For real domains: orange.example.com (3+ parts) 
  // Skip www
  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub === "www") return null;
    return sub;
  }

  return null;
}

/**
 * Check if we're in a tenant subdomain context
 */
export function isSubdomainContext(): boolean {
  return getTenantSlugFromSubdomain() !== null;
}
