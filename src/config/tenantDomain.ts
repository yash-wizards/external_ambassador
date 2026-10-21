/**
 * Tenant slug from the current host, matching the admin portal.
 * `sbs-university.localhost` → `sbs-university`
 * `sbs-university.dev.intoto.ca` → `sbs-university`
 */
export function tenantDomainFromHost(hostname: string): string | null {
  const host = hostname.trim().toLowerCase();
  if (!host || host === 'localhost' || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    return null;
  }

  if (host.endsWith('.localhost')) {
    const subdomain = host.slice(0, -'.localhost'.length);
    return subdomain.includes('.') ? subdomain.split('.')[0] || null : subdomain || null;
  }

  const labels = host.split('.').filter(Boolean);
  if (labels.length < 3) return null;

  const first = labels[0];
  if (!first || first === 'www' || first === 'dev' || first === 'api') return null;
  return first;
}

/** Host subdomain wins. VITE_TENANT_DOMAIN covers plain localhost. */
export function resolveTenantDomain(hostname: string, configured: string): string | null {
  return tenantDomainFromHost(hostname) || configured.trim() || null;
}
