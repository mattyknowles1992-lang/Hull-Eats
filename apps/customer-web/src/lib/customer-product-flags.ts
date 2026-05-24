/**
 * Customer-web product rollout flags.
 * Hull Eats ordering launches first; resale marketplace and services stay off until enabled.
 * Customer accounts remain shared in Supabase for future products.
 */
function readPublicFlag(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  return value === "true" || value === "1";
}

/** Local classified resale (/marketplace). */
export function isHullMarketplaceResaleEnabled(): boolean {
  return readPublicFlag("NEXT_PUBLIC_HULL_MARKETPLACE_RESALE_ENABLED");
}

/** Local services discovery (/services). */
export function isHullServicesEnabled(): boolean {
  return readPublicFlag("NEXT_PUBLIC_HULL_SERVICES_ENABLED");
}

export function isAnyExtraHullProductEnabled(): boolean {
  return isHullMarketplaceResaleEnabled() || isHullServicesEnabled();
}
