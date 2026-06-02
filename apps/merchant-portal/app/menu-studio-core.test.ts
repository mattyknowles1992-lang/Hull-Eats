import { describe, expect, it } from "vitest";

import type { HubMenuSection } from "@hull-eats/types";

import {
  applyCategoryExtrasAssignment,
  buildLocalMenuItem,
  computeMenuPublishIssues,
  detachItemFromCategoryExtras,
  encodeExtrasGroupDescription,
  encodeMealLibraryItemDescription,
  emptyMealDealEditorConfig,
  getMealTemplateFromItem,
  getItemExtrasCategoryId,
  isItemManagedByActiveCategoryExtras,
  normalizeMenuSectionsForPortal,
  readMealDealEditorConfig,
  resolveMealDealItems,
  syncMealDealEditorConfigFromItems,
  updateExtrasLibraryItemPrice,
  type PickableMenuProduct,
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

  it("falls back to per-item extras when category assignment has no toppings selected", () => {
    const extraId = "extra-jalapeno";
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
          { id: extraId, categoryId: "extras", name: "Jalapeno", description: "", price: 0.5, isActive: true, components: [], optionGroups: [] },
        ],
      },
      {
        id: "pizzas",
        name: "Pizzas",
        description: "",
        items: [
          {
            id: "pizza-1",
            categoryId: "pizzas",
            name: "Margherita",
            description: "",
            price: 10,
            isActive: true,
            components: [],
            optionGroups: [
              {
                id: "extras-individual",
                name: "Added extras",
                description: encodeExtrasGroupDescription(),
                selectionMode: "multiple",
                isRequired: false,
                minSelections: 0,
                maxSelections: null,
                showWhenValueIds: [],
                options: [
                  {
                    id: extraId,
                    label: "Jalapeno",
                    description: "",
                    priceDelta: 0.5,
                    isDefault: false,
                    maxQuantity: 3,
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as unknown as HubMenuSection[];

    const toppings = [{ id: extraId, label: "Jalapeno", price: 0.5 }];
    const updated = applyCategoryExtrasAssignment(
      sections,
      {
        categoryId: "pizzas",
        paidExtraIds: [],
        includedQtyById: {},
        maxAddMoreById: {},
        priceById: {},
        itemIds: ["pizza-1"],
      },
      toppings,
    );

    const pizza = updated[1]!.items[0]!;
    expect(getItemExtrasCategoryId(pizza)).toBeNull();
    expect(isItemManagedByActiveCategoryExtras(updated, pizza, "pizzas")).toBe(false);
    expect(pizza.optionGroups[0]?.options[0]?.label).toBe("Jalapeno");
  });

  it("does not lock items that still use per-item-only extras while listed on a category assignment", () => {
    const extraId = "extra-ham";
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
            description: `__HULL_CATEGORY_EXTRAS:${JSON.stringify({
              assignments: [
                {
                  categoryId: "burgers",
                  paidExtraIds: [extraId],
                  includedQtyById: {},
                  maxAddMoreById: { [extraId]: 3 },
                  priceById: { [extraId]: 1 },
                  itemIds: ["burger-1"],
                },
              ],
            })}__`,
            price: 0,
            isActive: false,
            components: [],
            optionGroups: [],
          },
          { id: extraId, categoryId: "extras", name: "Ham", description: "", price: 1, isActive: true, components: [], optionGroups: [] },
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
            optionGroups: [
              {
                id: "extras-individual",
                name: "Added extras",
                description: encodeExtrasGroupDescription(),
                selectionMode: "multiple",
                isRequired: false,
                minSelections: 0,
                maxSelections: null,
                showWhenValueIds: [],
                options: [
                  {
                    id: extraId,
                    label: "Ham",
                    description: "",
                    priceDelta: 0.9,
                    isDefault: false,
                    maxQuantity: 2,
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as unknown as HubMenuSection[];

    const burger = sections[1]!.items[0]!;
    expect(isItemManagedByActiveCategoryExtras(sections, burger, "burgers")).toBe(false);
  });
});

describe("meal deal category pools", () => {
  const products: PickableMenuProduct[] = [
    { id: "coke", name: "Coke", price: 1.5, categoryId: "drinks", categoryName: "Drinks" },
    { id: "red-bull", name: "Red Bull", price: 2.5, categoryId: "drinks", categoryName: "Drinks" },
    { id: "fries", name: "Fries", price: 2, categoryId: "sides", categoryName: "Sides" },
  ];

  it("expands all drinks from a linked category with default extra £", () => {
    const config = {
      ...emptyMealDealEditorConfig(),
      drinkCategoryPools: [{ categoryId: "drinks", defaultPriceDelta: 2.5 }],
    };
    const items = resolveMealDealItems(config, products);
    expect(items.filter((item) => item.slot === "drink")).toHaveLength(2);
    expect(items.find((item) => item.menuItemId === "red-bull")?.priceDelta).toBe(2.5);
  });

  it("persists category pools in meal library description", () => {
    const config = {
      ...emptyMealDealEditorConfig(),
      drinkCategoryPools: [{ categoryId: "drinks", defaultPriceDelta: 1 }],
    };
    const item = buildLocalMenuItem({
      categoryId: "meals",
      name: "Make it a Meal",
      description: encodeMealLibraryItemDescription(config),
      price: 3,
      requiresIdVerification: false,
      components: [],
      optionGroups: [],
    });
    const roundTrip = readMealDealEditorConfig(item);
    expect(roundTrip.drinkCategoryPools).toEqual([{ categoryId: "drinks", defaultPriceDelta: 1 }]);
    const template = getMealTemplateFromItem(item, products);
    expect(template.drinks.map((drink) => drink.menuItemId)).toEqual(["coke", "red-bull"]);
  });

  it("excludes a drink removed from the resolved list", () => {
    const config = {
      ...emptyMealDealEditorConfig(),
      drinkCategoryPools: [{ categoryId: "drinks" }],
    };
    const resolved = resolveMealDealItems(config, products);
    const redBull = resolved.find((item) => item.menuItemId === "red-bull");
    expect(redBull).toBeDefined();
    const next = syncMealDealEditorConfigFromItems(
      config,
      resolved.filter((item) => item.menuItemId !== "red-bull"),
      products,
    );
    const after = resolveMealDealItems(next, products);
    expect(after.some((item) => item.menuItemId === "red-bull")).toBe(false);
    expect(after.some((item) => item.menuItemId === "coke")).toBe(true);
  });
});
