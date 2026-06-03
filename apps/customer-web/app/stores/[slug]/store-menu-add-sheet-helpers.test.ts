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

  it("hides legacy salad components when hub salad included group is configured", () => {
    const item = baseItem({
      components: [{ id: "c1", label: "Lettuce", quantity: 1, removable: true }],
      optionGroups: [
        {
          id: "salad",
          name: "Salad",
          description: "__HULL_SALAD_INCLUDED__",
          selectionMode: "multiple",
          isRequired: false,
          minSelections: 0,
          maxSelections: null,
          showWhenValueIds: [],
          options: [{ id: "lettuce", label: "Lettuce", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 }],
        },
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

  it("keeps salad and sauce groups on burger-style items and dedupes extras", () => {
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
        id: "salad",
        name: "Salad",
        description: "__HULL_SALAD_INCLUDED__",
        selectionMode: "multiple" as const,
        isRequired: false,
        minSelections: 0,
        maxSelections: null,
        showWhenValueIds: [],
        options: [{ id: "onion", label: "Onion", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 }],
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
        options: [{ id: "mayo", label: "Mayo", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 }],
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
        options: [
          { id: "onion-extra", label: "Onion", description: "", priceDelta: 0.5, isDefault: false, maxQuantity: 1 },
          { id: "cheese", label: "Cheese", description: "", priceDelta: 0.8, isDefault: false, maxQuantity: 1 },
        ],
      },
    ];
    const item = baseItem({ optionGroups: groups });
    const filtered = filterAddSheetOptionGroups(groups, item);
    expect(filtered.map((group) => group.id)).toEqual(["meal", "salad", "sauce", "extras"]);
    expect(filtered.find((group) => group.id === "extras")?.options.map((option) => option.id)).toEqual(["cheese"]);
    expect(sortAddSheetOptionGroups(filtered).map((group) => group.id)).toEqual(["meal", "salad", "sauce", "extras"]);
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
