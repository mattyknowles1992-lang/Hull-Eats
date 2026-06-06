import type { HubMenuSection, HubSettings } from "@hull-eats/types";
import {
  createDefaultHullPostcodeZones,
  createDefaultOpeningHours,
  defaultKitchenTicketSettings,
  normalizeKitchenTicketSettings,
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
  sent: HubSettings,
  server: HubSettings,
): HubSettings => {
  if (JSON.stringify(local) !== JSON.stringify(sent)) {
    return local;
  }
  return {
    ...local,
    deliveryOriginLatitude: server.deliveryOriginLatitude,
    deliveryOriginLongitude: server.deliveryOriginLongitude,
  };
};
