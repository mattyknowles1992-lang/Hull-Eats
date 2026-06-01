import { describe, expect, it } from "vitest";

import {
  applyStandardTestPizzaSizesToMenuItem,
  buildStandardTestPizzaSizeTable,
  encodePizzaSizeTableMarker,
  STANDARD_TEST_PIZZA_SIZE_LABELS,
  STANDARD_TEST_PIZZA_SIZE_PRICE,
} from "./hub-menu-pizza-size-table";

describe("hub-menu-pizza-size-table", () => {
  it("builds four standard test sizes at one price", () => {
    const table = buildStandardTestPizzaSizeTable();
    expect(table.columns.map((column) => column.label)).toEqual([...STANDARD_TEST_PIZZA_SIZE_LABELS]);
    expect(encodePizzaSizeTableMarker(table)).toContain("__HULL_PIZZA_SIZE_COLUMNS:");

    const item = applyStandardTestPizzaSizesToMenuItem({
      id: "pizza-1",
      categoryId: "cat-1",
      name: "Margherita",
      description: "__HULL_PIZZA_KIND:pizza__",
      price: 0,
      isActive: true,
      trackStock: false,
      stockQuantity: null,
      stockStatus: "in_stock",
      allowBackorder: false,
      maxPerOrder: null,
      requiresIdVerification: false,
      sortOrder: 0,
      components: [],
      optionGroups: [],
    });

    expect(item.price).toBe(STANDARD_TEST_PIZZA_SIZE_PRICE);
    const sizeGroup = item.optionGroups.find((group) => /size/i.test(group.name));
    expect(sizeGroup?.options.map((option) => option.label)).toEqual([...STANDARD_TEST_PIZZA_SIZE_LABELS]);
    expect(sizeGroup?.options.every((option) => option.priceDelta === 0)).toBe(true);
  });
});
