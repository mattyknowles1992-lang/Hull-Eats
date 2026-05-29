import { describe, expect, it } from "vitest";

import type { HubMenuSection } from "@hull-eats/types";

import {
  computeMenuPublishIssues,
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
    expect(issues.some((issue) => issue.includes("Mystery box") && issue.includes("£0.00"))).toBe(true);
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
