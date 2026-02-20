/**
 * The base domain used for tenant subdomains.
 * Each tenant storefront is accessible at {slug}.inkoo.eu
 */
export const BASE_DOMAIN = "inkoo.eu";

/**
 * Detects the tenant slug from the current hostname's subdomain.
 * 
 * Examples:
 *   orange.inkoo.eu → "orange"
 *   orange.localhost → "orange"
 *   inkoo.eu → null (no subdomain)
 *   localhost:5173 → null
 *   preview--xxx.lovable.app → null (lovable preview)
 */
export function getTenantSlugFromSubdomain(): string | null {
  const hostname = window.location.hostname;

  // Skip lovable preview/project domains
  if (hostname.endsWith(".lovable.app") || hostname.endsWith(".lovableproject.com")) return null;

  // Skip localhost without subdomain
  if (hostname === "localhost" || hostname === "127.0.0.1") return null;

  // Skip bare base domain
  if (hostname === BASE_DOMAIN || hostname === `www.${BASE_DOMAIN}`) return null;

  const parts = hostname.split(".");

  // For localhost with subdomain: orange.localhost
  if (parts.length === 2 && parts[1] === "localhost") {
    return parts[0];
  }

  // For inkoo.eu: orange.inkoo.eu → 3 parts
  // For other domains: orange.example.com → 3+ parts
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

/**
 * Build the full storefront URL for a given tenant slug
 */
export function getStorefrontUrl(slug: string): string {
  return `https://${slug}.${BASE_DOMAIN}`;
}
