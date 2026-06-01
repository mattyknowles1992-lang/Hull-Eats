import { decodeHubMenuCategoryDescription } from "./hub-menu-presets";
import { HULL_PIZZA_CATEGORY_CHOICES_PREFIX, stripHubPizzaCategoryChoicesMarker } from "./hub-menu-pizza-choices";
import { HULL_PIZZA_SIZE_COLUMNS_PREFIX, stripHubPizzaSizeColumnsMarker } from "./hub-menu-pizza-columns";
import type { MenuItem } from "./catalog";
import { sanitizeMenuMoneyAmount } from "./menu-money";

const PIZZA_KIND_MARKER = /__HULL_PIZZA_KIND:(pizza|garlic_bread|calzone)__/i;
const MEAL_CHOICE_MARKER = /__HULL_MEAL_CHOICE__/;
const MEAL_DISABLED_MARKER = /__HULL_MEAL_DISABLED__/;
const MEAL_TEMPLATE_MARKER = /__HULL_MEAL_TEMPLATE:([a-zA-Z0-9-]+)__/;
const EXTRAS_MARKER = /__HULL_EXTRAS__/;
const CATEGORY_EXTRAS_FROM_CATEGORY_MARKER = /__HULL_EXTRAS_FROM_CATEGORY:/;
const PIZZA_BASE_MARKER = "__HULL_PIZZA_BASE__";
const PIZZA_CRUST_MARKER = "__HULL_PIZZA_CRUST__";
const CATEGORY_EXTRAS_CFG_PREFIX = /^__HULL_CATEGORY_EXTRAS:(.+?)__$/s;
const CATEGORY_EXTRAS_CONFIG_ITEM_ID = "hull-category-extras-config";

type MenuOptionGroup = MenuItem["optionGroups"][number];

export type StorefrontCategoryExtrasAssignment = {
  categoryId: string;
  itemIds: string[];
  paidExtraIds: string[];
  includedQtyById: Record<string, number>;
  maxAddMoreById: Record<string, number>;
  priceById: Record<string, number>;
};

export type StorefrontMenuEnrichmentContext = {
  sectionId: string;
  sectionDescription: string;
  sectionPresetKey: string | null;
  categoryExtrasAssignments: StorefrontCategoryExtrasAssignment[];
  extraToppings: Array<{ id: string; name: string; price: number }>;
};

function isMealChoiceGroup(group: MenuOptionGroup): boolean {
  return MEAL_CHOICE_MARKER.test(group.description ?? "") && !MEAL_DISABLED_MARKER.test(group.description ?? "");
}

function isPizzaSizeGroup(group: MenuOptionGroup): boolean {
  return group.isRequired && /size/i.test(group.name) && group.options.length > 0;
}

function isPizzaBaseGroup(group: MenuOptionGroup): boolean {
  return (group.description ?? "").trim().startsWith(PIZZA_BASE_MARKER);
}

function isPizzaCrustGroup(group: MenuOptionGroup): boolean {
  return (group.description ?? "").trim().startsWith(PIZZA_CRUST_MARKER) || /^Crust/i.test(group.name);
}

export function isPizzaStorefrontItem(item: MenuItem, sectionPresetKey?: string | null): boolean {
  if (PIZZA_KIND_MARKER.test(item.description ?? "")) {
    return true;
  }
  return sectionPresetKey === "pizza";
}

export function mealTemplateIdFromItem(item: MenuItem): string | null {
  const mealGroup = item.optionGroups.find(isMealChoiceGroup);
  const match = mealGroup?.description?.match(MEAL_TEMPLATE_MARKER);
  return match?.[1] ?? null;
}

export function hullMealYesOptionId(templateId: string): string {
  return `hull-meal-yes-${templateId}`;
}

export function hullMealNoOptionId(templateId: string): string {
  return `hull-meal-no-${templateId}`;
}

/** Fix side/drink groups that still point at an old meal-yes option id from a prior publish. */
export function repairMealUpgradeOptionGroups(item: MenuItem): MenuItem {
  const mealGroup = item.optionGroups.find(isMealChoiceGroup);
  if (!mealGroup) {
    return item;
  }

  const templateId = mealTemplateIdFromItem(item) ?? "default";
  const mealYesOption =
    mealGroup.options.find((option) => option.id === hullMealYesOptionId(templateId)) ??
    mealGroup.options.find((option) => option.priceDelta > 0 && !/on its own/i.test(option.label)) ??
  null;

  if (!mealYesOption) {
    return item;
  }

  const mealYesId = mealYesOption.id;

  return {
    ...item,
    optionGroups: item.optionGroups.map((group) => {
      if (group.id === mealGroup.id) {
        return group;
      }
      const needsMeal =
        (/side|fries/i.test(group.name) || /drink|can/i.test(group.name)) && group.showWhenValueIds.length > 0;
      if (!needsMeal) {
        return group;
      }

      const alreadyValid = group.showWhenValueIds.includes(mealYesId);
      if (alreadyValid) {
        return group;
      }

      return {
        ...group,
        showWhenValueIds: [mealYesId],
      };
    }),
  };
}

type PizzaSizeColumn = { key: string; label: string };

type PizzaSizeTableConfig = {
  columns: PizzaSizeColumn[];
  stepByColumnKey: Record<string, string>;
};

function parsePizzaSizeTable(sectionDescription: string): PizzaSizeTableConfig | null {
  const decoded = decodeHubMenuCategoryDescription(sectionDescription);
  const match = decoded.description.match(HULL_PIZZA_SIZE_COLUMNS_PREFIX);
  if (!match?.[1]) {
    return null;
  }

  try {
    const parsed = JSON.parse(match[1]) as { columns?: unknown; sizeSteps?: unknown };
    if (!Array.isArray(parsed.columns) || parsed.columns.length === 0) {
      return null;
    }

    const columns = parsed.columns
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const row = entry as { key?: string; label?: string };
        const label = String(row.label ?? "").trim();
        if (!label) {
          return null;
        }
        return { key: String(row.key ?? label), label } satisfies PizzaSizeColumn;
      })
      .filter(Boolean) as PizzaSizeColumn[];

    const stepByColumnKey: Record<string, string> = {};
    if (parsed.sizeSteps && typeof parsed.sizeSteps === "object") {
      for (const [key, value] of Object.entries(parsed.sizeSteps as Record<string, unknown>)) {
        const trimmed = String(value).trim();
        if (trimmed) {
          stepByColumnKey[key] = trimmed;
        }
      }
    }

    return { columns, stepByColumnKey };
  } catch {
    return null;
  }
}

function buildPizzaSizeGroupFromTable(item: MenuItem, sectionDescription: string): MenuOptionGroup | null {
  const table = parsePizzaSizeTable(sectionDescription);
  if (!table || table.columns.length === 0 || item.price <= 0) {
    return null;
  }

  let runningPrice = item.price;
  const priced = table.columns.map((column, index) => {
    if (index > 0) {
      const step = Number(table.stepByColumnKey[column.key] ?? 0);
      if (Number.isFinite(step) && step > 0) {
        runningPrice = Number((runningPrice + step).toFixed(2));
      }
    }
    return { column, fullPrice: sanitizeMenuMoneyAmount(runningPrice) };
  });

  const basePrice = sanitizeMenuMoneyAmount(Math.min(...priced.map((row) => row.fullPrice)));

  const options = priced.map((row, index) => ({
    id: `hull-size-${item.id}-${row.column.key}`,
    label: row.column.label,
    description: "",
    priceDelta: sanitizeMenuMoneyAmount(Number((row.fullPrice - basePrice).toFixed(2))),
    isDefault: index === 0,
    maxQuantity: 1,
  }));

  return {
    id: `hull-size-group-${item.id}`,
    name: "Size",
    description: "Choose a size",
    selectionMode: "single",
    isRequired: true,
    minSelections: 1,
    maxSelections: 1,
    showWhenValueIds: [],
    options,
  };
}

function buildFallbackPizzaSizeGroup(item: MenuItem): MenuOptionGroup | null {
  if (item.price <= 0) {
    return null;
  }

  return {
    id: `hull-size-group-${item.id}`,
    name: "Size",
    description: "Choose a size",
    selectionMode: "single",
    isRequired: true,
    minSelections: 1,
    maxSelections: 1,
    showWhenValueIds: [],
    options: [
      {
        id: `hull-size-${item.id}-standard`,
        label: "Standard",
        description: "",
        priceDelta: 0,
        isDefault: true,
        maxQuantity: 1,
      },
    ],
  };
}

type PizzaChoiceRow = { id: string; label: string; price: string };

function parsePizzaCategoryChoices(sectionDescription: string): { bases: PizzaChoiceRow[]; crusts: PizzaChoiceRow[] } {
  const decoded = decodeHubMenuCategoryDescription(sectionDescription);
  const match = decoded.description.match(HULL_PIZZA_CATEGORY_CHOICES_PREFIX);
  if (!match?.[1]) {
    return { bases: [], crusts: [] };
  }

  try {
    const parsed = JSON.parse(match[1]) as { bases?: unknown; crusts?: unknown };
    const readRows = (raw: unknown) =>
      Array.isArray(raw)
        ? (raw
            .map((entry) => {
              if (!entry || typeof entry !== "object") {
                return null;
              }
              const row = entry as { id?: string; label?: string; price?: string | number };
              const label = String(row.label ?? "").trim();
              if (!label) {
                return null;
              }
              return {
                id: String(row.id ?? label),
                label,
                price: String(row.price ?? "0"),
              } satisfies PizzaChoiceRow;
            })
            .filter(Boolean) as PizzaChoiceRow[])
        : [];

    return { bases: readRows(parsed.bases), crusts: readRows(parsed.crusts) };
  } catch {
    return { bases: [], crusts: [] };
  }
}

function buildChoiceGroup(name: string, marker: string, rows: PizzaChoiceRow[]): MenuOptionGroup | null {
  const active = rows.filter((row) => row.label.trim());
  if (active.length === 0) {
    return null;
  }

  return {
    id: `hull-${marker}-${name.toLowerCase()}`,
    name,
    description: marker,
    selectionMode: "single",
    isRequired: false,
    minSelections: 0,
    maxSelections: 1,
    showWhenValueIds: [],
    options: active.map((row, index) => ({
      id: row.id,
      label: row.label,
      description: "",
      priceDelta: Number(row.price) || 0,
      isDefault: index === 0,
      maxQuantity: 1,
    })),
  };
}

function applyPizzaCategoryChoices(item: MenuItem, sectionDescription: string): MenuItem {
  const choices = parsePizzaCategoryChoices(sectionDescription);
  let optionGroups = item.optionGroups.filter((group) => !isPizzaBaseGroup(group) && !isPizzaCrustGroup(group));

  const baseGroup = buildChoiceGroup("Base", PIZZA_BASE_MARKER, choices.bases);
  if (baseGroup) {
    optionGroups = [...optionGroups, baseGroup];
  }

  const crustGroup = buildChoiceGroup("Crust", PIZZA_CRUST_MARKER, choices.crusts);
  if (crustGroup) {
    optionGroups = [...optionGroups, crustGroup];
  }

  return { ...item, optionGroups };
}

function readCategoryExtrasAssignments(extrasLibraryDescription: string | null | undefined): StorefrontCategoryExtrasAssignment[] {
  if (!extrasLibraryDescription) {
    return [];
  }

  const match = extrasLibraryDescription.match(CATEGORY_EXTRAS_CFG_PREFIX);
  if (!match?.[1]) {
    return [];
  }

  try {
    const parsed = JSON.parse(match[1]) as { assignments?: unknown };
    if (!Array.isArray(parsed.assignments)) {
      return [];
    }

    return parsed.assignments
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const row = entry as StorefrontCategoryExtrasAssignment;
        if (!row.categoryId || !Array.isArray(row.itemIds)) {
          return null;
        }
        return {
          categoryId: String(row.categoryId),
          itemIds: row.itemIds.map(String),
          paidExtraIds: Array.isArray(row.paidExtraIds) ? row.paidExtraIds.map(String) : [],
          includedQtyById:
            row.includedQtyById && typeof row.includedQtyById === "object"
              ? Object.fromEntries(Object.entries(row.includedQtyById).map(([key, value]) => [key, Number(value)]))
              : {},
          maxAddMoreById:
            row.maxAddMoreById && typeof row.maxAddMoreById === "object"
              ? Object.fromEntries(Object.entries(row.maxAddMoreById).map(([key, value]) => [key, Number(value)]))
              : {},
          priceById:
            row.priceById && typeof row.priceById === "object"
              ? Object.fromEntries(Object.entries(row.priceById).map(([key, value]) => [key, Number(value)]))
              : {},
        } satisfies StorefrontCategoryExtrasAssignment;
      })
      .filter(Boolean) as StorefrontCategoryExtrasAssignment[];
  } catch {
    return [];
  }
}

/** True when the item has extras configured on the item itself (not only via category assignment). */
export function itemHasIndividualExtrasGroup(item: MenuItem): boolean {
  return item.optionGroups.some(
    (group) =>
      EXTRAS_MARKER.test(group.description ?? "") && !CATEGORY_EXTRAS_FROM_CATEGORY_MARKER.test(group.description ?? ""),
  );
}

export function categoryExtrasAssignmentIsActive(assignment: StorefrontCategoryExtrasAssignment): boolean {
  if (assignment.paidExtraIds.length > 0) {
    return true;
  }
  return Object.values(assignment.includedQtyById).some((quantity) => quantity > 0);
}

function buildExtrasGroupFromAssignment(
  assignment: StorefrontCategoryExtrasAssignment,
  toppings: StorefrontMenuEnrichmentContext["extraToppings"],
): MenuOptionGroup | null {
  const activeToppings = toppings.filter(
    (topping) => assignment.paidExtraIds.includes(topping.id) || (assignment.includedQtyById[topping.id] ?? 0) > 0,
  );

  if (activeToppings.length === 0) {
    return null;
  }

  return {
    id: `hull-extras-${assignment.categoryId}`,
    name: "Extras",
    description: `${EXTRAS_MARKER}\n__HULL_EXTRAS_FROM_CATEGORY:${assignment.categoryId}__`,
    selectionMode: "multiple",
    isRequired: false,
    minSelections: 0,
    maxSelections: null,
    showWhenValueIds: [],
    options: activeToppings.map((topping) => ({
      id: topping.id,
      label: topping.name,
      description: "",
      priceDelta: assignment.priceById[topping.id] ?? topping.price,
      isDefault: false,
      maxQuantity: assignment.maxAddMoreById[topping.id] ?? assignment.includedQtyById[topping.id] ?? 1,
    })),
  };
}

function applyCategoryExtras(item: MenuItem, context: StorefrontMenuEnrichmentContext): MenuItem {
  const assignment = context.categoryExtrasAssignments.find((entry) => entry.categoryId === context.sectionId);

  // No category extras program (or nothing selected) — keep per-item hub publish config.
  if (!assignment || !categoryExtrasAssignmentIsActive(assignment)) {
    return item;
  }

  // Category program exists but this row is not in the assignment — use per-item config only.
  if (!assignment.itemIds.includes(item.id)) {
    return item;
  }

  // Per-item extras in Menu Studio override category for this product.
  if (itemHasIndividualExtrasGroup(item)) {
    return item;
  }

  if (item.optionGroups.some((group) => EXTRAS_MARKER.test(group.description ?? ""))) {
    return item;
  }

  const extrasGroup = buildExtrasGroupFromAssignment(assignment, context.extraToppings);
  if (!extrasGroup) {
    return item;
  }

  return {
    ...item,
    optionGroups: [...item.optionGroups, extrasGroup],
  };
}

function ensurePizzaOptions(item: MenuItem, context: StorefrontMenuEnrichmentContext): MenuItem {
  if (!isPizzaStorefrontItem(item, context.sectionPresetKey)) {
    return item;
  }

  let next = applyPizzaCategoryChoices(item, context.sectionDescription);

  if (!next.optionGroups.some(isPizzaSizeGroup)) {
    const fromTable = buildPizzaSizeGroupFromTable(next, context.sectionDescription);
    const sizeGroup = fromTable ?? buildFallbackPizzaSizeGroup(next);
    if (sizeGroup) {
      const others = next.optionGroups.filter((group) => !isPizzaSizeGroup(group));
      next = {
        ...next,
        price: sanitizeMenuMoneyAmount(next.price),
        optionGroups: [...others, sizeGroup],
      };
    }
  }

  return next;
}

export function enrichStorefrontMenuItem(item: MenuItem, context: StorefrontMenuEnrichmentContext): MenuItem {
  let next = repairMealUpgradeOptionGroups(item);
  next = ensurePizzaOptions(next, context);
  next = applyCategoryExtras(next, context);
  return next;
}

export function readCategoryExtrasConfigItemDescription(
  extrasLibraryItems: Array<{ id: string; description: string }>,
): string | null {
  const configItem = extrasLibraryItems.find((entry) => entry.id === CATEGORY_EXTRAS_CONFIG_ITEM_ID);
  return configItem?.description ?? null;
}

export function buildStorefrontEnrichmentContext(input: {
  sectionId: string;
  sectionDescription: string;
  sectionPresetKey: string | null;
  extrasConfigDescription: string | null;
  extraToppings: Array<{ id: string; name: string; price: number }>;
}): StorefrontMenuEnrichmentContext {
  return {
    sectionId: input.sectionId,
    sectionDescription: input.sectionDescription,
    sectionPresetKey: input.sectionPresetKey,
    categoryExtrasAssignments: readCategoryExtrasAssignments(input.extrasConfigDescription),
    extraToppings: input.extraToppings,
  };
}

export function stripHubOnlyCategoryDescription(description: string, presetKey: string | null): string {
  const decoded = decodeHubMenuCategoryDescription(description);
  const stripped = stripHubPizzaCategoryChoicesMarker(stripHubPizzaSizeColumnsMarker(decoded.description));
  return stripped;
}
