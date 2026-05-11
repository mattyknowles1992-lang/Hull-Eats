/**
 * Hull Marketplace listing gate.
 *
 * - Launch: verified Hull Eats customer account is enough to list (`false`).
 * - Later: require active Hull Eats+ subscription (`true`) — flip env only, no code hunt.
 *
 * Set in Render / Vercel / `.env.local`:
 *   NEXT_PUBLIC_MARKETPLACE_LISTING_REQUIRES_HULL_EATS_PLUS=true
 */
export function marketplaceListingRequiresHullEatsPlus(): boolean {
  const raw = process.env.NEXT_PUBLIC_MARKETPLACE_LISTING_REQUIRES_HULL_EATS_PLUS;
  if (raw === undefined || raw === "") {
    return false;
  }
  return raw === "1" || raw.toLowerCase() === "true" || raw.toLowerCase() === "yes";
}

export function marketplaceSellerBadgeLabel(): string {
  return marketplaceListingRequiresHullEatsPlus() ? "Hull Eats+ member" : "Verified seller";
}

export function marketplaceSellerMemberLine(): string {
  return marketplaceListingRequiresHullEatsPlus()
    ? "Active Hull Eats+ membership"
    : "Verified Hull Eats account";
}

export function marketplaceListingGateHeadline(): string {
  return marketplaceListingRequiresHullEatsPlus()
    ? "Hull Eats+ members can list."
    : "Verified Hull Eats accounts can list.";
}

export function marketplaceListingGateBody(): string {
  if (marketplaceListingRequiresHullEatsPlus()) {
    return "Buyers can browse without listing access. Sellers need a Hull Eats account and an active Hull Eats+ membership so offers, messages, and sold status stay tracked.";
  }
  return "Buyers can browse without an account. To list, sell, and reply to offers you need a verified Hull Eats customer account. Hull Eats+ listing rules can be turned on later without changing how data is stored.";
}
