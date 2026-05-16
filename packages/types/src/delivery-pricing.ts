import { z } from "zod";

/** Default delivery when hub has not set mile fees / zones (Hull Eats platform default). */
export const PLATFORM_DEFAULT_DELIVERY_GBP = 3;

/** Customer-facing copy when delivery cannot be priced for the postcode (no hub/merchant jargon). */
export const DELIVERY_NOT_AVAILABLE_TO_POSTCODE_MESSAGE = "Delivery is not available for your postcode.";

export const deliveryModeSchema = z.enum(["business_radius", "postcode_zones"]);
export type DeliveryMode = z.infer<typeof deliveryModeSchema>;

/** UK postcode sector digits (e.g. HU7 3xx → sector "3"). */
export const HULL_SECTOR_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
export type HullSectorDigit = (typeof HULL_SECTOR_DIGITS)[number];

export const hullPostcodeZoneSchema = z.object({
  code: z.string().min(2).max(8),
  radiusMiles: z.number().min(0.1).max(40),
  /** Legacy whole-area flag; kept in sync with enabledSectors on read/write. */
  enabled: z.boolean(),
  /** Sector digits enabled for this outward (HU7 1, HU7 2, …). Empty + enabled=true means all sectors. */
  enabledSectors: z.array(z.string().regex(/^[1-9]$/)).default([]),
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
  /** Postcode-zone mode: per outward district (HU1, HU2, …) with its own radius from centroid. */
  postcodeZones: z.array(hullPostcodeZoneSchema).default([]),
  /** Legacy outward list; migrated into postcodeZones on read. */
  postcodeDistricts: z.array(z.string().min(2).max(8)).default([]),
  mileFees: z.array(z.number().nonnegative()).length(5).default([0, 0, 0, 0, 0]),
  /** Optional override for distance origin; otherwise the hub base postcode outward centroid is used. */
  originLatitude: z.number().min(-90).max(90).nullable().optional(),
  originLongitude: z.number().min(-180).max(180).nullable().optional(),
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
    enabled: false,
    enabledSectors: [],
  }));

const normalizeSectorDigits = (sectors: string[] | undefined): HullSectorDigit[] => {
  const allowed = new Set<string>(HULL_SECTOR_DIGITS);
  return [...new Set((sectors ?? []).map((digit) => digit.trim()).filter((digit) => allowed.has(digit)))]
    .sort() as HullSectorDigit[];
};

/** Enabled sector digits for a zone (migrates legacy enabled=true to all sectors). */
export const getHullZoneEnabledSectors = (zone: HullPostcodeZone): HullSectorDigit[] => {
  const normalized = normalizeSectorDigits(zone.enabledSectors);
  if (normalized.length > 0) {
    return normalized;
  }
  return zone.enabled ? [...HULL_SECTOR_DIGITS] : [];
};

export const isHullZoneSectorEnabled = (zone: HullPostcodeZone, sectorDigit: string): boolean =>
  getHullZoneEnabledSectors(zone).includes(sectorDigit as HullSectorDigit);

export const hullZoneHasCoverage = (zone: HullPostcodeZone): boolean => getHullZoneEnabledSectors(zone).length > 0;

export const mergeHullPostcodeZones = (saved: HullPostcodeZone[] | undefined): HullPostcodeZone[] => {
  const byCode = new Map((saved ?? []).map((zone) => [zone.code.trim().toUpperCase(), zone]));

  return listKnownHullOutwardCodes().map((code) => {
    const existing = byCode.get(code);
    if (!existing) {
      return { code, radiusMiles: 1.5, enabled: false, enabledSectors: [] };
    }

    const enabledSectors = getHullZoneEnabledSectors({
      ...existing,
      code,
      radiusMiles: existing.radiusMiles,
    });

    return {
      code,
      radiusMiles: Math.min(40, Math.max(0.1, existing.radiusMiles)),
      enabledSectors,
      enabled: enabledSectors.length > 0,
    };
  });
};

export const resolveBusinessOrigin = (args: {
  storePostcode: string;
  originLatitude?: number | null;
  originLongitude?: number | null;
}): { lat: number; lng: number } | null => {
  if (args.originLatitude != null && args.originLongitude != null) {
    return { lat: args.originLatitude, lng: args.originLongitude };
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

  if (base.postcodeZones.length === 0 && legacyDistricts.length > 0 && !legacyIsFullHull) {
    mode = "postcode_zones";
    const legacySet = new Set(legacyDistricts);
    postcodeZones = mergeHullPostcodeZones(
      knownHull.map((code) => ({
        code,
        radiusMiles: base.radiusMiles,
        enabled: legacySet.has(code),
        enabledSectors: [],
      })),
    );
  }

  if (base.postcodeZones.length > 0) {
    postcodeZones = mergeHullPostcodeZones(base.postcodeZones);
  }

  return {
    ...base,
    mode,
    postcodeZones,
    radiusMiles: base.radiusMiles,
  };
};

/** Approximate centroid per outward district for distance estimates (Hull focus). */
export const HULL_AREA_OUTWARD_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  HU1: { lat: 53.7446, lng: -0.3357 },
  HU2: { lat: 53.7547, lng: -0.3575 },
  HU3: { lat: 53.7461, lng: -0.3842 },
  HU4: { lat: 53.7712, lng: -0.3578 },
  HU5: { lat: 53.7819, lng: -0.4371 },
  HU6: { lat: 53.7581, lng: -0.3194 },
  /** Cottingham / north Hull cluster — previous centroid sat too far north toward Beverley. */
  HU7: { lat: 53.782, lng: -0.398 },
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

/** Approximate map position for a postcode sector within an outward district. */
export const getHullSectorCentroid = (outwardCode: string, sectorDigit: string): { lat: number; lng: number } | null => {
  const outward = outwardCode.trim().toUpperCase();
  const base = HULL_AREA_OUTWARD_CENTROIDS[outward];
  if (!base) {
    return null;
  }

  const digit = Number(sectorDigit);
  if (!Number.isFinite(digit) || digit < 1 || digit > 9) {
    return null;
  }

  const angle = ((digit - 1) / HULL_SECTOR_DIGITS.length) * 2 * Math.PI - Math.PI / 2;
  /** Keep sector seeds near the outward hub so map tiles stay local (Voronoi is computed per district). */
  const mileOffset = 0.26;
  const latDegreesPerMile = 1 / 69;
  const lngDegreesPerMile = 1 / (69 * Math.cos((base.lat * Math.PI) / 180));

  return {
    lat: base.lat + Math.sin(angle) * mileOffset * latDegreesPerMile,
    lng: base.lng + Math.cos(angle) * mileOffset * lngDegreesPerMile,
  };
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
  const coverageConfigured = Boolean(
    pricing &&
      (pricing.mode === "business_radius" ||
        (pricing.mode === "postcode_zones" && pricing.postcodeZones.some((zone) => hullZoneHasCoverage(zone)))),
  );
  const enforceCoverage = tiersConfigured || coverageConfigured;

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

  if (cfg.mode === "postcode_zones") {
    const zone = cfg.postcodeZones.find((entry) => entry.code === customerOutward);
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
  const fee = tiersConfigured
    ? Number(pickMileBandFee(milesForFee, cfg.mileFees).toFixed(2))
    : legacy > 0
      ? Number(legacy.toFixed(2))
      : PLATFORM_DEFAULT_DELIVERY_GBP;
  return {
    fee,
    needsPostcode: false,
    isDefaultPricing: !tiersConfigured,
    blocked: false,
  };
};
