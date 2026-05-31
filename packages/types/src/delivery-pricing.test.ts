import { describe, expect, it } from "vitest";

import {
  computeDeliveryQuote,
  normalizeDeliveryDistanceRanges,
  resolveDeliveryMinimumOrder,
} from "./delivery-pricing";

describe("delivery-pricing minimum order bands", () => {
  it("normalizes minimum order on distance ranges", () => {
    expect(
      normalizeDeliveryDistanceRanges([
        { maxMiles: 3, fee: 3.5, minimumOrderAmount: 10 },
        { maxMiles: 5, fee: 5, minimumOrderAmount: 20 },
      ]),
    ).toEqual([
      { maxMiles: 3, fee: 3.5, minimumOrderAmount: 10 },
      { maxMiles: 5, fee: 5, minimumOrderAmount: 20 },
    ]);
  });

  it("resolves range minimum before store default", () => {
    expect(
      resolveDeliveryMinimumOrder({
        legacyMinimumOrderAmount: 8,
        range: { maxMiles: 5, fee: 5, minimumOrderAmount: 20 },
      }),
    ).toBe(20);
  });

  it("falls back to store default when range minimum is blank", () => {
    expect(
      resolveDeliveryMinimumOrder({
        legacyMinimumOrderAmount: 8,
        range: { maxMiles: 2, fee: 2.3, minimumOrderAmount: null },
      }),
    ).toBe(8);
  });

  it("returns distance-based minimum on checkout quote when postcode is known", () => {
    const quote = computeDeliveryQuote({
      fulfillmentType: "delivery",
      storeBasePostcode: "HU6 7AA",
      legacyDeliveryFee: 2.3,
      legacyMinimumOrderAmount: 8,
      customerPostcode: "HU7 3AB",
      pricing: {
        mode: "business_radius",
        radiusMiles: 5,
        distanceRanges: [
          { maxMiles: 1.5, fee: 2.3, minimumOrderAmount: 8 },
          { maxMiles: 5, fee: 5, minimumOrderAmount: 20 },
        ],
        postcodeZones: [],
        postcodeDistricts: [],
        mileFees: [0, 0, 0, 0, 0],
        orderFulfillment: "delivery_and_collection",
      },
    });

    expect(quote.blocked).toBe(false);
    expect(quote.minimumOrderAmount).toBeGreaterThanOrEqual(8);
    expect(quote.fee).toBeGreaterThan(0);
  });

  it("uses store minimum for pickup", () => {
    const quote = computeDeliveryQuote({
      fulfillmentType: "pickup",
      storeBasePostcode: "HU6 7AA",
      legacyMinimumOrderAmount: 8,
    });

    expect(quote.minimumOrderAmount).toBe(8);
    expect(quote.fee).toBe(0);
  });
});
