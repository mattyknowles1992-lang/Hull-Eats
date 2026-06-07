import { z } from "zod";

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
  return keys.some((key) => JSON.stringify(current[key]) !== JSON.stringify(saved[key]));
}

export function parseHubSettingsPatchForSection(section: HubSettingsPatchSection, settings: HubSettings) {
  return hubSettingsPatchSchemaForSection(section).parse(pickHubSettingsPatch(section, settings));
}
