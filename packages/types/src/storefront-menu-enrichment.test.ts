import { describe, expect, it } from "vitest";

import type { MenuItem } from "./catalog";
import {
  buildStorefrontEnrichmentContext,
  categoryExtrasAssignmentIsActive,
  enrichStorefrontMenuItem,
  itemHasIndividualExtrasGroup,
} from "./storefront-menu-enrichment";

const baseItem = (overrides: Partial<MenuItem>): MenuItem => ({
  id: "item-1",
  categoryId: "cat-pizza",
  name: "Margherita",
  description: "__HULL_PIZZA_KIND:pizza__",
  price: 10,
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

describe("category extras enrichment", () => {
  it("detects individual extras groups", () => {
    const item = baseItem({
      optionGroups: [
        {
          id: "extras-1",
          name: "Added extras",
          description: "__HULL_EXTRAS__",
          selectionMode: "multiple",
          isRequired: false,
          minSelections: 0,
          maxSelections: null,
          showWhenValueIds: [],
          options: [
            {
              id: "pepperoni",
              label: "Pepperoni",
              description: "",
              priceDelta: 1,
              isDefault: false,
              maxQuantity: 3,
            },
          ],
        },
      ],
    });

    expect(itemHasIndividualExtrasGroup(item)).toBe(true);
  });

  it("uses per-item extras when category assignment has no toppings selected", () => {
    const item = baseItem({
      optionGroups: [
        {
          id: "extras-1",
          name: "Added extras",
          description: "__HULL_EXTRAS__",
          selectionMode: "multiple",
          isRequired: false,
          minSelections: 0,
          maxSelections: null,
          showWhenValueIds: [],
          options: [
            {
              id: "jalapenos",
              label: "Jalapenos",
              description: "",
              priceDelta: 0.5,
              isDefault: false,
              maxQuantity: 2,
            },
          ],
        },
      ],
    });

    const context = buildStorefrontEnrichmentContext({
      sectionId: "cat-pizza",
      sectionDescription: "",
      sectionPresetKey: "pizza",
      extrasConfigDescription: `__HULL_CATEGORY_EXTRAS:${JSON.stringify({
        assignments: [
          {
            categoryId: "cat-pizza",
            itemIds: ["item-1"],
            paidExtraIds: [],
            includedQtyById: {},
            maxAddMoreById: {},
            priceById: {},
          },
        ],
      })}__`,
      extraToppings: [{ id: "pepperoni", name: "Pepperoni", price: 1 }],
    });

    expect(categoryExtrasAssignmentIsActive(context.categoryExtrasAssignments[0]!)).toBe(false);

    const enriched = enrichStorefrontMenuItem(item, context);
    const extras = enriched.optionGroups.find((group) => group.description?.includes("__HULL_EXTRAS__"));
    expect(extras?.options[0]?.label).toBe("Jalapenos");
    expect(enriched.optionGroups.some((group) => group.description?.includes("__HULL_EXTRAS_FROM_CATEGORY:"))).toBe(
      false,
    );
  });

  it("uses per-item extras when item is not in category assignment", () => {
    const item = baseItem({
      optionGroups: [
        {
          id: "extras-1",
          name: "Added extras",
          description: "__HULL_EXTRAS__",
          selectionMode: "multiple",
          isRequired: false,
          minSelections: 0,
          maxSelections: null,
          showWhenValueIds: [],
          options: [
            {
              id: "ham",
              label: "Ham",
              description: "",
              priceDelta: 0.9,
              isDefault: false,
              maxQuantity: 2,
            },
          ],
        },
      ],
    });

    const context = buildStorefrontEnrichmentContext({
      sectionId: "cat-pizza",
      sectionDescription: "",
      sectionPresetKey: "pizza",
      extrasConfigDescription: `__HULL_CATEGORY_EXTRAS:${JSON.stringify({
        assignments: [
          {
            categoryId: "cat-pizza",
            itemIds: ["other-item"],
            paidExtraIds: ["pepperoni"],
            includedQtyById: {},
            maxAddMoreById: { pepperoni: 3 },
            priceById: { pepperoni: 1 },
          },
        ],
      })}__`,
      extraToppings: [{ id: "pepperoni", name: "Pepperoni", price: 1 }],
    });

    const enriched = enrichStorefrontMenuItem(item, context);
    expect(enriched.optionGroups[0]?.options[0]?.label).toBe("Ham");
  });

  it("applies category extras when configured and item is assigned", () => {
    const item = baseItem({ optionGroups: [] });

    const context = buildStorefrontEnrichmentContext({
      sectionId: "cat-pizza",
      sectionDescription: "",
      sectionPresetKey: "pizza",
      extrasConfigDescription: `__HULL_CATEGORY_EXTRAS:${JSON.stringify({
        assignments: [
          {
            categoryId: "cat-pizza",
            itemIds: ["item-1"],
            paidExtraIds: ["pepperoni"],
            includedQtyById: {},
            maxAddMoreById: { pepperoni: 3 },
            priceById: { pepperoni: 1 },
          },
        ],
      })}__`,
      extraToppings: [{ id: "pepperoni", name: "Pepperoni", price: 1 }],
    });

    const enriched = enrichStorefrontMenuItem(item, context);
    const extras = enriched.optionGroups.find((group) => group.name === "Extras");
    expect(extras?.options.some((option) => option.label === "Pepperoni")).toBe(true);
  });
});
