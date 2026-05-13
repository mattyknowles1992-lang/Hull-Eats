import { z } from "zod";

/** Default delivery when hub has not set mile fees / zones (Hull Eats platform default). */
export const PLATFORM_DEFAULT_DELIVERY_GBP = 3;

/**
 * Optional mile-band fees: index 0 = under 1 mile, 1 = under 2 miles, … 4 = under 5 miles.
 * Stored on the store and edited in the merchant hub.
 */
export const storeDeliveryPricingSchema = z.object({
  radiusMiles: z.number().min(1).max(40).default(5),
  /** Outward codes only, e.g. HU1, HU2, B1. Empty = no postcode restriction (radius + miles still apply). */
  postcodeDistricts: z.array(z.string().min(2).max(8)).default([]),
  mileFees: z.array(z.number().nonnegative()).length(5).default([0, 0, 0, 0, 0]),
  /** Optional override for distance origin; otherwise the hub base postcode outward centroid is used. */
  originLatitude: z.number().min(-90).max(90).nullable().optional(),
  originLongitude: z.number().min(-180).max(180).nullable().optional(),
});

export type StoreDeliveryPricing = z.infer<typeof storeDeliveryPricingSchema>;

export const normaliseDeliveryPricing = (raw: unknown): StoreDeliveryPricing => {
  const parsed = storeDeliveryPricingSchema.safeParse(raw);
  if (!parsed.success) {
    return storeDeliveryPricingSchema.parse({});
  }
  return parsed.data;
};

/** Approximate centroid per outward district for distance estimates (Hull focus). */
export const HULL_AREA_OUTWARD_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  HU1: { lat: 53.7446, lng: -0.3357 },
  HU2: { lat: 53.7547, lng: -0.3575 },
  HU3: { lat: 53.7461, lng: -0.3842 },
  HU4: { lat: 53.7712, lng: -0.3578 },
  HU5: { lat: 53.7819, lng: -0.4371 },
  HU6: { lat: 53.7581, lng: -0.3194 },
  HU7: { lat: 53.8718, lng: -0.4244 },
  HU8: { lat: 53.7524, lng: -0.2778 },
  HU9: { lat: 53.7312, lng: -0.3712 },
  HU10: { lat: 53.7531, lng: -0.3988 },
  HU11: { lat: 53.7268, lng: -0.4219 },
  HU12: { lat: 53.7891, lng: -0.3559 },
  HU13: { lat: 53.8034, lng: -0.3451 },
  HU14: { lat: 53.8126, lng: -0.4349 },
  HU15: { lat: 53.7642, lng: -0.4468 },
  HU16: { lat: 53.7851, lng: -0.3019 },
};

export const parseUkOutwardCode = (postcode: string | undefined | null): string | null => {
  if (!postcode?.trim()) {
    return null;
  }

  const compact = postcode.trim().toUpperCase().replace(/\s+/g, "");
  const match = compact.match(/^([A-Z]{1,2}\d[A-Z0-9]?)/);
  return match?.[1] ?? null;
};

const toRad = (deg: number) => (deg * Math.PI) / 180;

export const haversineMiles = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
  const R = 3958.7613; // Earth radius in miles
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
};

const pickMileBandFee = (miles: number, fees: number[]): number => {
  if (miles < 1) {
    return fees[0] ?? 0;
  }
  if (miles < 2) {
    return fees[1] ?? 0;
  }
  if (miles < 3) {
    return fees[2] ?? 0;
  }
  if (miles < 4) {
    return fees[3] ?? 0;
  }
  return fees[4] ?? 0;
};

const hasAnyMileFee = (fees: number[]) => fees.some((value) => value > 0);

const minPositiveMileFee = (fees: number[]): number | null => {
  const positives = fees.filter((value) => value > 0);
  if (positives.length === 0) {
    return null;
  }
  return Math.min(...positives);
};

export type DeliveryQuote = {
  fee: number;
  /** True until a customer postcode is supplied for delivery. */
  needsPostcode: boolean;
  /** True when fee is a platform default or legacy flat because mile pricing is not configured. */
  isDefaultPricing: boolean;
  blocked: boolean;
  reason?: string;
};

export const deliveryFeeFromForStorefront = (args: {
  legacyDeliveryFee?: number;
  pricing?: StoreDeliveryPricing | null;
}): number => {
  const pricing = args.pricing ? normaliseDeliveryPricing(args.pricing) : null;
  if (pricing && hasAnyMileFee(pricing.mileFees)) {
    const minTier = minPositiveMileFee(pricing.mileFees);
    if (minTier !== null) {
      return Number(minTier.toFixed(2));
    }
  }
  if (args.legacyDeliveryFee != null && args.legacyDeliveryFee > 0) {
    return Number(args.legacyDeliveryFee.toFixed(2));
  }
  return PLATFORM_DEFAULT_DELIVERY_GBP;
};

export const computeDeliveryQuote = (args: {
  fulfillmentType: "delivery" | "pickup";
  storeBasePostcode: string;
  legacyDeliveryFee?: number;
  pricing?: StoreDeliveryPricing | null;
  customerPostcode?: string | null;
}): DeliveryQuote => {
  if (args.fulfillmentType !== "delivery") {
    return { fee: 0, needsPostcode: false, isDefaultPricing: true, blocked: false };
  }

  const pricing = args.pricing ? normaliseDeliveryPricing(args.pricing) : null;
  const legacy = args.legacyDeliveryFee ?? 0;
  const tiersConfigured = Boolean(pricing && hasAnyMileFee(pricing.mileFees));
  const districts = pricing?.postcodeDistricts?.map((code) => code.trim().toUpperCase()).filter(Boolean) ?? [];

  const customerOutward = parseUkOutwardCode(args.customerPostcode ?? "");
  if (!customerOutward) {
    const preview = tiersConfigured ? minPositiveMileFee(pricing!.mileFees) : null;
    const fee =
      preview != null
        ? Number(preview.toFixed(2))
        : legacy > 0
          ? Number(legacy.toFixed(2))
          : PLATFORM_DEFAULT_DELIVERY_GBP;
    return {
      fee,
      needsPostcode: true,
      isDefaultPricing: !tiersConfigured,
      blocked: false,
    };
  }

  if (districts.length > 0 && !districts.includes(customerOutward)) {
    return {
      fee: 0,
      needsPostcode: false,
      isDefaultPricing: false,
      blocked: true,
      reason: "This store does not deliver to that postcode area.",
    };
  }

  if (!tiersConfigured) {
    const fee = legacy > 0 ? Number(legacy.toFixed(2)) : PLATFORM_DEFAULT_DELIVERY_GBP;
    return { fee, needsPostcode: false, isDefaultPricing: true, blocked: false };
  }

  const cfg = pricing!;
  const originLat = cfg.originLatitude ?? null;
  const originLng = cfg.originLongitude ?? null;
  const storeOutward = parseUkOutwardCode(args.storeBasePostcode);
  const originPoint =
    originLat != null && originLng != null
      ? { lat: originLat, lng: originLng }
      : storeOutward
        ? HULL_AREA_OUTWARD_CENTROIDS[storeOutward] ?? null
        : null;
  const destPoint = HULL_AREA_OUTWARD_CENTROIDS[customerOutward] ?? null;

  if (!originPoint || !destPoint) {
    const fee = legacy > 0 ? Number(legacy.toFixed(2)) : PLATFORM_DEFAULT_DELIVERY_GBP;
    return {
      fee,
      needsPostcode: false,
      isDefaultPricing: true,
      blocked: false,
    };
  }

  const miles = haversineMiles(originPoint, destPoint);
  if (miles > cfg.radiusMiles + 0.001) {
    return {
      fee: 0,
      needsPostcode: false,
      isDefaultPricing: false,
      blocked: true,
      reason: `Delivery is only offered within ${cfg.radiusMiles} miles of the store.`,
    };
  }

  const fee = Number(pickMileBandFee(miles, cfg.mileFees).toFixed(2));
  return { fee, needsPostcode: false, isDefaultPricing: false, blocked: false };
};

/** Outward codes with centroid data (Hull); used for hub district toggles and distance estimates. */
export const listKnownHullOutwardCodes = (): readonly string[] =>
  Object.keys(HULL_AREA_OUTWARD_CENTROIDS).sort((left, right) => left.localeCompare(right));
