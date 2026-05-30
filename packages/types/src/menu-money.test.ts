import { describe, expect, it } from "vitest";

import {
  MAX_MENU_MONEY_AMOUNT,
  sanitizeHubMenuSectionMoneyFields,
  sanitizeMenuItemMoneyFields,
  sanitizeMenuMoneyAmount,
} from "./menu-money";

describe("menu-money", () => {
  it("clamps values to DECIMAL(10,2) range", () => {
    expect(sanitizeMenuMoneyAmount(12.345)).toBe(12.35);
    expect(sanitizeMenuMoneyAmount(100_000_000)).toBe(MAX_MENU_MONEY_AMOUNT);
    expect(sanitizeMenuMoneyAmount(Number.POSITIVE_INFINITY)).toBe(0);
    expect(sanitizeMenuMoneyAmount("9.5")).toBe(9.5);
  });

  it("sanitizes menu item and option deltas", () => {
    const next = sanitizeMenuItemMoneyFields({
      price: 999_999_999,
      optionGroups: [
        {
          id: "g1",
          name: "Size",
          description: "",
          selectionMode: "single",
          isRequired: true,
          minSelections: 1,
          maxSelections: 1,
          showWhenValueIds: [],
          options: [
            {
              id: "o1",
              label: "Large",
              description: "",
              priceDelta: 500_000_000,
              isDefault: true,
              maxQuantity: 1,
            },
          ],
        },
      ],
    });

    expect(next.price).toBe(MAX_MENU_MONEY_AMOUNT);
    expect(next.optionGroups[0]?.options[0]?.priceDelta).toBe(MAX_MENU_MONEY_AMOUNT);
  });

  it("sanitizes section default prices", () => {
    const next = sanitizeHubMenuSectionMoneyFields({
      defaultPrice: 1_000_000_000,
      items: [],
    });
    expect(next.defaultPrice).toBe(MAX_MENU_MONEY_AMOUNT);
  });
});
