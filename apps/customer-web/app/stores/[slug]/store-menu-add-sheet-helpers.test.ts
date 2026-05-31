import { describe, expect, it } from "vitest";

import type { MenuItem } from "@hull-eats/types";

import {
  getAddSheetGroupTitle,
  showsAddSheetSaladSection,
  sortAddSheetOptionGroups,
  usesBurgerAddSheet,
  usesItemAddSheet,
} from "./store-menu-add-sheet-helpers";

const baseItem = (overrides: Partial<MenuItem>): MenuItem => ({
  id: "item-1",
  categoryId: "cat-1",
  name: "Chicken burger",
  description: "",
  price: 4.5,
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
  ...overrides,
});

describe("store-menu-add-sheet-helpers", () => {
  it("uses burger add sheet when removable salad parts are present", () => {
    const item = baseItem({
      components: [{ id: "c1", label: "Lettuce", quantity: 1, removable: true }],
    });
    expect(usesBurgerAddSheet(item)).toBe(true);
    expect(usesItemAddSheet(item)).toBe(true);
    expect(showsAddSheetSaladSection(item)).toBe(true);
  });

  it("sorts burger groups as meal, sauce, extras", () => {
    const groups = sortAddSheetOptionGroups([
      {
        id: "extras",
        name: "Added extras",
        description: "__HULL_EXTRAS__",
        selectionMode: "multiple",
        isRequired: false,
        minSelections: 0,
        maxSelections: null,
        showWhenValueIds: [],
        options: [],
      },
      {
        id: "sauce",
        name: "Sauces",
        description: "__HULL_SAUCES_INCLUDED__",
        selectionMode: "single",
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        showWhenValueIds: [],
        options: [],
      },
      {
        id: "meal",
        name: "Make it a meal",
        description: "__HULL_MEAL_CHOICE__",
        selectionMode: "single",
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        showWhenValueIds: [],
        options: [],
      },
    ]);

    expect(groups.map((group) => group.id)).toEqual(["meal", "sauce", "extras"]);
  });

  it("labels customer-facing section titles", () => {
    expect(
      getAddSheetGroupTitle({
        id: "s1",
        name: "Sauces",
        description: "__HULL_SAUCES_INCLUDED__",
        selectionMode: "single",
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        showWhenValueIds: [],
        options: [],
      }),
    ).toBe("Add your sauce");

    expect(
      getAddSheetGroupTitle({
        id: "e1",
        name: "Added extras",
        description: "__HULL_EXTRAS__",
        selectionMode: "multiple",
        isRequired: false,
        minSelections: 0,
        maxSelections: null,
        showWhenValueIds: [],
        options: [],
      }),
    ).toBe("Extras");
  });
});
