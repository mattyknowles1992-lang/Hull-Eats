import type { HubMenuSection, HubSettings } from "@hull-eats/types";
import {
  createDefaultHullPostcodeZones,
  createDefaultOpeningHours,
  defaultKitchenTicketSettings,
  HUB_SETTINGS_PATCH_KEYS,
  normalizeKitchenTicketSettings,
  type HubSettingsPatchSection,
} from "@hull-eats/types";

export type HubWorkspaceSnapshot = {
  settings: HubSettings;
  menuSections: HubMenuSection[];
};

export const emptyHubSettings: HubSettings = {
  name: "",
  cuisineLabel: "",
  onboardingMessage: "",
  city: "",
  postcode: "",
  etaMinutes: 25,
  deliveryFee: 0,
  minimumOrderAmount: 0,
  acceptingOrders: true,
  isOpen: false,
  logoImageUrl: "",
  heroImageUrl: "",
  autoAcceptOrders: false,
  autoAcceptMaxPrepMinutes: 60,
  deliveryMode: "business_radius",
  deliveryRadiusMiles: 5,
  deliveryDistanceRanges: [],
  deliveryPostcodeZones: createDefaultHullPostcodeZones(),
  deliveryMileFees: [0, 0, 0, 0, 0],
  deliveryOriginLatitude: null,
  deliveryOriginLongitude: null,
  orderFulfillment: "delivery_and_collection",
  openingHours: createDefaultOpeningHours(),
  kitchenTicket: defaultKitchenTicketSettings(),
  menuTemplate: "full_food",
  marketplaceCategorySlug: "",
  heroImageCrop: { focusX: 50, focusY: 50, zoom: 1 },
};

export const normalizeWorkspaceSettings = (settings: HubSettings): HubSettings => {
  const postcodeZones = settings.deliveryPostcodeZones ?? [];
  const openingHours = settings.openingHours ?? [];
  const deliveryDistanceRanges = settings.deliveryDistanceRanges ?? [];
  const deliveryMileFees = settings.deliveryMileFees ?? [0, 0, 0, 0, 0];

  return {
    ...settings,
    deliveryDistanceRanges,
    deliveryMileFees,
    deliveryPostcodeZones: postcodeZones.length > 0 ? postcodeZones : createDefaultHullPostcodeZones(),
    openingHours: openingHours.length === 7 ? openingHours : createDefaultOpeningHours(),
    kitchenTicket: normalizeKitchenTicketSettings(settings.kitchenTicket),
    menuTemplate: settings.menuTemplate ?? "full_food",
    marketplaceCategorySlug: settings.marketplaceCategorySlug ?? "",
    heroImageCrop: settings.heroImageCrop ?? { focusX: 50, focusY: 50, zoom: 1 },
  };
};

export const cloneHubSettings = (settings: HubSettings): HubSettings => {
  const normalized = normalizeWorkspaceSettings(settings);
  return {
    ...normalized,
    deliveryDistanceRanges: normalized.deliveryDistanceRanges.map((range) => ({ ...range })),
    deliveryPostcodeZones: normalized.deliveryPostcodeZones.map((zone) => ({ ...zone })),
    deliveryMileFees: [...normalized.deliveryMileFees] as HubSettings["deliveryMileFees"],
    openingHours: normalized.openingHours.map((day) => ({ ...day })),
  };
};

export const cloneMenuSections = (sections: HubMenuSection[]): HubMenuSection[] =>
  JSON.parse(JSON.stringify(sections)) as HubMenuSection[];

export const hubWorkspaceSnapshotsEqual = (left: HubWorkspaceSnapshot, right: HubWorkspaceSnapshot): boolean =>
  JSON.stringify(left.settings) === JSON.stringify(right.settings) &&
  JSON.stringify(left.menuSections) === JSON.stringify(right.menuSections);

export const mergeGeocodedSettingsFromServer = (
  local: HubSettings,
  sent: Partial<HubSettings>,
  server: HubSettings,
): HubSettings => {
  const sentKeys = Object.keys(sent) as (keyof HubSettings)[];
  const localStillMatchesSent = sentKeys.every(
    (key) => JSON.stringify(local[key]) === JSON.stringify(sent[key]),
  );
  if (!localStillMatchesSent) {
    return local;
  }
  if (sent.postcode === undefined) {
    return local;
  }
  return {
    ...local,
    deliveryOriginLatitude: server.deliveryOriginLatitude,
    deliveryOriginLongitude: server.deliveryOriginLongitude,
  };
};

export const mergePartialSettingsAfterSave = (
  previouslySaved: HubSettings,
  local: HubSettings,
  sent: Partial<HubSettings>,
  server: HubSettings,
): HubSettings => {
  const sentKeys = Object.keys(sent) as (keyof HubSettings)[];
  const patchFromServer = Object.fromEntries(sentKeys.map((key) => [key, server[key]])) as Partial<HubSettings>;
  const mergedSaved = { ...previouslySaved, ...patchFromServer };
  const localStillMatchesSent = sentKeys.every(
    (key) => JSON.stringify(local[key]) === JSON.stringify(sent[key]),
  );
  if (!localStillMatchesSent) {
    return mergedSaved;
  }
  return mergeGeocodedSettingsFromServer(mergedSaved, sent, server);
};

export function revertHubSettingsSection(
  current: HubSettings,
  saved: HubSettings,
  section: HubSettingsPatchSection,
): HubSettings {
  const next = cloneHubSettings(current);
  for (const key of HUB_SETTINGS_PATCH_KEYS[section]) {
    (next as Record<string, unknown>)[key] = JSON.parse(JSON.stringify(saved[key]));
  }
  return next;
};
