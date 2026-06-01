import { describe, expect, it } from "vitest";

import type { HubMenuSection } from "@hull-eats/types";

import {
  applyCategoryExtrasAssignment,
  computeMenuPublishIssues,
  detachItemFromCategoryExtras,
  getItemExtrasCategoryId,
  normalizeMenuSectionsForPortal,
  updateExtrasLibraryItemPrice,
} from "./menu-studio-core";

describe("normalizeMenuSectionsForPortal", () => {
  it("ensures components and optionGroups are arrays", () => {
    const sections = [
      {
        id: "cat-1",
        name: "Mains",
        description: "",
        items: [
          {
            id: "item-1",
            categoryId: "cat-1",
            name: "Burger",
            description: "",
            price: 5,
            isActive: true,
            components: undefined,
            optionGroups: undefined,
          },
        ],
      },
    ] as unknown as HubMenuSection[];

    const normalized = normalizeMenuSectionsForPortal(sections);
    expect(normalized[0]?.items[0]?.components).toEqual([]);
    expect(normalized[0]?.items[0]?.optionGroups).toEqual([]);
  });
});

describe("computeMenuPublishIssues", () => {
  it("blocks live customer items listed at £0", () => {
    const sections = [
      {
        id: "cat-1",
        name: "Mains",
        description: "",
        items: [
          {
            id: "item-1",
            categoryId: "cat-1",
            name: "Mystery box",
            description: "",
            price: 0,
            isActive: true,
            components: [],
            optionGroups: [],
          },
        ],
      },
    ] as unknown as HubMenuSection[];

    const issues = computeMenuPublishIssues(sections);
    expect(issues.some((issue) => issue.message.includes("Mystery box") && issue.message.includes("£0.00"))).toBe(true);
    expect(issues[0]?.field).toBe("item_price");
    expect(issues[0]?.itemId).toBe("item-1");
  });
});

describe("updateExtrasLibraryItemPrice", () => {
  it("syncs library extra price onto linked menu items", () => {
    const extraId = "extra-pep";
    const sections = [
      {
        id: "extras",
        name: "Extra toppings",
        description: "",
        presetKey: "extras-library",
        items: [{ id: extraId, categoryId: "extras", name: "Pepperoni", description: "", price: 0, isActive: true, components: [], optionGroups: [] }],
      },
      {
        id: "cat-1",
        name: "Pizzas",
        description: "",
        items: [
          {
            id: "item-1",
            categoryId: "cat-1",
            name: "Margherita",
            description: "",
            price: 8,
            isActive: true,
            components: [],
            optionGroups: [
              {
                id: "extras-group",
                name: "Extra toppings",
                description: "__HULL_EXTRAS__",
                selectionMode: "multiple",
                isRequired: false,
                minSelections: 0,
                maxSelections: null,
                showWhenValueIds: [],
                options: [{ id: extraId, label: "Pepperoni", description: "", priceDelta: 0, isDefault: false, maxQuantity: 8 }],
              },
            ],
          },
        ],
      },
    ] as unknown as HubMenuSection[];

    const next = updateExtrasLibraryItemPrice(sections, "extras", extraId, 2);
    expect(next[0]?.items[0]?.price).toBe(2);
    expect(next[1]?.items[0]?.optionGroups[0]?.options[0]?.priceDelta).toBe(2);
  });
});

describe("applyCategoryExtrasAssignment", () => {
  it("applies category extras to selected items and marks them as category-managed", () => {
    const extraId = "extra-cheese";
    const sections = [
      {
        id: "extras",
        name: "Extra toppings",
        description: "",
        presetKey: "extras-library",
        items: [
          {
            id: "hull-category-extras-config",
            categoryId: "extras",
            name: "Category extras data",
            description: "__HULL_CATEGORY_EXTRAS:{\"assignments\":[]}__",
            price: 0,
            isActive: false,
            components: [],
            optionGroups: [],
          },
          { id: extraId, categoryId: "extras", name: "Cheese", description: "", price: 1, isActive: true, components: [], optionGroups: [] },
        ],
      },
      {
        id: "burgers",
        name: "Burgers",
        description: "",
        items: [
          {
            id: "burger-1",
            categoryId: "burgers",
            name: "Classic",
            description: "",
            price: 7,
            isActive: true,
            components: [],
            optionGroups: [],
          },
          {
            id: "burger-2",
            categoryId: "burgers",
            name: "Deluxe",
            description: "",
            price: 9,
            isActive: true,
            components: [],
            optionGroups: [],
          },
        ],
      },
    ] as unknown as HubMenuSection[];

    const toppings = [{ id: extraId, label: "Cheese", price: 1 }];
    const updated = applyCategoryExtrasAssignment(
      sections,
      {
        categoryId: "burgers",
        paidExtraIds: [extraId],
        includedQtyById: {},
        maxAddMoreById: { [extraId]: 3 },
        priceById: { [extraId]: 1 },
        itemIds: ["burger-1"],
      },
      toppings,
    );

    expect(getItemExtrasCategoryId(updated[1]!.items[0]!)).toBe("burgers");
    expect(getItemExtrasCategoryId(updated[1]!.items[1]!)).toBeNull();

    const detached = detachItemFromCategoryExtras(updated, "burger-1");
    expect(getItemExtrasCategoryId(detached[1]!.items[0]!)).toBeNull();
    expect(detached[1]!.items[0]!.optionGroups.some((group) => group.description?.includes("__HULL_EXTRAS__"))).toBe(true);
  });
});
