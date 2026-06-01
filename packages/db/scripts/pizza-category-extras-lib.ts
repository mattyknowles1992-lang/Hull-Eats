import type { HubMenuSection, MenuItem } from "@hull-eats/types";
import { HUB_MENU_EXTRAS_LIBRARY_PRESET, menuItemHasPizzaKindMarker } from "@hull-eats/types";

export const CATEGORY_EXTRAS_CONFIG_ITEM_ID = "hull-category-extras-config";

export type CategoryExtrasAssignment = {
  categoryId: string;
  itemIds: string[];
  paidExtraIds: string[];
  includedQtyById: Record<string, number>;
  maxAddMoreById: Record<string, number>;
  priceById: Record<string, number>;
};

export function encodeCategoryExtrasConfig(assignments: CategoryExtrasAssignment[]): string {
  return `__HULL_CATEGORY_EXTRAS:${JSON.stringify({ assignments })}__`;
}

function isPizzaCategory(section: HubMenuSection): boolean {
  return section.presetKey === "pizza";
}

function pizzaItemIds(section: HubMenuSection): string[] {
  return section.items
    .filter((item) => menuItemHasPizzaKindMarker(item) || isPizzaCategory(section))
    .filter((item) => item.id !== CATEGORY_EXTRAS_CONFIG_ITEM_ID)
    .map((item) => item.id);
}

/** Assign all extras-library toppings as paid add-ons for every item in pizza categories. */
export function applyPizzaCategoryExtrasToSections(sections: HubMenuSection[]): HubMenuSection[] {
  const extrasSection = sections.find((section) => section.presetKey === HUB_MENU_EXTRAS_LIBRARY_PRESET);
  if (!extrasSection) {
    return sections;
  }

  const toppings = extrasSection.items.filter((item) => item.id !== CATEGORY_EXTRAS_CONFIG_ITEM_ID && item.isActive);
  if (toppings.length === 0) {
    return sections;
  }

  const pizzaSections = sections.filter(isPizzaCategory);
  if (pizzaSections.length === 0) {
    return sections;
  }

  const assignments: CategoryExtrasAssignment[] = pizzaSections.map((section) => ({
    categoryId: section.id,
    itemIds: pizzaItemIds(section),
    paidExtraIds: toppings.map((topping) => topping.id),
    includedQtyById: {},
    maxAddMoreById: Object.fromEntries(toppings.map((topping) => [topping.id, 8])),
    priceById: Object.fromEntries(toppings.map((topping) => [topping.id, Number(topping.price) || 0])),
  }));

  const encoded = encodeCategoryExtrasConfig(assignments);
  const configItem: MenuItem = {
    id: CATEGORY_EXTRAS_CONFIG_ITEM_ID,
    categoryId: extrasSection.id,
    name: "Category extras data",
    description: encoded,
    price: 0,
    isActive: false,
    trackStock: false,
    stockQuantity: null,
    stockStatus: "in_stock",
    allowBackorder: false,
    maxPerOrder: null,
    requiresIdVerification: false,
    sortOrder: 0,
    components: [],
    optionGroups: [],
  };

  return sections.map((section) => {
    if (section.presetKey !== HUB_MENU_EXTRAS_LIBRARY_PRESET) {
      return section;
    }
    return {
      ...section,
      items: [...section.items.filter((item) => item.id !== CATEGORY_EXTRAS_CONFIG_ITEM_ID), configItem],
    };
  });
}
