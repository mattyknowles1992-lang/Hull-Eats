import { describe, expect, it } from "vitest";

import type { MenuItem } from "./catalog";
import { getMenuItemCustomerMinPrice, getMenuItemSizePriceLines, isMenuItemPriceListable, menuItemUsesSizePricing } from "./menu-list-pricing";

const baseItem = (patch: Partial<MenuItem> = {}): MenuItem =>
  ({
    id: "item-1",
    categoryId: "cat-1",
    name: "Test item",
    description: "",
    price: 5,
    isActive: true,
    components: [],
    optionGroups: [],
    ...patch,
  }) as MenuItem;

describe("menu-list-pricing", () => {
  it("detects size-based pricing", () => {
    const item = baseItem({
      price: 8,
      optionGroups: [
        {
          id: "size",
          name: "Size",
          description: "",
          selectionMode: "single",
          isRequired: true,
          minSelections: 1,
          maxSelections: 1,
          showWhenValueIds: [],
          options: [
            { id: "s1", label: "9\"", description: "", priceDelta: 0, isDefault: true, maxQuantity: 1 },
            { id: "s2", label: "12\"", description: "", priceDelta: 2, isDefault: false, maxQuantity: 1 },
          ],
        },
      ],
    });

    expect(menuItemUsesSizePricing(item)).toBe(true);
    expect(getMenuItemCustomerMinPrice(item)).toBe(8);
    expect(isMenuItemPriceListable(item)).toBe(true);
  });

  it("blocks live items listed at £0", () => {
    expect(isMenuItemPriceListable(baseItem({ price: 0 }))).toBe(false);
    expect(isMenuItemPriceListable(baseItem({ price: 0.01 }))).toBe(true);
  });

  it("lists each size price for menu display", () => {
    const item = baseItem({
      price: 5.5,
      optionGroups: [
        {
          id: "size",
          name: "Size",
          description: "",
          selectionMode: "single",
          isRequired: true,
          minSelections: 1,
          maxSelections: 1,
          showWhenValueIds: [],
          options: [
            { id: "s1", label: '7"', description: "", priceDelta: 0, isDefault: true, maxQuantity: 1 },
            { id: "s2", label: '10"', description: "", priceDelta: 1.5, isDefault: false, maxQuantity: 1 },
            { id: "s3", label: '12"', description: "", priceDelta: 3.5, isDefault: false, maxQuantity: 1 },
          ],
        },
      ],
    });

    expect(getMenuItemSizePriceLines(item)).toEqual([
      { label: '7"', price: 5.5 },
      { label: '10"', price: 7 },
      { label: '12"', price: 9 },
    ]);
  });

  it("blocks size-priced items when every size is £0", () => {
    const item = baseItem({
      price: 0,
      optionGroups: [
        {
          id: "size",
          name: "Size",
          description: "",
          selectionMode: "single",
          isRequired: true,
          minSelections: 1,
          maxSelections: 1,
          showWhenValueIds: [],
          options: [{ id: "s1", label: "Regular", description: "", priceDelta: 0, isDefault: true, maxQuantity: 1 }],
        },
      ],
    });

    expect(getMenuItemCustomerMinPrice(item)).toBe(0);
    expect(isMenuItemPriceListable(item)).toBe(false);
  });
});
