import { z } from "zod";

import { normalizeKitchenTicketSettings } from "./kitchen-ticket";
import { hubSettingsPatchSchema, hubSettingsSchema, type HubSettings } from "./hubs";

export const hubBusinessProfileSettingsPatchSchema = hubSettingsSchema.pick({
  name: true,
  cuisineLabel: true,
  onboardingMessage: true,
  heroImageUrl: true,
  heroImageCrop: true,
  logoImageUrl: true,
  marketplaceCategorySlug: true,
});

export const hubAvailabilitySettingsPatchSchema = hubSettingsSchema.pick({
  openingHours: true,
  acceptingOrders: true,
});

export const hubDeliverySettingsPatchSchema = hubSettingsSchema.pick({
  city: true,
  postcode: true,
  deliveryMode: true,
  deliveryRadiusMiles: true,
  deliveryDistanceRanges: true,
  deliveryPostcodeZones: true,
  deliveryMileFees: true,
  deliveryOriginLatitude: true,
  deliveryOriginLongitude: true,
  orderFulfillment: true,
  deliveryFee: true,
  minimumOrderAmount: true,
});

export const hubStoreSettingsPatchSchema = hubSettingsSchema.pick({
  etaMinutes: true,
  autoAcceptOrders: true,
  autoAcceptMaxPrepMinutes: true,
  kitchenTicket: true,
});

export const HUB_SETTINGS_PATCH_KEYS = {
  businessProfile: [
    "name",
    "cuisineLabel",
    "onboardingMessage",
    "heroImageUrl",
    "heroImageCrop",
    "logoImageUrl",
    "marketplaceCategorySlug",
  ],
  availability: ["openingHours", "acceptingOrders"],
  deliveryRanges: [
    "city",
    "postcode",
    "deliveryMode",
    "deliveryRadiusMiles",
    "deliveryDistanceRanges",
    "deliveryPostcodeZones",
    "deliveryMileFees",
    "deliveryOriginLatitude",
    "deliveryOriginLongitude",
    "orderFulfillment",
    "deliveryFee",
    "minimumOrderAmount",
  ],
  settings: ["etaMinutes", "autoAcceptOrders", "autoAcceptMaxPrepMinutes", "kitchenTicket"],
} as const satisfies Record<string, readonly (keyof HubSettings)[]>;

export type HubSettingsPatchSection = keyof typeof HUB_SETTINGS_PATCH_KEYS;

export function hubSettingsFieldEqual(
  key: keyof HubSettings,
  left: HubSettings,
  right: HubSettings,
): boolean {
  if (key === "kitchenTicket") {
    return (
      JSON.stringify(normalizeKitchenTicketSettings(left.kitchenTicket)) ===
      JSON.stringify(normalizeKitchenTicketSettings(right.kitchenTicket))
    );
  }

  return JSON.stringify(left[key]) === JSON.stringify(right[key]);
}

export function pickHubSettingsPatch(section: HubSettingsPatchSection, settings: HubSettings): Partial<HubSettings> {
  const keys = HUB_SETTINGS_PATCH_KEYS[section];
  const patch: Record<string, unknown> = {};
  for (const key of keys) {
    patch[key] = settings[key];
  }
  return patch as Partial<HubSettings>;
}

export function hubSettingsPatchSchemaForSection(section: HubSettingsPatchSection) {
  switch (section) {
    case "businessProfile":
      return hubBusinessProfileSettingsPatchSchema;
    case "availability":
      return hubAvailabilitySettingsPatchSchema;
    case "deliveryRanges":
      return hubDeliverySettingsPatchSchema;
    case "settings":
      return hubStoreSettingsPatchSchema;
    default:
      return hubSettingsPatchSchema;
  }
}

export function hubSettingsSectionHasChanges(
  section: HubSettingsPatchSection,
  current: HubSettings,
  saved: HubSettings,
): boolean {
  const keys = HUB_SETTINGS_PATCH_KEYS[section];
  return keys.some((key) => !hubSettingsFieldEqual(key, current, saved));
}

export function pickChangedHubSettingsPatch(
  section: HubSettingsPatchSection,
  current: HubSettings,
  saved: HubSettings,
): Partial<HubSettings> {
  const keys = HUB_SETTINGS_PATCH_KEYS[section];
  const patch: Record<string, unknown> = {};
  for (const key of keys) {
    if (!hubSettingsFieldEqual(key, current, saved)) {
      patch[key] = current[key];
    }
  }
  return patch as Partial<HubSettings>;
}

/** Validate only changed keys, then return the minimal PATCH body. */
export function buildHubSettingsSectionSavePayload(
  section: HubSettingsPatchSection,
  current: HubSettings,
  saved: HubSettings,
): Partial<HubSettings> {
  const changedPatch = pickChangedHubSettingsPatch(section, current, saved);
  if (Object.keys(changedPatch).length === 0) {
    return {};
  }

  hubSettingsPatchSchema.parse(changedPatch);

  return changedPatch;
}

export function parseHubSettingsPatchForSection(section: HubSettingsPatchSection, settings: HubSettings) {
  return hubSettingsPatchSchemaForSection(section).parse(pickHubSettingsPatch(section, settings));
}
