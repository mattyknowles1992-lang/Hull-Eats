import type { MenuItem } from "@hull-eats/types";
import {
  decodeMealBundleMenuItemId,
  isMealDealCustomerItem,
  isMealDealStepGroup,
  sortMealDealOptionGroups,
} from "@hull-eats/types";

import type { BasketCustomisationSelection } from "./basket";
import { getBasketLineDetails, getDefaultCustomisationSelection } from "./basket";

export {
  decodeMealBundleMenuItemId,
  isMealDealCustomerItem,
  isMealDealStepGroup,
  sortMealDealOptionGroups,
};

export type MealDealPick = {
  groupId: string;
  groupName: string;
  menuItemId: string;
  menuItemName: string;
  selection: BasketCustomisationSelection;
  nestedCustomisationTotal: number;
};

export function buildMenuItemLookup(categories: Array<{ items: MenuItem[] }>): Map<string, MenuItem> {
  const map = new Map<string, MenuItem>();
  for (const category of categories) {
    for (const item of category.items) {
      map.set(item.id, item);
    }
  }
  return map;
}

export function resolveMealDealProductForOption(
  option: MenuItem["optionGroups"][number]["options"][number],
  menuLookup: Map<string, MenuItem>,
): MenuItem | null {
  const menuItemId = decodeMealBundleMenuItemId(option.description) ?? option.id;
  return menuLookup.get(menuItemId) ?? null;
}

export function mealDealGroupsForItem(item: MenuItem): MenuItem["optionGroups"] {
  return sortMealDealOptionGroups(item.optionGroups.filter((group) => isMealDealStepGroup(group)));
}

export function buildMealDealDealSelection(
  dealItem: MenuItem,
  picks: MealDealPick[],
): BasketCustomisationSelection {
  const selectedOptionQuantities: Record<string, number> = {};
  for (const pick of picks) {
    const group = dealItem.optionGroups.find((entry) => entry.id === pick.groupId);
    const option =
      group?.options.find((entry) => decodeMealBundleMenuItemId(entry.description) === pick.menuItemId) ??
      group?.options.find((entry) => entry.id === pick.menuItemId);
    if (option) {
      selectedOptionQuantities[option.id] = 1;
    }
  }
  return {
    selectedOptionQuantities,
    removedComponentIds: [],
  };
}

export function summariseMealDealPicksForBasket(picks: MealDealPick[]) {
  const selectedOptions: Array<{
    groupId: string;
    groupName: string;
    valueId: string;
    valueName: string;
    quantity: number;
    priceDelta: number;
  }> = [];

  for (const pick of picks) {
    selectedOptions.push({
      groupId: pick.groupId,
      groupName: pick.groupName,
      valueId: pick.menuItemId,
      valueName: pick.menuItemName,
      quantity: 1,
      priceDelta: 0,
    });
    const nested = getBasketLineDetails(
      {
        id: pick.menuItemId,
        categoryId: "",
        name: pick.menuItemName,
        description: "",
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
      },
      pick.selection,
    );
    for (const option of nested.selectedOptions) {
      selectedOptions.push({
        groupId: `${pick.groupId}-nested`,
        groupName: pick.menuItemName,
        valueId: option.valueId,
        valueName: option.valueName,
        quantity: option.quantity,
        priceDelta: option.priceDelta,
      });
    }
  }

  const customisationTotal = Number(
    picks.reduce((sum, pick) => sum + pick.nestedCustomisationTotal, 0).toFixed(2),
  );

  return { selectedOptions, customisationTotal };
}

export function defaultMealDealPickForGroup(
  group: MenuItem["optionGroups"][number],
  menuLookup: Map<string, MenuItem>,
): MealDealPick | null {
  const first = group.options[0];
  if (!first) {
    return null;
  }
  const product = resolveMealDealProductForOption(first, menuLookup);
  if (!product) {
    return null;
  }
  const selection = getDefaultCustomisationSelection(product);
  const nested = getBasketLineDetails(product, selection);
  return {
    groupId: group.id,
    groupName: group.name,
    menuItemId: product.id,
    menuItemName: product.name,
    selection,
    nestedCustomisationTotal: nested.customisationTotal,
  };
}
