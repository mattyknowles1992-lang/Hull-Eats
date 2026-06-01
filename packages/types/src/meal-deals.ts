import type { MenuItem } from "./catalog";

export const MEAL_BUNDLE_MAIN_GROUP = "Main (pick one)";
export const MEAL_BUNDLE_SIDE_GROUP = "Side (pick one)";
export const MEAL_BUNDLE_DRINK_GROUP = "Drink (pick one)";

export const MEAL_BUNDLE_ITEM_REF = /^__HULL_MENU_ITEM_REF:([a-zA-Z0-9_-]+)__$/;
export const MEAL_DEAL_STEP_MARKER = /^__HULL_MEAL_DEAL_STEP:([a-zA-Z0-9_-]+)__/;
export const MEAL_DEAL_CONFIG_PREFIX = /^__HULL_MEAL_DEAL_CONFIG:([\s\S]*?)__(?:\r?\n)?/;

export type MealDealStepSource = "pick_products" | "pick_categories" | "all_menu";

export type HubMealDealStep = {
  id: string;
  label: string;
  source: MealDealStepSource;
  productIds: string[];
  categoryIds: string[];
  required: boolean;
};

export type HubMealDealConfig = {
  steps: HubMealDealStep[];
};

export type MealDealBundleSlot = "main" | "side" | "drink";

export type MealDealBundleSelection = {
  mainIds: string[];
  sideIds: string[];
  drinkIds: string[];
};

export function encodeMealBundleOptionDescription(menuItemId: string): string {
  return `__HULL_MENU_ITEM_REF:${menuItemId}__`;
}

export function decodeMealBundleMenuItemId(description: string | null | undefined): string | null {
  const match = (description ?? "").trim().match(MEAL_BUNDLE_ITEM_REF);
  return match?.[1] ?? null;
}

export function parseMealDealStepIdFromGroup(group: { description?: string | null }): string | null {
  const match = (group.description ?? "").trim().match(MEAL_DEAL_STEP_MARKER);
  return match?.[1] ?? null;
}

export function encodeMealDealStepGroupDescription(stepId: string): string {
  return `__HULL_MEAL_DEAL_STEP:${stepId}__`;
}

export function parseMealDealConfigFromDescription(description: string | null | undefined): HubMealDealConfig | null {
  const match = (description ?? "").match(MEAL_DEAL_CONFIG_PREFIX);
  if (!match?.[1]) {
    return null;
  }
  try {
    const parsed = JSON.parse(match[1]) as Partial<HubMealDealConfig>;
    if (!parsed || !Array.isArray(parsed.steps)) {
      return null;
    }
    return {
      steps: parsed.steps
        .filter((step): step is HubMealDealStep => Boolean(step && typeof step === "object"))
        .map((step) => ({
          id: String(step.id ?? ""),
          label: String(step.label ?? "Choice").trim() || "Choice",
          source: (step.source === "pick_categories"
            ? "pick_categories"
            : step.source === "all_menu"
              ? "all_menu"
              : "pick_products") as MealDealStepSource,
          productIds: Array.isArray(step.productIds) ? step.productIds.map(String) : [],
          categoryIds: Array.isArray(step.categoryIds) ? step.categoryIds.map(String) : [],
          required: step.required !== false,
        }))
        .filter((step) => step.id.length > 0),
    };
  } catch {
    return null;
  }
}

export function stripMealDealConfigFromDescription(description: string | null | undefined): string {
  return (description ?? "").replace(MEAL_DEAL_CONFIG_PREFIX, "").trim();
}

export function encodeMealDealItemDescription(config: HubMealDealConfig, customerNote = ""): string {
  const payload = JSON.stringify(config);
  const note = customerNote.trim();
  return note ? `__HULL_MEAL_DEAL_CONFIG:${payload}__\n${note}` : `__HULL_MEAL_DEAL_CONFIG:${payload}__`;
}

export function isLegacyMealBundleGroupName(name: string): boolean {
  return name === MEAL_BUNDLE_MAIN_GROUP || name === MEAL_BUNDLE_SIDE_GROUP || name === MEAL_BUNDLE_DRINK_GROUP;
}

export function isMealDealStepGroup(group: MenuItem["optionGroups"][number]): boolean {
  if (MEAL_DEAL_STEP_MARKER.test(group.description ?? "")) {
    return true;
  }
  return isLegacyMealBundleGroupName(group.name);
}

export function isMealDealCustomerItem(item: MenuItem): boolean {
  return item.optionGroups.some((group) => isMealDealStepGroup(group));
}

export type PickableMenuProductRef = {
  id: string;
  name: string;
  categoryId: string;
};

export function resolveMealDealStepProductIds(
  step: HubMealDealStep,
  menuProducts: PickableMenuProductRef[],
): string[] {
  if (step.source === "pick_products") {
    return step.productIds;
  }
  if (step.source === "pick_categories") {
    const categorySet = new Set(step.categoryIds);
    return menuProducts.filter((product) => categorySet.has(product.categoryId)).map((product) => product.id);
  }
  return menuProducts.map((product) => product.id);
}

export function buildMealDealStepOptionGroups(
  config: HubMealDealConfig,
  menuProducts: PickableMenuProductRef[],
  createGroupId: () => string,
): MenuItem["optionGroups"] {
  const productsById = new Map(menuProducts.map((product) => [product.id, product]));

  return config.steps
    .map((step) => {
      const productIds = resolveMealDealStepProductIds(step, menuProducts);
      const options = productIds
        .map((id) => productsById.get(id))
        .filter(Boolean)
        .map((product, index) => ({
          id: product!.id,
          label: product!.name,
          description: encodeMealBundleOptionDescription(product!.id),
          priceDelta: 0,
          isDefault: index === 0,
          maxQuantity: 1,
        }));

      if (options.length === 0) {
        return null;
      }

      return {
        id: createGroupId(),
        name: step.label.trim() || "Choice",
        description: encodeMealDealStepGroupDescription(step.id),
        selectionMode: "single" as const,
        isRequired: step.required,
        minSelections: step.required ? 1 : 0,
        maxSelections: 1,
        showWhenValueIds: [],
        options,
      };
    })
    .filter(Boolean) as MenuItem["optionGroups"];
}

export function applyMealDealConfigToMenuItem(
  item: MenuItem,
  config: HubMealDealConfig,
  menuProducts: PickableMenuProductRef[],
  createGroupId: () => string,
): MenuItem {
  const customerNote = stripMealDealConfigFromDescription(item.description);
  const bundleGroups = buildMealDealStepOptionGroups(config, menuProducts, createGroupId);
  const withoutBundle = item.optionGroups.filter((group) => !isMealDealStepGroup(group));
  return {
    ...item,
    description: encodeMealDealItemDescription(config, customerNote),
    optionGroups: [...withoutBundle, ...bundleGroups],
  };
}

export function sortMealDealOptionGroups(groups: MenuItem["optionGroups"]): MenuItem["optionGroups"] {
  const rank = (group: MenuItem["optionGroups"][number]) => {
    if (group.name === MEAL_BUNDLE_MAIN_GROUP) {
      return 0;
    }
    if (group.name === MEAL_BUNDLE_SIDE_GROUP) {
      return 1;
    }
    if (group.name === MEAL_BUNDLE_DRINK_GROUP) {
      return 2;
    }
    const stepMatch = (group.description ?? "").match(MEAL_DEAL_STEP_MARKER);
    if (stepMatch?.[1]) {
      return 10;
    }
    return 20;
  };
  return [...groups].sort((left, right) => rank(left) - rank(right));
}
