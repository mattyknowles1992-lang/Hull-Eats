import type { HubMenuSection, MenuItem } from "@hull-eats/types";
import {
  HUB_MENU_CATEGORY_CUSTOM_ID,
  HUB_MENU_EXTRAS_LIBRARY_PRESET,
  HUB_MENU_MEAL_LIBRARY_PRESET,
  isHubMenuExtrasLibrarySection,
  isHubMenuMealLibrarySection,
  isHubMenuStaffLibrarySection,
  isHubMenuSectionPizza,
} from "@hull-eats/types";

export type HubExtraTopping = {
  id: string;
  label: string;
  price: number;
};

export const EXTRAS_TOPPINGS_GROUP_NAME = "Extra toppings";
export const MANUAL_VARIATIONS_GROUP_NAME = "Options";
export const MEAL_CHOICE_GROUP_NAME = "Meal choice";
const MEAL_TEMPLATE_MARKER = /^__HULL_MEAL_TEMPLATE:([a-zA-Z0-9-]+)__$/;

export type HubMealSideOption = { id: string; label: string; priceDelta: number };
export type HubMealDrinkOption = { id: string; label: string; priceDelta: number };

export type HubMealTemplate = {
  id: string;
  label: string;
  upgradePrice: number;
  sides: HubMealSideOption[];
  drinks: HubMealDrinkOption[];
};

export type MenuTemplateKind = "simple" | "pizza" | "burger" | "meal" | "drink" | "dessert" | "custom";

export type MenuAvailabilityMode = "live" | "sold_out" | "hidden";

export type MenuCategoryDraftInput = {
  presetId: string;
  name: string;
  description: string;
  defaultPrice: string;
};

export type MenuItemDraftInput = {
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  requiresIdVerification: boolean;
  components: MenuItem["components"];
  optionGroups: MenuItem["optionGroups"];
  /** Defaults to hidden until the owner marks the item live and publishes. */
  isActive?: boolean;
};

export type MenuPublishSummary = {
  issues: string[];
  categoryCount: number;
  itemCount: number;
  liveCount: number;
  soldOutCount: number;
  hiddenCount: number;
  newItemCount: number;
  removedItemCount: number;
  hasUnsavedChanges: boolean;
};

type MenuComponent = MenuItem["components"][number];
type MenuOptionGroup = MenuItem["optionGroups"][number];
type MenuOption = MenuOptionGroup["options"][number];

export const createMenuDraftId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

const createDraftId = createMenuDraftId;

export const createEmptyComponent = (): MenuComponent => ({
  id: createDraftId("component"),
  label: "",
  quantity: 1,
  removable: false,
});

export const createEmptyOption = (): MenuOption => ({
  id: createDraftId("option"),
  label: "",
  description: "",
  priceDelta: 0,
  isDefault: false,
  maxQuantity: 1,
});

export const createEmptyOptionGroup = (): MenuOptionGroup => ({
  id: createDraftId("group"),
  name: "",
  description: "",
  selectionMode: "single",
  isRequired: false,
  minSelections: 0,
  maxSelections: 1,
  showWhenValueIds: [],
  options: [createEmptyOption()],
});

const createTemplateOption = (label: string, priceDelta = 0, isDefault = false): MenuOption => ({
  id: createDraftId("option"),
  label,
  description: "",
  priceDelta,
  isDefault,
  maxQuantity: 1,
});

const createTemplateGroup = (
  name: string,
  options: MenuOption[],
  config: Partial<Omit<MenuOptionGroup, "id" | "name" | "options">> = {},
): MenuOptionGroup => ({
  id: createDraftId("group"),
  name,
  description: config.description ?? "",
  selectionMode: config.selectionMode ?? "single",
  isRequired: config.isRequired ?? false,
  minSelections: config.minSelections ?? 0,
  maxSelections: config.maxSelections ?? (config.selectionMode === "multiple" ? null : 1),
  showWhenValueIds: config.showWhenValueIds ?? [],
  options,
});

export const menuTemplateCards: Array<{ kind: MenuTemplateKind; title: string; copy: string }> = [
  { kind: "simple", title: "Fixed price", copy: "No sizes or extras — one price, optional description and photo." },
  { kind: "pizza", title: "Pizza", copy: "Required size, crust choices, toppings, and removable ingredients." },
  { kind: "burger", title: "Burger", copy: "Patty size, salad/sauce removals, cheese, bacon, and extras." },
  { kind: "meal", title: "Meal deal", copy: "Customer picks main, side, drink, and sauces." },
  { kind: "drink", title: "Drink", copy: "Sizes, flavours, and add-ons like extra ice." },
  { kind: "dessert", title: "Dessert", copy: "Sauces, toppings, and paid extras." },
  { kind: "custom", title: "Build your own", copy: "Start with one empty customer choice group and add more." },
];

export function buildMenuTemplate(kind: MenuTemplateKind): Pick<MenuItem, "components" | "optionGroups"> {
  if (kind === "pizza") {
    const sizeOptions = [
      createTemplateOption('8"', 0, true),
      createTemplateOption('10"', 2.6),
      createTemplateOption('12"', 3.6),
      createTemplateOption('16"', 9.29),
    ];

    const crustGroups = sizeOptions.map((sizeOption, index) =>
      createTemplateGroup(
        `Crust (${sizeOption.label})`,
        [
          createTemplateOption("Regular crust", 0, true),
          createTemplateOption("Stuffed crust", [1.25, 1.5, 2, 2.75][index] ?? 2),
        ],
        { isRequired: true, minSelections: 1, maxSelections: 1, showWhenValueIds: [sizeOption.id] },
      ),
    );

    return {
      components: [
        { id: createDraftId("component"), label: "Cheese", quantity: 1, removable: true },
        { id: createDraftId("component"), label: "Tomato base", quantity: 1, removable: true },
      ],
      optionGroups: [
        createTemplateGroup("Size (pick one)", sizeOptions, { isRequired: true, minSelections: 1, maxSelections: 1 }),
        ...crustGroups,
        createTemplateGroup(
          "Extra toppings",
          [
            createTemplateOption("Extra cheese", 1),
            createTemplateOption("Pepperoni", 1.2),
            createTemplateOption("Chicken", 1.5),
            createTemplateOption("Mushrooms", 0.8),
            createTemplateOption("Jalapenos", 0.8),
          ],
          { selectionMode: "multiple", isRequired: false, minSelections: 0, maxSelections: null },
        ),
      ],
    };
  }

  if (kind === "burger") {
    return {
      components: [
        { id: createDraftId("component"), label: "Bun", quantity: 1, removable: false },
        { id: createDraftId("component"), label: "Patty", quantity: 1, removable: false },
        { id: createDraftId("component"), label: "Cheese", quantity: 1, removable: true },
        { id: createDraftId("component"), label: "Lettuce", quantity: 1, removable: true },
        { id: createDraftId("component"), label: "Sauce", quantity: 1, removable: true },
      ],
      optionGroups: [
        createTemplateGroup(
          "Patty size (pick one)",
          [createTemplateOption("1/4 lb", 0, true), createTemplateOption("1/2 lb", 2.5)],
          { isRequired: true, minSelections: 1, maxSelections: 1 },
        ),
        createTemplateGroup(
          "Extras",
          [
            createTemplateOption("Extra patty", 2.5),
            createTemplateOption("Bacon", 1.5),
            createTemplateOption("Extra cheese", 0.8),
            createTemplateOption("Hash brown", 1),
          ],
          { selectionMode: "multiple", maxSelections: null },
        ),
      ],
    };
  }

  if (kind === "meal") {
    return {
      components: [],
      optionGroups: [
        createTemplateGroup("Main (pick one)", [createTemplateOption("Burger", 0, true), createTemplateOption("Wrap", 0), createTemplateOption("Chicken strips", 1)], {
          isRequired: true,
          minSelections: 1,
          maxSelections: 1,
        }),
        createTemplateGroup("Side (pick one)", [createTemplateOption("Fries", 0, true), createTemplateOption("Loaded fries", 2.5)], {
          isRequired: true,
          minSelections: 1,
          maxSelections: 1,
        }),
        createTemplateGroup("Drink (pick one)", [createTemplateOption("Can", 0, true), createTemplateOption("Bottle", 1)], {
          isRequired: true,
          minSelections: 1,
          maxSelections: 1,
        }),
        createTemplateGroup("Sauces", [createTemplateOption("Garlic mayo", 0), createTemplateOption("BBQ", 0)], {
          selectionMode: "multiple",
          maxSelections: 3,
        }),
      ],
    };
  }

  if (kind === "drink") {
    return {
      components: [],
      optionGroups: [
        createTemplateGroup("Size (pick one)", [createTemplateOption("Can", 0, true), createTemplateOption("500ml", 1), createTemplateOption("1.5L", 2.5)], {
          isRequired: true,
          minSelections: 1,
          maxSelections: 1,
        }),
        createTemplateGroup("Flavour (pick one)", [createTemplateOption("Cola", 0, true), createTemplateOption("Lemonade", 0)], {
          isRequired: true,
          minSelections: 1,
          maxSelections: 1,
        }),
      ],
    };
  }

  if (kind === "dessert") {
    return {
      components: [],
      optionGroups: [
        createTemplateGroup("Sauce (pick one)", [createTemplateOption("Chocolate", 0, true), createTemplateOption("Caramel", 0)], {
          isRequired: true,
          minSelections: 1,
          maxSelections: 1,
        }),
        createTemplateGroup(
          "Extras",
          [createTemplateOption("Ice cream", 1.5), createTemplateOption("Strawberries", 1)],
          { selectionMode: "multiple", maxSelections: null },
        ),
      ],
    };
  }

  return {
    components: [],
    optionGroups: kind === "custom" ? [createEmptyOptionGroup()] : [],
  };
}

export function formatMenuMoney(value: number) {
  return `£${value.toFixed(2)}`;
}

/** True when the item already has a required size choice group (prices live on each size). */
export function itemUsesSizePricing(item: MenuItem): boolean {
  return item.optionGroups.some(
    (group) => group.isRequired && /size/i.test(group.name) && group.options.some((option) => option.label.trim()),
  );
}

/** Apply a template but keep an existing size group from the pizza size builder. */
export function mergeMenuTemplateWithExistingSizes(item: MenuItem, kind: MenuTemplateKind): MenuItem {
  const template = buildMenuTemplate(kind);
  const existingSizeGroups = item.optionGroups.filter((group) => /size/i.test(group.name));
  const templateWithoutSizes = template.optionGroups.filter((group) => !/size/i.test(group.name));

  return {
    ...item,
    components: template.components.length > 0 ? template.components : item.components,
    optionGroups: [...existingSizeGroups, ...templateWithoutSizes],
  };
}

const flattenMenuItemIds = (sections: HubMenuSection[]) => new Set(sections.flatMap((section) => section.items.map((item) => item.id)));

export function getMenuAvailabilityMode(item: MenuItem): MenuAvailabilityMode {
  if (!item.isActive) {
    return "hidden";
  }
  if (item.stockStatus === "out_of_stock") {
    return "sold_out";
  }
  return "live";
}

export function applyMenuAvailabilityMode(item: MenuItem, mode: MenuAvailabilityMode): MenuItem {
  if (mode === "hidden") {
    return { ...item, isActive: false };
  }
  if (mode === "sold_out") {
    return { ...item, isActive: true, stockStatus: "out_of_stock" };
  }
  return {
    ...item,
    isActive: true,
    stockStatus: item.stockStatus === "low_stock" ? "low_stock" : "in_stock",
  };
}

export function describeMenuAvailability(mode: MenuAvailabilityMode) {
  if (mode === "live") {
    return { label: "Live", hint: "Customers can order this item." };
  }
  if (mode === "sold_out") {
    return { label: "Sold out", hint: "Still visible on your menu but cannot be ordered." };
  }
  return { label: "Hidden", hint: "Not shown to customers until you turn it live and publish." };
}

export function buildLocalMenuCategory(input: MenuCategoryDraftInput): HubMenuSection {
  const presetKey = input.presetId && input.presetId !== HUB_MENU_CATEGORY_CUSTOM_ID ? input.presetId : null;
  return {
    id: createMenuDraftId("section"),
    name: input.name.trim(),
    description: input.description.trim(),
    presetKey,
    defaultPrice: input.defaultPrice.trim() ? Number(input.defaultPrice) : null,
    items: [],
  };
}

export function buildLocalMenuItem(input: MenuItemDraftInput): MenuItem {
  return {
    id: createMenuDraftId("item"),
    categoryId: input.categoryId,
    name: input.name.trim(),
    description: input.description.trim(),
    price: input.price,
    imageUrl: input.imageUrl,
    isActive: input.isActive ?? false,
    trackStock: false,
    stockQuantity: null,
    stockStatus: "in_stock",
    allowBackorder: false,
    maxPerOrder: null,
    requiresIdVerification: input.requiresIdVerification,
    sortOrder: 0,
    components: input.components,
    optionGroups: input.optionGroups,
  };
}

const remapCustomisationIds = (item: MenuItem): MenuItem => ({
  ...item,
  components: item.components.map((component) => ({
    ...component,
    id: createMenuDraftId("component"),
  })),
  optionGroups: item.optionGroups.map((group) => ({
    ...group,
    id: createMenuDraftId("group"),
    showWhenValueIds: [],
    options: group.options.map((option) => ({
      ...option,
      id: createMenuDraftId("option"),
    })),
  })),
});

export function cloneMenuItemDraft(source: MenuItem, nameOverride?: string): MenuItem {
  const cloned = JSON.parse(JSON.stringify(source)) as MenuItem;
  return remapCustomisationIds({
    ...cloned,
    id: createMenuDraftId("item"),
    name: nameOverride ?? source.name.trim(),
    isActive: false,
    stockStatus: "in_stock",
  });
}

export type CategoryItemBuilderMode = "pizza-sizes" | "fixed-price";

export function getCategoryItemBuilderMode(section: HubMenuSection | null | undefined): CategoryItemBuilderMode {
  if (isHubMenuSectionPizza(section)) {
    return "pizza-sizes";
  }
  return "fixed-price";
}

export function describeCategoryItemBuilder(section: HubMenuSection | null | undefined): string {
  const mode = getCategoryItemBuilderMode(section);
  if (mode === "pizza-sizes") {
    return "Add the pizza name, then tick each size and set a price in the table.";
  }
  const key = section?.presetKey ?? "";
  if (key === "drinks" || key === "milkshakes" || key === "coffee") {
    return "Set one base price (e.g. can). Add size or flavour options below if needed.";
  }
  if (key === "chicken" || key === "starters" || key === "sides") {
    return "Set the portion price (e.g. 6 wings), then add flavour options (BBQ, Spicy…) with any extra £.";
  }
  return "Set name and price. Add optional choices (flavours, sauces) — no sizes required unless you add them in Advanced.";
}

export function computeMenuPublishIssues(sections: HubMenuSection[]): string[] {
  const issues: string[] = [];
  sections = customerFacingMenuSections(sections);

  if (sections.length === 0) {
    issues.push("Add at least one menu category.");
    return issues;
  }

  const liveItems = sections.flatMap((section) => section.items).filter((item) => item.isActive);

  if (liveItems.length === 0) {
    issues.push("Turn at least one item live before publishing, or customers will see an empty menu.");
  }

  for (const section of sections) {
    if (section.items.length === 0) {
      issues.push(`"${section.name}" has no items yet.`);
    }

    for (const item of section.items) {
      if (!item.name.trim()) {
        issues.push("Every item needs a name.");
      }

      if (!item.isActive) {
        continue;
      }

      if (Number.isNaN(item.price) || item.price < 0) {
        issues.push(`"${item.name}" needs a valid price.`);
      }

      for (const group of item.optionGroups) {
        if (group.isRequired && group.options.filter((option) => option.label.trim()).length === 0) {
          issues.push(`"${item.name}" — "${group.name || "Choice group"}" is required but has no options.`);
        }
      }
    }
  }

  return issues;
}

export type MenuPreviewCategory = {
  id: string;
  name: string;
  description?: string;
  items: MenuItem[];
};

export function findExtrasLibrarySection(sections: HubMenuSection[]): HubMenuSection | null {
  return sections.find((section) => isHubMenuExtrasLibrarySection(section)) ?? null;
}

export function getHubExtraToppingsFromSection(section: HubMenuSection | null): HubExtraTopping[] {
  if (!section) {
    return [];
  }
  return section.items.map((item) => ({
    id: item.id,
    label: item.name.trim(),
    price: Number(item.price) || 0,
  }));
}

export function buildExtrasLibrarySection(): HubMenuSection {
  return {
    id: createMenuDraftId("section"),
    name: "Extra toppings",
    description: "Topping list for pizzas and customisable items.",
    presetKey: HUB_MENU_EXTRAS_LIBRARY_PRESET,
    defaultPrice: 0,
    items: [],
  };
}

export function ensureExtrasLibrarySection(sections: HubMenuSection[]): HubMenuSection[] {
  if (findExtrasLibrarySection(sections)) {
    return sections;
  }
  return [buildExtrasLibrarySection(), ...sections];
}

export function findMealLibrarySection(sections: HubMenuSection[]): HubMenuSection | null {
  return sections.find((section) => isHubMenuMealLibrarySection(section)) ?? null;
}

export function buildMealLibrarySection(): HubMenuSection {
  return {
    id: createMenuDraftId("section"),
    name: "Make it a meal",
    description: "Meal upgrade templates — apply per item in the menu.",
    presetKey: HUB_MENU_MEAL_LIBRARY_PRESET,
    defaultPrice: 3,
    items: [],
  };
}

export function ensureMealLibrarySection(sections: HubMenuSection[]): HubMenuSection[] {
  if (findMealLibrarySection(sections)) {
    return sections;
  }
  return [...sections, buildMealLibrarySection()];
}

export function ensureStaffMenuSections(sections: HubMenuSection[]): HubMenuSection[] {
  return sortMenuSectionsForStudio(ensureMealLibrarySection(ensureExtrasLibrarySection(sections)));
}

const MEAL_CFG_PREFIX = /^__HULL_MEAL_CFG:([\s\S]*?)__(?:\r?\n)?([\s\S]*)$/;

function parseMealTemplatePayload(raw: string): { sides: HubMealSideOption[]; drinks: HubMealDrinkOption[] } {
  try {
    const parsed = JSON.parse(raw) as { sides?: unknown; drinks?: unknown };
    return {
      sides: parseMealOptionRows(parsed.sides, "meal-side"),
      drinks: parseMealOptionRows(parsed.drinks, "meal-drink"),
    };
  } catch {
    return { sides: [], drinks: [] };
  }
}

function parseMealOptionRows(rows: unknown, idPrefix: string): HubMealSideOption[] {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const row = entry as { id?: string; label?: string; priceDelta?: number };
      return row.label?.trim()
        ? {
            id: row.id ?? createMenuDraftId(idPrefix),
            label: row.label.trim(),
            priceDelta: Number(row.priceDelta) || 0,
          }
        : null;
    })
    .filter(Boolean) as HubMealSideOption[];
}

export function encodeMealLibraryItemDescription(
  sides: HubMealSideOption[],
  drinks: HubMealDrinkOption[],
  userDescription = "",
): string {
  const payload = JSON.stringify({ sides, drinks });
  const note = userDescription.trim();
  return note ? `__HULL_MEAL_CFG:${payload}__\n${note}` : `__HULL_MEAL_CFG:${payload}__`;
}

function readMealTemplateConfig(item: MenuItem): { sides: HubMealSideOption[]; drinks: HubMealDrinkOption[] } {
  const fromDescription = item.description?.match(MEAL_CFG_PREFIX);
  if (fromDescription?.[1]) {
    const parsed = parseMealTemplatePayload(fromDescription[1]);
    if (parsed.sides.length > 0 || parsed.drinks.length > 0) {
      return parsed;
    }
  }

  const raw = item as MenuItem & { customisationConfig?: unknown };
  const config =
    raw.customisationConfig && typeof raw.customisationConfig === "object"
      ? (raw.customisationConfig as { hubMealTemplate?: { sides?: unknown; drinks?: unknown } })
      : {};
  const template = config.hubMealTemplate ?? {};
  return {
    sides: parseMealOptionRows(template.sides, "meal-side"),
    drinks: parseMealOptionRows(template.drinks, "meal-drink"),
  };
}

export function getMealTemplateFromItem(item: MenuItem): HubMealTemplate {
  const { sides, drinks } = readMealTemplateConfig(item);
  return {
    id: item.id,
    label: item.name.trim(),
    upgradePrice: Number(item.price) || 0,
    sides:
      sides.length > 0
        ? sides
        : [
            { id: createMenuDraftId("meal-side"), label: "Fries", priceDelta: 0 },
            { id: createMenuDraftId("meal-side"), label: "Waffle fries", priceDelta: 0.99 },
          ],
    drinks:
      drinks.length > 0
        ? drinks
        : [
            { id: createMenuDraftId("meal-drink"), label: "Coke", priceDelta: 0 },
            { id: createMenuDraftId("meal-drink"), label: "Diet Coke", priceDelta: 0 },
          ],
  };
}

export function getHubMealTemplatesFromSection(section: HubMenuSection | null): HubMealTemplate[] {
  if (!section) {
    return [];
  }
  return section.items.map((item) => {
    const { sides, drinks } = readMealTemplateConfig(item);
    return {
      id: item.id,
      label: item.name.trim(),
      upgradePrice: Number(item.price) || 0,
      sides:
        sides.length > 0
          ? sides
          : [
              { id: createMenuDraftId("meal-side"), label: "Fries", priceDelta: 0 },
              { id: createMenuDraftId("meal-side"), label: "Waffle fries", priceDelta: 0.99 },
            ],
      drinks:
        drinks.length > 0
          ? drinks
          : [
              { id: createMenuDraftId("meal-drink"), label: "Coke", priceDelta: 0 },
              { id: createMenuDraftId("meal-drink"), label: "Diet Coke", priceDelta: 0 },
            ],
    };
  });
}

export function buildMealLibraryItem(input: {
  categoryId: string;
  label: string;
  upgradePrice: number;
  sides?: HubMealSideOption[];
  drinks?: HubMealDrinkOption[];
}): MenuItem {
  const sides = input.sides ?? [
    { id: createMenuDraftId("meal-side"), label: "Fries", priceDelta: 0 },
    { id: createMenuDraftId("meal-side"), label: "Waffle fries", priceDelta: 0.99 },
  ];
  const drinks = input.drinks ?? [
    { id: createMenuDraftId("meal-drink"), label: "Coke", priceDelta: 0 },
    { id: createMenuDraftId("meal-drink"), label: "Diet Coke", priceDelta: 0 },
  ];

  return buildLocalMenuItem({
    categoryId: input.categoryId,
    name: input.label.trim(),
    description: encodeMealLibraryItemDescription(sides, drinks),
    price: input.upgradePrice,
    requiresIdVerification: false,
    isActive: true,
    components: [],
    optionGroups: [],
  });
}

export function updateMealLibraryItemTemplate(
  item: MenuItem,
  patch: Partial<Pick<HubMealTemplate, "label" | "upgradePrice" | "sides" | "drinks">>,
): MenuItem {
  const current = readMealTemplateConfig(item);
  const sides = patch.sides ?? current.sides;
  const drinks = patch.drinks ?? current.drinks;
  const userNote = item.description?.match(MEAL_CFG_PREFIX)?.[2]?.trim() ?? "";

  return {
    ...item,
    name: patch.label?.trim() ? patch.label.trim() : item.name,
    price: patch.upgradePrice != null ? patch.upgradePrice : item.price,
    description: encodeMealLibraryItemDescription(sides, drinks, userNote),
  };
}

export function buildAllToppingSelection(toppings: HubExtraTopping[]): { selectedIds: Set<string>; priceById: Map<string, number> } {
  const selectedIds = new Set(toppings.map((topping) => topping.id));
  const priceById = new Map(toppings.map((topping) => [topping.id, topping.price]));
  return { selectedIds, priceById };
}

export function applyDefaultExtraToppingsToItem(item: MenuItem, toppings: HubExtraTopping[]): MenuItem {
  if (toppings.length === 0) {
    return item;
  }
  const { selectedIds, priceById } = buildAllToppingSelection(toppings);
  return applyExtraToppingsToItem(item, true, toppings, selectedIds, priceById);
}

export function customerFacingMenuSections(sections: HubMenuSection[]): HubMenuSection[] {
  return sections.filter((section) => !isHubMenuStaffLibrarySection(section));
}

export function staffMenuSections(sections: HubMenuSection[]): HubMenuSection[] {
  return sections.filter((section) => isHubMenuStaffLibrarySection(section));
}

export function sortMenuSectionsForStudio(sections: HubMenuSection[]): HubMenuSection[] {
  const staff = staffMenuSections(sections);
  const extras = staff.find((section) => isHubMenuExtrasLibrarySection(section));
  const meals = staff.find((section) => isHubMenuMealLibrarySection(section));
  const otherStaff = staff.filter(
    (section) => !isHubMenuExtrasLibrarySection(section) && !isHubMenuMealLibrarySection(section),
  );
  const customer = customerFacingMenuSections(sections);
  return [...[extras, meals].filter(Boolean), ...otherStaff, ...customer] as HubMenuSection[];
}

export function getItemExtraToppingSelection(item: MenuItem): {
  enabled: boolean;
  selectedIds: Set<string>;
  priceById: Map<string, number>;
} {
  const group = item.optionGroups.find((entry) => entry.name === EXTRAS_TOPPINGS_GROUP_NAME);
  if (!group) {
    return { enabled: false, selectedIds: new Set(), priceById: new Map() };
  }
  const priceById = new Map<string, number>();
  for (const option of group.options) {
    priceById.set(option.id, option.priceDelta);
  }
  return {
    enabled: true,
    selectedIds: new Set(group.options.map((option) => option.id)),
    priceById,
  };
}

export function applyExtraToppingsToItem(
  item: MenuItem,
  enabled: boolean,
  toppings: HubExtraTopping[],
  selectedIds: Set<string>,
  priceById: Map<string, number>,
): MenuItem {
  const withoutExtras = item.optionGroups.filter((group) => group.name !== EXTRAS_TOPPINGS_GROUP_NAME);
  if (!enabled || selectedIds.size === 0) {
    return { ...item, optionGroups: withoutExtras };
  }

  const options = toppings
    .filter((topping) => selectedIds.has(topping.id))
    .map((topping) => ({
      id: topping.id,
      label: topping.label,
      description: "",
      priceDelta: priceById.get(topping.id) ?? topping.price,
      isDefault: false,
      maxQuantity: 1,
    }));

  if (options.length === 0) {
    return { ...item, optionGroups: withoutExtras };
  }

  return {
    ...item,
    optionGroups: [
      ...withoutExtras,
      {
        id: createMenuDraftId("group"),
        name: EXTRAS_TOPPINGS_GROUP_NAME,
        description: "",
        selectionMode: "multiple" as const,
        isRequired: false,
        minSelections: 0,
        maxSelections: null,
        showWhenValueIds: [],
        options,
      },
    ],
  };
}

export type ManualVariationRow = { id: string; label: string; price: string };

export function getManualVariationRows(item: MenuItem): ManualVariationRow[] {
  const group = item.optionGroups.find((entry) => entry.name === MANUAL_VARIATIONS_GROUP_NAME);
  if (!group) {
    return [];
  }
  return group.options.map((option) => ({
    id: option.id,
    label: option.label,
    price: String(option.priceDelta),
  }));
}

export function applyManualVariationsToItem(item: MenuItem, rows: ManualVariationRow[]): MenuItem {
  const without = item.optionGroups.filter((group) => group.name !== MANUAL_VARIATIONS_GROUP_NAME);
  const active = rows.filter((row) => row.label.trim());
  if (active.length === 0) {
    return { ...item, optionGroups: without };
  }

  return {
    ...item,
    optionGroups: [
      ...without,
      {
        id: createMenuDraftId("group"),
        name: MANUAL_VARIATIONS_GROUP_NAME,
        description: "",
        selectionMode: "single" as const,
        isRequired: false,
        minSelections: 0,
        maxSelections: 1,
        showWhenValueIds: [],
        options: active.map((row, index) => ({
          id: row.id || createMenuDraftId("option"),
          label: row.label.trim(),
          description: "",
          priceDelta: Number(row.price) || 0,
          isDefault: index === 0,
          maxQuantity: 1,
        })),
      },
    ],
  };
}

/** Customer-facing categories from the current draft (hidden items omitted, order preserved). */
export function buildMenuPreviewCategories(sections: HubMenuSection[]): MenuPreviewCategory[] {
  return customerFacingMenuSections(sections).map((section) => ({
    id: section.id,
    name: section.name,
    description: section.description?.trim() || undefined,
    items: section.items.filter((item) => getMenuAvailabilityMode(item) !== "hidden"),
  }));
}

export function getMenuItemPriceLabel(item: MenuItem): string {
  if (itemUsesSizePricing(item)) {
    const sizeGroup = item.optionGroups.find((group) => group.isRequired && /size/i.test(group.name));
    const optionPrices = (sizeGroup?.options ?? [])
      .filter((option) => option.label.trim())
      .map((option) => item.price + option.priceDelta);
    const minPrice = optionPrices.length > 0 ? Math.min(...optionPrices) : item.price;
    return `From ${formatMenuMoney(minPrice)}`;
  }

  return formatMenuMoney(item.price);
}

export function reorderMenuSections(
  sections: HubMenuSection[],
  sectionId: string,
  direction: "up" | "down",
): HubMenuSection[] {
  const index = sections.findIndex((section) => section.id === sectionId);
  if (index < 0) {
    return sections;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= sections.length) {
    return sections;
  }

  const next = [...sections];
  const [moved] = next.splice(index, 1);
  if (!moved) {
    return sections;
  }
  next.splice(targetIndex, 0, moved);
  return next;
}

/** Reorder customer categories only — staff libraries stay at the top. */
export function reorderCustomerMenuSections(
  sections: HubMenuSection[],
  sectionId: string,
  direction: "up" | "down",
): HubMenuSection[] {
  if (isHubMenuStaffLibrarySection(sections.find((section) => section.id === sectionId))) {
    return sections;
  }

  const sorted = sortMenuSectionsForStudio(sections);
  const staff = staffMenuSections(sorted);
  const customer = customerFacingMenuSections(sorted);
  const customerIndex = customer.findIndex((section) => section.id === sectionId);
  if (customerIndex < 0) {
    return sections;
  }

  const targetIndex = direction === "up" ? customerIndex - 1 : customerIndex + 1;
  if (targetIndex < 0 || targetIndex >= customer.length) {
    return sections;
  }

  const nextCustomer = [...customer];
  const [moved] = nextCustomer.splice(customerIndex, 1);
  if (!moved) {
    return sections;
  }
  nextCustomer.splice(targetIndex, 0, moved);
  return [...staff, ...nextCustomer];
}

export function stripMealUpgradeGroups(item: MenuItem): MenuItem {
  return {
    ...item,
    optionGroups: item.optionGroups.filter((group) => {
      if (group.name === MEAL_CHOICE_GROUP_NAME) {
        return false;
      }
      return !group.showWhenValueIds.some((id) => id.includes("-meal-yes"));
    }),
  };
}

export function getItemMealUpgradeSelection(
  item: MenuItem,
  templates: HubMealTemplate[],
): {
  enabled: boolean;
  templateId: string | null;
  selectedSideIds: Set<string>;
  selectedDrinkIds: Set<string>;
} {
  const mealGroup = item.optionGroups.find((group) => group.name === MEAL_CHOICE_GROUP_NAME);
  if (!mealGroup) {
    return { enabled: false, templateId: null, selectedSideIds: new Set(), selectedDrinkIds: new Set() };
  }

  const marker = mealGroup.description?.match(MEAL_TEMPLATE_MARKER);
  const templateId = marker?.[1] ?? templates[0]?.id ?? null;
  const template = templates.find((entry) => entry.id === templateId) ?? templates[0];
  const mealYesOption = mealGroup.options.find((option) => option.id.includes("-meal-yes"));

  const sideGroup = item.optionGroups.find((group) => /side|fries/i.test(group.name) && group.showWhenValueIds.length > 0);
  const drinkGroup = item.optionGroups.find((group) => /drink|can/i.test(group.name) && group.showWhenValueIds.length > 0);

  const selectedSideIds = new Set(
    sideGroup?.options.map((option) => option.id) ??
      template?.sides.map((side) => side.id) ??
      [],
  );
  const selectedDrinkIds = new Set(
    drinkGroup?.options.map((option) => option.id) ??
      template?.drinks.map((drink) => drink.id) ??
      [],
  );

  return {
    enabled: Boolean(mealGroup),
    templateId: template?.id ?? null,
    selectedSideIds,
    selectedDrinkIds,
  };
}

export function buildMealUpgradeOptionGroups(
  template: HubMealTemplate,
  selectedSideIds: Set<string>,
  selectedDrinkIds: Set<string>,
): MenuItem["optionGroups"] {
  const seed = createMenuDraftId("meal");
  const mealYesId = `${seed}-meal-yes`;
  const sides = template.sides.filter((side) => selectedSideIds.has(side.id));
  const drinks = template.drinks.filter((drink) => selectedDrinkIds.has(drink.id));

  const groups: MenuItem["optionGroups"] = [
    {
      id: createMenuDraftId("group"),
      name: MEAL_CHOICE_GROUP_NAME,
      description: `__HULL_MEAL_TEMPLATE:${template.id}__`,
      selectionMode: "single",
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      showWhenValueIds: [],
      options: [
        {
          id: `${seed}-no-meal`,
          label: "On its own",
          description: "",
          priceDelta: 0,
          isDefault: true,
          maxQuantity: 1,
        },
        {
          id: mealYesId,
          label: template.label,
          description: "",
          priceDelta: template.upgradePrice,
          isDefault: false,
          maxQuantity: 1,
        },
      ],
    },
  ];

  if (sides.length > 0) {
    groups.push({
      id: createMenuDraftId("group"),
      name: "Choose your side",
      description: "",
      selectionMode: "single",
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      showWhenValueIds: [mealYesId],
      options: sides.map((side, index) => ({
        id: side.id,
        label: side.label,
        description: "",
        priceDelta: side.priceDelta,
        isDefault: index === 0,
        maxQuantity: 1,
      })),
    });
  }

  if (drinks.length > 0) {
    groups.push({
      id: createMenuDraftId("group"),
      name: "Choose your drink",
      description: "",
      selectionMode: "single",
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      showWhenValueIds: [mealYesId],
      options: drinks.map((drink, index) => ({
        id: drink.id,
        label: drink.label,
        description: "",
        priceDelta: drink.priceDelta,
        isDefault: index === 0,
        maxQuantity: 1,
      })),
    });
  }

  return groups;
}

export function applyMealUpgradeToItem(
  item: MenuItem,
  enabled: boolean,
  template: HubMealTemplate | null,
  selectedSideIds: Set<string>,
  selectedDrinkIds: Set<string>,
): MenuItem {
  const withoutMeal = stripMealUpgradeGroups(item);
  if (!enabled || !template) {
    return withoutMeal;
  }

  const sideIds = selectedSideIds.size > 0 ? selectedSideIds : new Set(template.sides.map((side) => side.id));
  const drinkIds = selectedDrinkIds.size > 0 ? selectedDrinkIds : new Set(template.drinks.map((drink) => drink.id));

  return {
    ...withoutMeal,
    optionGroups: [...withoutMeal.optionGroups, ...buildMealUpgradeOptionGroups(template, sideIds, drinkIds)],
  };
}

export function buildMenuPublishSummary(
  sections: HubMenuSection[],
  savedSections: HubMenuSection[] | null,
  hasUnsavedChanges: boolean,
): MenuPublishSummary {
  const customerSections = customerFacingMenuSections(sections);
  const savedCustomer = savedSections ? customerFacingMenuSections(savedSections) : null;
  const items = customerSections.flatMap((section) => section.items);
  const savedIds = savedCustomer ? flattenMenuItemIds(savedCustomer) : new Set<string>();
  const currentIds = flattenMenuItemIds(customerSections);

  return {
    issues: computeMenuPublishIssues(sections),
    categoryCount: customerSections.length,
    itemCount: items.length,
    liveCount: items.filter((item) => getMenuAvailabilityMode(item) === "live").length,
    soldOutCount: items.filter((item) => getMenuAvailabilityMode(item) === "sold_out").length,
    hiddenCount: items.filter((item) => getMenuAvailabilityMode(item) === "hidden").length,
    newItemCount: [...currentIds].filter((id) => !savedIds.has(id)).length,
    removedItemCount: [...savedIds].filter((id) => !currentIds.has(id)).length,
    hasUnsavedChanges,
  };
}
