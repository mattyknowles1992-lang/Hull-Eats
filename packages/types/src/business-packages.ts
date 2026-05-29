import { z } from "zod";

/** Modular product pillars Hull Eats can sell separately or together. */
export const HULL_BUSINESS_PACKAGE_KEYS = [
  "marketplace",
  "merchant_portal",
  "courier_dispatch",
  "menu_studio_pro",
  "paperless_kitchen",
  "ai_phone",
] as const;

export type HullBusinessPackageKey = (typeof HULL_BUSINESS_PACKAGE_KEYS)[number];

export const hullBusinessPackageKeySchema = z.enum(HULL_BUSINESS_PACKAGE_KEYS);

export type BusinessPackageEntitlement = {
  packageKey: HullBusinessPackageKey;
  enabled: boolean;
  enabledAt: string | null;
};

/** Default entitlements when no rows exist yet (full-stack rollout). */
export const defaultBusinessPackageEntitlements = (): BusinessPackageEntitlement[] =>
  (["marketplace", "merchant_portal", "courier_dispatch"] as const).map((packageKey) => ({
    packageKey,
    enabled: true,
    enabledAt: null,
  }));
