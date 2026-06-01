import { decodeHubMenuCategoryDescription, encodeHubMenuCategoryDescription } from "./hub-menu-presets";
import { stripHubPizzaSizeColumnsMarker } from "./hub-menu-pizza-columns";
import type { MenuItem } from "./catalog";
import { sanitizeMenuMoneyAmount } from "./menu-money";

/** Standard test sizes for pizza hubs (go-live testing). */
export const STANDARD_TEST_PIZZA_SIZE_LABELS = ['7"', '10"', '12"', '16"'] as const;

export const STANDARD_TEST_PIZZA_SIZE_PRICE = 10;

export type PizzaSizeColumnDef = {
  key: string;
  label: string;
  labelEditable?: boolean;
};

export type PizzaSizeTableConfig = {
  columns: PizzaSizeColumnDef[];
  stepByColumnKey: Record<string, string>;
};

export function buildStandardTestPizzaSizeTable(): PizzaSizeTableConfig {
  return {
    columns: STANDARD_TEST_PIZZA_SIZE_LABELS.map((label, index) => ({
      key: `hull-pizza-test-${index}`,
      label,
      labelEditable: false,
    })),
    stepByColumnKey: {},
  };
}

export function encodePizzaSizeTableMarker(config: PizzaSizeTableConfig): string {
  return `__HULL_PIZZA_SIZE_COLUMNS:${JSON.stringify({
    columns: config.columns.map((column) => ({
      key: column.key,
      label: column.label,
      labelEditable: Boolean(column.labelEditable),
    })),
    sizeSteps: config.stepByColumnKey,
  })}__`;
}

/** Merge size-column marker into a hub draft category (presetKey lives on the section object). */
export function applyPizzaSizeTableToHubMenuSection<T extends { description?: string | null; presetKey?: string | null }>(
  section: T,
  config: PizzaSizeTableConfig,
): T {
  const decoded = decodeHubMenuCategoryDescription(section.description ?? "");
  const userNote = stripHubPizzaSizeColumnsMarker(decoded.description);
  const marker = encodePizzaSizeTableMarker(config);
  const description = userNote ? `${marker}\n${userNote}` : marker;
  return { ...section, description };
}

/** Merge size-column marker into a persisted menu category description (preset encoded in string). */
export function applyPizzaSizeTableToEncodedCategoryDescription(
  encodedDescription: string,
  config: PizzaSizeTableConfig,
): string {
  const decoded = decodeHubMenuCategoryDescription(encodedDescription);
  const userNote = stripHubPizzaSizeColumnsMarker(decoded.description);
  const marker = encodePizzaSizeTableMarker(config);
  const inner = userNote ? `${marker}\n${userNote}` : marker;
  return encodeHubMenuCategoryDescription(decoded.presetKey, inner);
}

function isPizzaSizeOptionGroup(group: MenuItem["optionGroups"][number]): boolean {
  return group.isRequired && /size/i.test(group.name);
}

/** Required size group with one row per label, each priced at `priceEach` (equal deltas). */
export function buildPizzaSizeOptionGroupForItem(
  itemId: string,
  sizeLabels: readonly string[],
  priceEach: number,
): MenuItem["optionGroups"][number] {
  const basePrice = sanitizeMenuMoneyAmount(priceEach);
  return {
    id: `hull-size-group-${itemId}`,
    name: "Size",
    description: "Choose a pizza size",
    selectionMode: "single",
    isRequired: true,
    minSelections: 1,
    maxSelections: 1,
    showWhenValueIds: [],
    options: sizeLabels.map((label, index) => ({
      id: `hull-size-${itemId}-test-${index}`,
      label,
      description: "",
      priceDelta: 0,
      isDefault: index === 0,
      maxQuantity: 1,
    })),
  };
}

const PIZZA_KIND_MARKER = /__HULL_PIZZA_KIND:(pizza|garlic_bread|calzone)__/i;

export function menuItemHasPizzaKindMarker(item: MenuItem): boolean {
  return PIZZA_KIND_MARKER.test(item.description ?? "");
}

/** Apply £10 base and 7/10/12/16 size group to a pizza-row menu item. */
export function applyStandardTestPizzaSizesToMenuItem(item: MenuItem): MenuItem {
  const otherGroups = item.optionGroups.filter((group) => !isPizzaSizeOptionGroup(group));
  return {
    ...item,
    price: STANDARD_TEST_PIZZA_SIZE_PRICE,
    optionGroups: [
      ...otherGroups,
      buildPizzaSizeOptionGroupForItem(item.id, STANDARD_TEST_PIZZA_SIZE_LABELS, STANDARD_TEST_PIZZA_SIZE_PRICE),
    ],
  };
}
