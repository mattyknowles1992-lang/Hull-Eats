import { z } from "zod";

import { HULL_SECTOR_GEOCODES } from "./hull-sector-geocodes.generated";
import { listHullSectorsForOutward } from "./hull-postcode-boundaries";

/** Default delivery when hub has not set mile fees / zones (Hull Eats platform default). */
export const PLATFORM_DEFAULT_DELIVERY_GBP = 3;

/** Customer-facing copy when delivery cannot be priced for the postcode (no hub/merchant jargon). */
export const DELIVERY_NOT_AVAILABLE_TO_POSTCODE_MESSAGE = "Delivery is not available for your postcode.";

export const deliveryModeSchema = z.enum(["business_radius", "postcode_zones"]);
export type DeliveryMode = z.infer<typeof deliveryModeSchema>;

export const deliveryDistanceRangeSchema = z.object({
  maxMiles: z.number().min(0.1).max(40),
  fee: z.number().nonnegative(),
});
export type DeliveryDistanceRange = z.infer<typeof deliveryDistanceRangeSchema>;

/** What customers can choose at checkout for this hub. */
export const hubOrderFulfillmentSchema = z.enum([
  "delivery_only",
  "collection_only",
  "delivery_and_collection",
]);
export type HubOrderFulfillment = z.infer<typeof hubOrderFulfillmentSchema>;

export const hubOrderFulfillmentOptions: ReadonlyArray<{ value: HubOrderFulfillment; label: string }> = [
  { value: "delivery_only", label: "Delivery only" },
  { value: "collection_only", label: "Collection only" },
  { value: "delivery_and_collection", label: "Delivery and collection" },
];

export const hubAllowsDelivery = (policy: HubOrderFulfillment | undefined | null): boolean =>
  (policy ?? "delivery_and_collection") !== "collection_only";

export const hubAllowsCollection = (policy: HubOrderFulfillment | undefined | null): boolean =>
  (policy ?? "delivery_and_collection") !== "delivery_only";

/** UK postcode sector digits (e.g. HU7 3xx → sector "3"; HU7 0xx → sector "0"). */
export const HULL_SECTOR_DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
export type HullSectorDigit = (typeof HULL_SECTOR_DIGITS)[number];

export const hullPostcodeZoneSchema = z.object({
  code: z.string().min(2).max(8),
  radiusMiles: z.number().min(0.1).max(40),
  fee: z.number().nonnegative().nullable().default(null),
  /** Legacy whole-area flag; kept in sync with enabledSectors on read/write. */
  enabled: z.boolean(),
  /** Sector digits enabled for this outward (HU7 0, HU7 1, …). Empty + enabled=true means all sectors. */
  enabledSectors: z.array(z.string().regex(/^[0-9]$/)).default([]),
});

export type HullPostcodeZone = z.infer<typeof hullPostcodeZoneSchema>;

export const listHullSectorDigits = (): readonly HullSectorDigit[] => HULL_SECTOR_DIGITS;

export const formatHullSectorLabel = (outwardCode: string, sectorDigit: string) =>
  `${outwardCode.trim().toUpperCase()} ${sectorDigit}`;

/**
 * Optional mile-band fees: index 0 = under 1 mile, 1 = under 2 miles, … 4 = under 5 miles.
 * Stored on the store and edited in the merchant hub.
 */
export const storeDeliveryPricingSchema = z.object({
  mode: deliveryModeSchema.default("business_radius"),
  /** Business-radius mode: max miles from the shop origin. */
  radiusMiles: z.number().min(1).max(40).default(5),
  /** Radius mode: optional custom pricing blocks priced by maximum distance from the shop. */
  distanceRanges: z.array(deliveryDistanceRangeSchema).default([]),
  /** Postcode-zone mode: per outward district (HU1, HU2, …) with its own radius from centroid. */
  postcodeZones: z.array(hullPostcodeZoneSchema).default([]),
  /** Legacy outward list; migrated into postcodeZones on read. */
  postcodeDistricts: z.array(z.string().min(2).max(8)).default([]),
  /** Legacy distance pricing; retained for older saved hubs. */
  mileFees: z.array(z.number().nonnegative()).length(5).default([0, 0, 0, 0, 0]),
  /** Optional override for distance origin; otherwise the hub base postcode outward centroid is used. */
  originLatitude: z.number().min(-90).max(90).nullable().optional(),
  originLongitude: z.number().min(-180).max(180).nullable().optional(),
  orderFulfillment: hubOrderFulfillmentSchema.default("delivery_and_collection"),
});

export type StoreDeliveryPricing = z.infer<typeof storeDeliveryPricingSchema>;

export const milesToMeters = (miles: number) => miles * 1609.344;

/**
 * Natural sort for UK-style outward codes so HU2 sits before HU10 (lexicographic order would not).
 * Handles optional trailing letter (e.g. W1A) after the numeric block.
 */
export const compareOutwardCodesNatural = (left: string, right: string): number => {
  const a = left.trim().toUpperCase();
  const b = right.trim().toUpperCase();
  const ma = a.match(/^([A-Z]{1,2})(\d+)([A-Z])?$/);
  const mb = b.match(/^([A-Z]{1,2})(\d+)([A-Z])?$/);
  if (ma && mb) {
    const lettersCmp = ma[1]!.localeCompare(mb[1]!);
    if (lettersCmp !== 0) {
      return lettersCmp;
    }
    const na = Number(ma[2]);
    const nb = Number(mb[2]);
    if (na !== nb) {
      return na - nb;
    }
    return (ma[3] ?? "").localeCompare(mb[3] ?? "");
  }
  return a.localeCompare(b);
};

/** Outward codes with centroid data (Hull); used for hub district toggles and distance estimates. */
export const listKnownHullOutwardCodes = (): readonly string[] =>
  Object.keys(HULL_AREA_OUTWARD_CENTROIDS).sort(compareOutwardCodesNatural);

export const createDefaultHullPostcodeZones = (): HullPostcodeZone[] =>
  listKnownHullOutwardCodes().map((code) => ({
    code,
    radiusMiles: 1.5,
    fee: null,
    enabled: false,
    enabledSectors: [],
  }));

export const normalizeDeliveryDistanceRanges = (
  value: unknown,
  legacyFees?: number[] | null,
): DeliveryDistanceRange[] => {
  const fromValue = Array.isArray(value)
    ? value
        .map((entry) => {
          if (!entry || typeof entry !== "object") {
            return null;
          }
          const row = entry as { maxMiles?: unknown; fee?: unknown };
          const maxMiles = Number(row.maxMiles);
          const fee = Number(row.fee);
          if (!Number.isFinite(maxMiles) || !Number.isFinite(fee) || fee < 0) {
            return null;
          }
          return {
            maxMiles: Math.min(40, Math.max(0.1, Number(maxMiles.toFixed(2)))),
            fee: Number(fee.toFixed(2)),
          } satisfies DeliveryDistanceRange;
        })
        .filter((entry): entry is DeliveryDistanceRange => entry !== null)
    : [];

  const fromLegacy =
    fromValue.length > 0
      ? fromValue
      : (legacyFees ?? [])
          .map((fee, index) => {
            const amount = Number(fee);
            if (!Number.isFinite(amount) || amount <= 0) {
              return null;
            }
            return {
              maxMiles: index + 1,
              fee: Number(amount.toFixed(2)),
            } satisfies DeliveryDistanceRange;
          })
          .filter((entry): entry is DeliveryDistanceRange => entry !== null);

  const sorted = [...fromLegacy].sort((left, right) => left.maxMiles - right.maxMiles);
  const deduped: DeliveryDistanceRange[] = [];
  sorted.forEach((range) => {
    const previous = deduped[deduped.length - 1];
    if (previous && Math.abs(previous.maxMiles - range.maxMiles) < 0.001) {
      deduped[deduped.length - 1] = range;
      return;
    }
    deduped.push(range);
  });
  return deduped;
};

const normalizeSectorDigits = (sectors: string[] | undefined, outwardCode?: string): HullSectorDigit[] => {
  const allowed = new Set<string>(HULL_SECTOR_DIGITS);
  const available =
    outwardCode != null && outwardCode.trim()
      ? new Set<string>(listHullSectorsForOutward(outwardCode))
      : null;
  return [
    ...new Set(
      (sectors ?? [])
        .map((digit) => digit.trim())
        .filter((digit) => allowed.has(digit) && (!available?.size || available.has(digit))),
    ),
  ].sort((left, right) => Number(left) - Number(right)) as HullSectorDigit[];
};

/** Enabled sector digits for a zone (migrates legacy enabled=true to all sectors with boundaries). */
export const getHullZoneEnabledSectors = (zone: HullPostcodeZone): HullSectorDigit[] => {
  const available = listHullSectorsForOutward(zone.code);
  const normalized = normalizeSectorDigits(zone.enabledSectors, zone.code);
  if (normalized.length > 0) {
    return normalized;
  }
  if (!zone.enabled) {
    return [];
  }
  return available.length > 0 ? [...available] : [];
};

export const isHullZoneSectorEnabled = (zone: HullPostcodeZone, sectorDigit: string): boolean =>
  getHullZoneEnabledSectors(zone).includes(sectorDigit as HullSectorDigit);

export const hullZoneHasCoverage = (zone: HullPostcodeZone): boolean => getHullZoneEnabledSectors(zone).length > 0;

export const mergeHullPostcodeZones = (saved: HullPostcodeZone[] | undefined): HullPostcodeZone[] => {
  const byCode = new Map((saved ?? []).map((zone) => [zone.code.trim().toUpperCase(), zone]));

  return listKnownHullOutwardCodes().map((code) => {
    const existing = byCode.get(code);
    if (!existing) {
      return { code, radiusMiles: 1.5, fee: null, enabled: false, enabledSectors: [] };
    }

    const enabledSectors = getHullZoneEnabledSectors({
      ...existing,
      code,
      radiusMiles: existing.radiusMiles,
      fee: existing.fee == null ? null : Number.isFinite(Number(existing.fee)) ? Number(Number(existing.fee).toFixed(2)) : null,
    });

    return {
      code,
      radiusMiles: Math.min(40, Math.max(0.1, existing.radiusMiles)),
      fee: existing.fee == null ? null : Number.isFinite(Number(existing.fee)) ? Number(Number(existing.fee).toFixed(2)) : null,
      enabledSectors,
      enabled: enabledSectors.length > 0,
    };
  });
};

export function isValidMapCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export const resolveBusinessOrigin = (args: {
  storePostcode: string;
  originLatitude?: number | null;
  originLongitude?: number | null;
}): { lat: number; lng: number } | null => {
  if (args.originLatitude != null && args.originLongitude != null) {
    const lat = Number(args.originLatitude);
    const lng = Number(args.originLongitude);
    if (isValidMapCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  const sector = parseUkPostcodeSector(args.storePostcode);
  if (sector) {
    const sectorPoint = getHullSectorCentroid(sector.outward, sector.sector);
    if (sectorPoint) {
      return sectorPoint;
    }
  }

  const outward = parseUkOutwardCode(args.storePostcode);
  if (outward && HULL_AREA_OUTWARD_CENTROIDS[outward]) {
    return HULL_AREA_OUTWARD_CENTROIDS[outward];
  }

  return { lat: 53.767, lng: -0.367 };
};

export const normaliseDeliveryPricing = (raw: unknown): StoreDeliveryPricing => {
  const parsed = storeDeliveryPricingSchema.safeParse(raw);
  const base = parsed.success ? parsed.data : storeDeliveryPricingSchema.parse({});

  const legacyDistricts = base.postcodeDistricts.map((code) => code.trim().toUpperCase()).filter(Boolean);
  const knownHull = listKnownHullOutwardCodes();
  const legacyIsFullHull =
    legacyDistricts.length >= knownHull.length && knownHull.every((code) => legacyDistricts.includes(code));

  let mode: DeliveryMode = base.mode;
  let postcodeZones = mergeHullPostcodeZones(base.postcodeZones);

  if (
    base.mode !== "business_radius" &&
    base.postcodeZones.length === 0 &&
    legacyDistricts.length > 0 &&
    !legacyIsFullHull
  ) {
    mode = "postcode_zones";
    const legacySet = new Set(legacyDistricts);
    postcodeZones = mergeHullPostcodeZones(
      knownHull.map((code) => ({
        code,
        radiusMiles: base.radiusMiles,
        fee: null,
        enabled: legacySet.has(code),
        enabledSectors: [],
      })),
    );
  }

  if (base.postcodeZones.length > 0) {
    postcodeZones = mergeHullPostcodeZones(base.postcodeZones);
  }

  const distanceRanges = normalizeDeliveryDistanceRanges(base.distanceRanges, base.mileFees);

  return {
    ...base,
    mode,
    postcodeZones,
    distanceRanges,
    radiusMiles: base.radiusMiles,
  };
};

/** Strip inactive delivery-mode settings so checkout/storefront only use the selected mode. */
export const lockDeliveryPricingForActiveMode = (pricing: StoreDeliveryPricing): StoreDeliveryPricing => {
  if (pricing.mode === "postcode_zones") {
    return {
      ...pricing,
      distanceRanges: [],
      mileFees: [0, 0, 0, 0, 0],
    };
  }

  return {
    ...pricing,
    postcodeZones: pricing.postcodeZones.map((zone) => ({
      ...zone,
      enabled: false,
      enabledSectors: [],
      fee: null,
    })),
  };
};

/** Normalise hub delivery JSON for customer-facing catalog, checkout, and fee previews. */
export const normaliseDeliveryPricingForServe = (raw: unknown): StoreDeliveryPricing =>
  lockDeliveryPricingForActiveMode(normaliseDeliveryPricing(raw));

/** Outward district centroids from postcodes.io (see hull-sector-geocodes.generated.ts). */
export const HULL_AREA_OUTWARD_CENTROIDS: Record<string, { lat: number; lng: number }> = Object.fromEntries(
  Object.entries(HULL_SECTOR_GEOCODES.outwards).map(([code, point]) => [code, { lat: point.lat, lng: point.lng }]),
);

const syntheticSectorOffsetFromOutward = (
  base: { lat: number; lng: number },
  sectorDigit: string,
): { lat: number; lng: number } => {
  const digit = Number(sectorDigit);
  const angle = (digit / 9) * 2 * Math.PI - Math.PI / 2;
  const mileOffset = 0.18;
  const latDegreesPerMile = 1 / 69;
  const lngDegreesPerMile = 1 / (69 * Math.cos((base.lat * Math.PI) / 180));
  return {
    lat: base.lat + Math.sin(angle) * mileOffset * latDegreesPerMile,
    lng: base.lng + Math.cos(angle) * mileOffset * lngDegreesPerMile,
  };
};

/**
 * UK outward code (e.g. HU5 from "HU5 5LT"). Inward is always the last 3 characters (digit + 2 letters).
 * The naive prefix regex wrongly treats "HU5 5LT" as HU55 because the sector digit is consumed as part of outward.
 */
export const parseUkOutwardCode = (postcode: string | undefined | null): string | null => {
  if (!postcode?.trim()) {
    return null;
  }

  const compact = postcode.trim().toUpperCase().replace(/\s+/g, "");

  const fullPostcode = compact.match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/);
  if (fullPostcode?.[1]) {
    return fullPostcode[1];
  }

  const outwardOnly = compact.match(/^([A-Z]{1,2}\d[A-Z\d]?)$/);
  if (outwardOnly?.[1]) {
    return outwardOnly[1];
  }

  const partial = compact.match(/^([A-Z]{1,2}\d)/);
  return partial?.[1] ?? null;
};

/** Outward + sector digit from a full UK postcode (e.g. HU7 3AB → HU7 / 3). */
export const parseUkPostcodeSector = (
  postcode: string | undefined | null,
): { outward: string; sector: HullSectorDigit } | null => {
  if (!postcode?.trim()) {
    return null;
  }

  const compact = postcode.trim().toUpperCase().replace(/\s+/g, "");
  const match = compact.match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d)[A-Z]{2}$/);
  if (!match?.[1] || !match[2]) {
    return null;
  }

  const sector = match[2] as HullSectorDigit;
  if (!HULL_SECTOR_DIGITS.includes(sector)) {
    return null;
  }

  return { outward: match[1], sector };
};

/**
 * Map position for a postcode sector (HU7 3, …).
 * Uses postcodes.io sample points when available; otherwise a small offset from the real outward centroid.
 */
export const getHullSectorCentroid = (outwardCode: string, sectorDigit: string): { lat: number; lng: number } | null => {
  const outward = outwardCode.trim().toUpperCase();
  const digit = sectorDigit.trim();
  if (!/^[0-9]$/.test(digit)) {
    return null;
  }

  const sectorMap = HULL_SECTOR_GEOCODES.sectors as Record<string, Record<string, { lat: number; lng: number }>>;
  const geocoded = sectorMap[outward]?.[digit];
  if (geocoded) {
    return { lat: geocoded.lat, lng: geocoded.lng };
  }

  const outwardBase = HULL_AREA_OUTWARD_CENTROIDS[outward];
  if (!outwardBase) {
    return null;
  }

  return syntheticSectorOffsetFromOutward(outwardBase, digit);
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

const pickDistanceRangeFee = (miles: number, ranges: DeliveryDistanceRange[]): number | null => {
  const match = ranges.find((range) => miles <= range.maxMiles + 0.0001);
  return match ? Number(match.fee.toFixed(2)) : null;
};

const hasAnyMileFee = (fees: number[]) => fees.some((value) => value > 0);

const minDistanceRangeFee = (ranges: DeliveryDistanceRange[]): number | null => {
  if (ranges.length === 0) {
    return null;
  }
  return Math.min(...ranges.map((range) => range.fee));
};

const minConfiguredZoneFee = (zones: HullPostcodeZone[]): number | null => {
  const fees = zones.filter((zone) => zone.fee != null).map((zone) => Number(zone.fee));
  if (fees.length === 0) {
    return null;
  }
  return Math.min(...fees);
};

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
  const pricing = args.pricing ? normaliseDeliveryPricingForServe(args.pricing) : null;
  if (pricing?.mode === "postcode_zones") {
    const zoneFee = minConfiguredZoneFee(pricing.postcodeZones);
    if (zoneFee !== null) {
      return Number(zoneFee.toFixed(2));
    }
  } else if (pricing?.distanceRanges.length) {
    const rangeFee = minDistanceRangeFee(pricing.distanceRanges);
    if (rangeFee !== null) {
      return Number(rangeFee.toFixed(2));
    }
  } else if (pricing && hasAnyMileFee(pricing.mileFees)) {
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

  const pricing = args.pricing ? normaliseDeliveryPricingForServe(args.pricing) : null;
  const legacy = args.legacyDeliveryFee ?? 0;
  const rangeConfigured = Boolean(pricing && pricing.distanceRanges.length > 0);
  const tiersConfigured = Boolean(pricing && hasAnyMileFee(pricing.mileFees));
  const zoneFeesConfigured = Boolean(pricing && pricing.postcodeZones.some((zone) => zone.fee != null));
  const postcodeCoverageConfigured = Boolean(
    pricing?.mode === "postcode_zones" && pricing.postcodeZones.some((zone) => hullZoneHasCoverage(zone)),
  );
  const radiusCoverageConfigured = Boolean(
    pricing?.mode === "business_radius" && (pricing.radiusMiles > 0 || rangeConfigured || tiersConfigured),
  );
  const enforceCoverage = postcodeCoverageConfigured || radiusCoverageConfigured || legacy > 0;

  const usesConfiguredPricing =
    pricing?.mode === "postcode_zones"
      ? zoneFeesConfigured
      : rangeConfigured || tiersConfigured;

  const customerOutward = parseUkOutwardCode(args.customerPostcode ?? "");
  if (!customerOutward) {
    const preview =
      pricing?.mode === "postcode_zones"
        ? minConfiguredZoneFee(pricing.postcodeZones)
        : pricing && rangeConfigured
          ? minDistanceRangeFee(pricing.distanceRanges)
          : pricing && tiersConfigured
            ? minPositiveMileFee(pricing.mileFees)
            : null;
    const fee =
      preview != null
        ? Number(preview.toFixed(2))
        : legacy > 0
          ? Number(legacy.toFixed(2))
          : PLATFORM_DEFAULT_DELIVERY_GBP;
    return {
      fee,
      needsPostcode: true,
      isDefaultPricing: !usesConfiguredPricing,
      blocked: false,
    };
  }

  if (!enforceCoverage) {
    const fee = legacy > 0 ? Number(legacy.toFixed(2)) : PLATFORM_DEFAULT_DELIVERY_GBP;
    return { fee, needsPostcode: false, isDefaultPricing: true, blocked: false };
  }

  const cfg = pricing!;
  const originPoint = resolveBusinessOrigin({
    storePostcode: args.storeBasePostcode,
    originLatitude: cfg.originLatitude,
    originLongitude: cfg.originLongitude,
  });
  const destPoint = HULL_AREA_OUTWARD_CENTROIDS[customerOutward] ?? null;

  if (!originPoint) {
    return {
      fee: 0,
      needsPostcode: false,
      isDefaultPricing: false,
      blocked: true,
      reason: DELIVERY_NOT_AVAILABLE_TO_POSTCODE_MESSAGE,
    };
  }

  if (!destPoint) {
    return {
      fee: 0,
      needsPostcode: false,
      isDefaultPricing: false,
      blocked: true,
      reason: DELIVERY_NOT_AVAILABLE_TO_POSTCODE_MESSAGE,
    };
  }

  let zone: HullPostcodeZone | undefined;
  if (cfg.mode === "postcode_zones") {
    zone = cfg.postcodeZones.find((entry) => entry.code === customerOutward);
    if (!zone || !hullZoneHasCoverage(zone)) {
      return {
        fee: 0,
        needsPostcode: false,
        isDefaultPricing: false,
        blocked: true,
        reason: DELIVERY_NOT_AVAILABLE_TO_POSTCODE_MESSAGE,
      };
    }

    const customerSector = parseUkPostcodeSector(args.customerPostcode ?? "");
    if (customerSector && customerSector.outward === customerOutward) {
      if (!isHullZoneSectorEnabled(zone, customerSector.sector)) {
        return {
          fee: 0,
          needsPostcode: false,
          isDefaultPricing: false,
          blocked: true,
          reason: DELIVERY_NOT_AVAILABLE_TO_POSTCODE_MESSAGE,
        };
      }
    }
  } else {
    const milesFromShop = haversineMiles(originPoint, destPoint);
    if (milesFromShop > cfg.radiusMiles + 0.001) {
      return {
        fee: 0,
        needsPostcode: false,
        isDefaultPricing: false,
        blocked: true,
        reason: DELIVERY_NOT_AVAILABLE_TO_POSTCODE_MESSAGE,
      };
    }
  }

  const milesForFee = haversineMiles(originPoint, destPoint);
  const configuredFee =
    cfg.mode === "postcode_zones"
      ? zone?.fee != null
        ? Number(zone.fee.toFixed(2))
        : null
      : rangeConfigured
        ? pickDistanceRangeFee(milesForFee, cfg.distanceRanges)
        : tiersConfigured
          ? Number(pickMileBandFee(milesForFee, cfg.mileFees).toFixed(2))
          : null;
  const fee =
    configuredFee != null
      ? configuredFee
      : legacy > 0
        ? Number(legacy.toFixed(2))
        : PLATFORM_DEFAULT_DELIVERY_GBP;
  return {
    fee,
    needsPostcode: false,
    isDefaultPricing: configuredFee == null,
    blocked: false,
  };
};
