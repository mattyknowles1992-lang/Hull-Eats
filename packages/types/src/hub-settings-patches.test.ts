import { describe, expect, it } from "vitest";

import { defaultKitchenTicketSettings } from "./kitchen-ticket";
import {
  buildHubSettingsSectionSavePayload,
  hubSettingsSectionHasChanges,
} from "./hub-settings-patches";
import type { HubSettings } from "./hubs";

const baseSettings = (): HubSettings =>
  ({
    name: "Test",
    cuisineLabel: "",
    onboardingMessage: "",
    city: "Hull",
    postcode: "HU1 1AA",
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
    deliveryPostcodeZones: [],
    deliveryMileFees: [0, 0, 0, 0, 0],
    deliveryOriginLatitude: null,
    deliveryOriginLongitude: null,
    orderFulfillment: "delivery_and_collection",
    openingHours: [],
    kitchenTicket: defaultKitchenTicketSettings(),
    menuTemplate: "full_food",
    marketplaceCategorySlug: "",
    heroImageCrop: { focusX: 50, focusY: 50, zoom: 1 },
  }) as HubSettings;

describe("hub settings section saves", () => {
  it("does not treat equivalent kitchen tickets as changed", () => {
    const saved = baseSettings();
    const current = {
      ...saved,
      kitchenTicket: defaultKitchenTicketSettings(),
    };

    expect(hubSettingsSectionHasChanges("settings", current, saved)).toBe(false);
  });

  it("builds a patch with only changed fields", () => {
    const saved = baseSettings();
    const current = { ...saved, etaMinutes: 35 };

    expect(buildHubSettingsSectionSavePayload("settings", current, saved)).toEqual({
      etaMinutes: 35,
    });
  });

  it("returns an empty patch when nothing changed in the section", () => {
    const saved = baseSettings();
    expect(buildHubSettingsSectionSavePayload("settings", saved, saved)).toEqual({});
  });

  it("validates only changed business profile fields", () => {
    const saved = { ...baseSettings(), name: "" } as HubSettings;
    const current = { ...saved, heroImageUrl: "data:image/jpeg;base64,abc" };

    expect(buildHubSettingsSectionSavePayload("businessProfile", current, saved)).toEqual({
      heroImageUrl: "data:image/jpeg;base64,abc",
    });
  });
});
