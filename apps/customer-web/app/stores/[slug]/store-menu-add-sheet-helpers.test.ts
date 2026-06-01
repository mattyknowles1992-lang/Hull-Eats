import { describe, expect, it } from "vitest";

import type { MenuItem } from "@hull-eats/types";

import {
  filterAddSheetOptionGroups,
  getAddSheetGroupTitle,
  isMealChoiceGroup,
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

  it("recognises side seasonings and titles the group for customers", () => {
    const item = baseItem({
      optionGroups: [
        {
          id: "seasoning",
          name: "Seasoning",
          description: "__HULL_SIDE_SEASONINGS__",
          selectionMode: "multiple",
          isRequired: false,
          minSelections: 0,
          maxSelections: null,
          showWhenValueIds: [],
          options: [{ id: "salt", label: "Salt", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 }],
        },
      ],
    });
    expect(usesBurgerAddSheet(item)).toBe(true);
    expect(getAddSheetGroupTitle(item.optionGroups[0]!)).toBe("Seasoning");
  });

  it("uses add sheet for any item with option groups", () => {
    const item = baseItem({
      optionGroups: [
        {
          id: "custom",
          name: "Spice level",
          description: "",
          selectionMode: "single",
          isRequired: true,
          minSelections: 1,
          maxSelections: 1,
          showWhenValueIds: [],
          options: [{ id: "mild", label: "Mild", description: "", priceDelta: 0, isDefault: true, maxQuantity: 1 }],
        },
      ],
    });
    expect(usesItemAddSheet(item)).toBe(true);
  });

  it("hides salad components when hub extras are configured", () => {
    const item = baseItem({
      components: [{ id: "c1", label: "Lettuce", quantity: 1, removable: true }],
      optionGroups: [
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
      ],
    });
    expect(showsAddSheetSaladSection(item)).toBe(false);
  });

  it("filters sauce groups on burger-style items with hub extras", () => {
    const groups = [
      {
        id: "meal",
        name: "Make it a meal",
        description: "__HULL_MEAL_CHOICE__",
        selectionMode: "single" as const,
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        showWhenValueIds: [],
        options: [],
      },
      {
        id: "sauce",
        name: "Sauces",
        description: "__HULL_SAUCES_INCLUDED__",
        selectionMode: "single" as const,
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        showWhenValueIds: [],
        options: [],
      },
      {
        id: "extras",
        name: "Added extras",
        description: "__HULL_EXTRAS__",
        selectionMode: "multiple" as const,
        isRequired: false,
        minSelections: 0,
        maxSelections: null,
        showWhenValueIds: [],
        options: [],
      },
    ];
    const item = baseItem({ optionGroups: groups });
    expect(filterAddSheetOptionGroups(groups, item).map((group) => group.id)).toEqual(["meal", "extras"]);
    expect(isMealChoiceGroup(groups[0]!)).toBe(true);
  });

  it("labels customer-facing section titles", () => {
    expect(
      getAddSheetGroupTitle({
        id: "m1",
        name: "Make it a meal",
        description: "__HULL_MEAL_CHOICE__",
        selectionMode: "single",
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        showWhenValueIds: [],
        options: [],
      }),
    ).toBe("How would you like it?");

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
