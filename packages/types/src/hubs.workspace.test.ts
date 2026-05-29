import { describe, expect, it } from "vitest";

import { parseMerchantWorkspaceUpdateInput } from "./hubs.js";

const baseSettings = {
  name: "Test Takeaway",
  cuisineLabel: "Pizza",
  onboardingMessage: "",
  city: "Hull",
  postcode: "HU1 1AA",
  etaMinutes: 25,
  deliveryFee: 2.5,
  minimumOrderAmount: 10,
  acceptingOrders: true,
  isOpen: true,
  logoImageUrl: "",
  heroImageUrl: "",
  autoAcceptOrders: false,
  autoAcceptMaxPrepMinutes: 60,
  deliveryMode: "business_radius" as const,
  deliveryRadiusMiles: 5,
  deliveryDistanceRanges: [],
  deliveryPostcodeZones: [],
  deliveryMileFees: [0, 0, 0, 0, 0],
  deliveryOriginLatitude: null,
  deliveryOriginLongitude: null,
  orderFulfillment: "delivery_and_collection" as const,
  openingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    closed: false,
    openTime: "12:00",
    closeTime: "22:00",
  })),
};

describe("parseMerchantWorkspaceUpdateInput", () => {
  it("accepts settings-only workspace saves without menuSections", () => {
    const parsed = parseMerchantWorkspaceUpdateInput({ settings: baseSettings });
    expect(parsed.settings.name).toBe("Test Takeaway");
    expect(parsed.menuSections).toBeUndefined();
  });

  it("accepts full menu publish payloads", () => {
    const parsed = parseMerchantWorkspaceUpdateInput({
      settings: baseSettings,
      menuSections: [
        {
          id: "section-1",
          name: "Mains",
          description: "",
          items: [],
        },
      ],
    });
    expect(parsed.menuSections).toHaveLength(1);
  });
});
