import type { HubMenuSection, MenuItem } from "@hull-eats/types";
import {
  decodeHubMenuCategoryDescription,
  encodeExtraIncludedQuantity,
  encodeHubMenuCategoryDescription,
  getCategoryCustomerDescription,
  parseExtraIncludedQuantity,
  readMenuSubGroupsFromSection,
  HUB_MENU_CATEGORY_CUSTOM_ID,
  HUB_MENU_BURGER_KEBAB_PARTS_PRESET,
  HUB_MENU_BURGER_PARTS_PRESET,
  HUB_MENU_KEBAB_PARTS_PRESET,
  HUB_MENU_BOARDS_PRESET,
  HUB_MENU_EXTRAS_LIBRARY_PRESET,
  HUB_MENU_SAUCES_LIBRARY_PRESET,
  HUB_MENU_MEAL_LIBRARY_PRESET,
  isHubMenuSaucesLibrarySection,
  isHubMenuBurgerKebabPartsSection,
  isHubMenuBurgerMenuCategory,
  isHubMenuBurgerPartsSection,
  isHubMenuKebabMenuCategory,
  isHubMenuKebabPartsSection,
  isHubMenuExtrasLibrarySection,
  isHubMenuMealDealsCategory,
  isHubMenuMealLibrarySection,
  isHubMenuMenuBoardsConfigSection,
  isHubMenuStaffLibrarySection,
  isHubMenuSectionPizza,
} from "@hull-eats/types";

export type HubExtraTopping = {
  id: string;
  label: string;
  price: number;
};

export type HubSauceOption = {
  id: string;
  label: string;
  /** Price when customer adds an extra portion (included pick-one is always free). */
  extraPrice: number;
};

export const EXTRAS_TOPPINGS_GROUP_NAME = "Extra toppings";
const EXTRAS_TOPPINGS_MARKER = /^__HULL_EXTRAS__/;

export const SAUCES_INCLUDED_GROUP_NAME = "Sauces";
export const SAUCES_EXTRA_GROUP_NAME = "Extra sauce";
const SAUCES_INCLUDED_MARKER = /^__HULL_SAUCES_INCLUDED__/;
const SAUCES_EXTRA_MARKER = /^__HULL_SAUCES_EXTRA__/;

export function isExtrasToppingsGroup(group: MenuOptionGroup): boolean {
  if (EXTRAS_TOPPINGS_MARKER.test(group.description ?? "")) {
    return true;
  }
  return group.name.trim() === EXTRAS_TOPPINGS_GROUP_NAME;
}

export function findExtrasToppingsGroup(item: MenuItem): MenuOptionGroup | null {
  return item.optionGroups.find((group) => isExtrasToppingsGroup(group)) ?? null;
}

export function isSaucesIncludedGroup(group: MenuOptionGroup): boolean {
  if (SAUCES_INCLUDED_MARKER.test(group.description ?? "")) {
    return true;
  }
  return group.name.trim() === SAUCES_INCLUDED_GROUP_NAME;
}

export function isSaucesExtraGroup(group: MenuOptionGroup): boolean {
  if (SAUCES_EXTRA_MARKER.test(group.description ?? "")) {
    return true;
  }
  return group.name.trim() === SAUCES_EXTRA_GROUP_NAME;
}

export function isAnySaucesGroup(group: MenuOptionGroup): boolean {
  return isSaucesIncludedGroup(group) || isSaucesExtraGroup(group);
}

export function findSaucesIncludedGroup(item: MenuItem): MenuOptionGroup | null {
  return item.optionGroups.find((group) => isSaucesIncludedGroup(group)) ?? null;
}

export function findSaucesExtraGroup(item: MenuItem): MenuOptionGroup | null {
  return item.optionGroups.find((group) => isSaucesExtraGroup(group)) ?? null;
}
export const MANUAL_VARIATIONS_GROUP_NAME = "Options";

/** Shown in the menu builder — stored as option group name `Options` on the item. */
export const CUSTOMER_CHOICES_GROUP_LABEL = "Customer choices";

export const UNIVERSAL_CHOICE_QUICK_ADDS = [
  { label: "Base", placeholder: "e.g. Garlic base" },
  { label: "Sauce", placeholder: "e.g. BBQ sauce" },
  { label: "Size", placeholder: "e.g. Large" },
] as const;

const INCLUDES_SPLIT_PATTERN = /\n\nIncludes:\s*/i;

export function formatComponentsAsIncludes(components: MenuComponent[]): string {
  return components
    .filter((component) => component.label.trim())
    .map((component) => {
      const quantity = component.quantity > 1 ? `${component.quantity}× ` : "";
      return `${quantity}${component.label.trim()}`;
    })
    .join(", ");
}

/** Marketing copy only — strips every auto-generated Includes block. */
export function extractDescriptionIntro(description: string): string {
  const parts = description.split(INCLUDES_SPLIT_PATTERN);
  return parts[0]?.trim() ?? "";
}

/** Merge marketing copy with an auto-generated ingredients line from components. */
export function mergeItemDescriptionWithComponents(item: MenuItem, syncIncludes = true): MenuItem {
  const intro = extractDescriptionIntro(item.description);
  if (!syncIncludes || item.components.length === 0) {
    return { ...item, description: intro };
  }
  const includesLine = formatComponentsAsIncludes(item.components);
  if (!includesLine) {
    return { ...item, description: intro };
  }
  return {
    ...item,
    description: intro ? `${intro}\n\nIncludes: ${includesLine}` : `Includes: ${includesLine}`,
  };
}

export function applyComponentsToItem(
  item: MenuItem,
  components: MenuComponent[],
  options?: { syncDescription?: boolean },
): MenuItem {
  const next = { ...item, components };
  return options?.syncDescription === false ? next : mergeItemDescriptionWithComponents(next, true);
}

const PART_CHOICE_MARKER = /^__HULL_PART_CHOICE:(burger|kebab):([a-z0-9_-]+)__$/;

export function isPartChoiceOptionGroup(group: MenuOptionGroup): boolean {
  return PART_CHOICE_MARKER.test((group.description ?? "").trim().split(/\r?\n/)[0] ?? "");
}

export function parsePartChoiceSlot(group: MenuOptionGroup): { line: ComposeProductLine; slot: ComposePartSlot } | null {
  const firstLine = (group.description ?? "").trim().split(/\r?\n/)[0] ?? "";
  const match = firstLine.match(PART_CHOICE_MARKER);
  if (!match) {
    return null;
  }
  return { line: match[1] as ComposeProductLine, slot: match[2] as ComposePartSlot };
}

/** Burger/kebab parts: one fixed part per slot, or a customer pick-one group when several are ticked. */
export function syncComposePartsFromSelection(
  item: MenuItem,
  line: ComposeProductLine,
  slotDefinitions: PartSlotDefinition[],
  parts: HubMenuPart[],
  selectedComponents: MenuComponent[],
  options?: { syncDescription?: boolean },
): MenuItem {
  const partById = new Map(parts.map((part) => [part.id, part]));
  const bySlot = new Map<ComposePartSlot, Array<{ part: HubMenuPart; component: MenuComponent }>>();

  for (const component of selectedComponents) {
    const part = partById.get(component.id);
    if (!part || part.line !== line) {
      continue;
    }
    const bucket = bySlot.get(part.slot) ?? [];
    bucket.push({ part, component });
    bySlot.set(part.slot, bucket);
  }

  const fixedComponents: MenuComponent[] = [];
  const keptGroups = item.optionGroups.filter((group) => !isPartChoiceOptionGroup(group));
  const choiceGroups: MenuOptionGroup[] = [];

  for (const slotDef of slotDefinitions) {
    const entries = bySlot.get(slotDef.key) ?? [];
    if (entries.length === 0) {
      continue;
    }
    if (entries.length === 1) {
      fixedComponents.push(entries[0]!.component);
      continue;
    }

    const existing = item.optionGroups.find((group) => {
      const parsed = parsePartChoiceSlot(group);
      return parsed?.line === line && parsed.slot === slotDef.key;
    });

    choiceGroups.push({
      id: existing?.id ?? createMenuDraftId("group"),
      name: partSlotLabel(line, slotDef.key, slotDefinitions),
      description: `__HULL_PART_CHOICE:${line}:${slotDef.key}__`,
      selectionMode: "single",
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      showWhenValueIds: [],
      options: entries.map((entry, index) => ({
        id: entry.part.id,
        label: entry.part.label,
        description: "",
        priceDelta: 0,
        isDefault: index === 0,
        maxQuantity: 1,
      })),
    });
  }

  const nextItem: MenuItem = {
    ...item,
    components: fixedComponents,
    optionGroups: [...keptGroups, ...choiceGroups],
  };

  return options?.syncDescription === false ? nextItem : mergeItemDescriptionWithComponents(nextItem, true);
}

export type MealDealSlot = "side" | "drink";

export type MealDealItem = HubMealSideOption & { slot: MealDealSlot };

export function mealDealItemsFromTemplate(template: HubMealTemplate): MealDealItem[] {
  return [
    ...template.sides.map((side) => ({ ...side, slot: "side" as const })),
    ...template.drinks.map((drink) => ({ ...drink, slot: "drink" as const })),
  ];
}

export function splitMealDealItems(items: MealDealItem[]): { sides: HubMealSideOption[]; drinks: HubMealDrinkOption[] } {
  const sides: HubMealSideOption[] = [];
  const drinks: HubMealDrinkOption[] = [];
  for (const entry of items) {
    const { slot, ...option } = entry;
    if (slot === "drink") {
      drinks.push(option);
    } else {
      sides.push(option);
    }
  }
  return { sides, drinks };
}

export function getMealTemplateCustomerNote(item: MenuItem): string {
  const match = item.description?.match(MEAL_CFG_PREFIX);
  return match?.[2]?.trim() ?? "";
}
/** Default title customers see for the meal upgrade choice (editable per item). */
export const MEAL_CHOICE_GROUP_DEFAULT_NAME = "Make it a meal";
export const MEAL_ON_ITS_OWN_LABEL = "On its own";
/** @deprecated Legacy persisted name — still recognised when loading menus. */
export const MEAL_CHOICE_GROUP_NAME = "Meal choice";
const MEAL_CHOICE_MARKER = /^__HULL_MEAL_CHOICE__/;
const MEAL_TEMPLATE_MARKER = /^__HULL_MEAL_TEMPLATE:([a-zA-Z0-9-]+)__$/;

export function isMealChoiceGroup(group: MenuOptionGroup): boolean {
  if (MEAL_CHOICE_MARKER.test(group.description ?? "")) {
    return true;
  }
  const name = group.name.trim();
  return name === MEAL_CHOICE_GROUP_NAME || name === MEAL_CHOICE_GROUP_DEFAULT_NAME || /^make it a meal/i.test(name);
}

export function findMealChoiceGroup(item: MenuItem): MenuOptionGroup | null {
  return item.optionGroups.find((group) => isMealChoiceGroup(group)) ?? null;
}

export type HubMealSideOption = {
  id: string;
  label: string;
  priceDelta: number;
  /** When set, this choice is a real product from the live menu. */
  menuItemId?: string | null;
};
export type HubMealDrinkOption = HubMealSideOption;

export type PickableMenuProduct = {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  categoryName: string;
};

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
  menuSubGroup?: string;
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
    menuSubGroup: input.menuSubGroup?.trim() || undefined,
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

export type ComposeProductLine = "burger" | "kebab";

export type BurgerPartSlot = "bun" | "meat" | "salad";
export type KebabPartSlot = "bread" | "meat" | "salad";
/** Slot key stored on each part item — defaults plus `custom-*` groups businesses add. */
export type ComposePartSlot = string;

export type PartSlotDefinition = {
  id: string;
  key: ComposePartSlot;
  label: string;
};

export type HubMenuPart = {
  id: string;
  label: string;
  line: ComposeProductLine;
  slot: ComposePartSlot;
};

const PART_V2_PREFIX = /^__HULL_PART:(burger|kebab):([a-z0-9_-]+)__(?:\r?\n)?([\s\S]*)$/;
const PART_SLOTS_CFG_PREFIX = /^__HULL_PART_SLOTS:(burger|kebab):([\s\S]*?)__(?:\r?\n)?([\s\S]*)$/;
const PART_LEGACY_PREFIX = /^__HULL_PART_KIND:(bread|protein|salad|sauce|other)__(?:\r?\n)?([\s\S]*)$/;

const BURGER_SLOT_LABELS: Record<BurgerPartSlot, string> = {
  bun: "Buns",
  meat: "Meat",
  salad: "Salad",
};

const KEBAB_SLOT_LABELS: Record<KebabPartSlot, string> = {
  bread: "Bread / pitta / wrap",
  meat: "Meat",
  salad: "Salad",
};

const LEGACY_KIND_TO_BURGER_SLOT: Record<string, BurgerPartSlot> = {
  bread: "bun",
  protein: "meat",
  salad: "salad",
  sauce: "salad",
  other: "salad",
};

export function normalizeMenuIngredientLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isLabelListedAsExtra(label: string, extras: HubExtraTopping[]): boolean {
  const key = normalizeMenuIngredientLabel(label);
  if (!key) {
    return false;
  }
  return extras.some((extra) => normalizeMenuIngredientLabel(extra.label) === key);
}

export function filterPartsNotListedAsExtras(parts: HubMenuPart[], extras: HubExtraTopping[]): HubMenuPart[] {
  return parts.filter((part) => !isLabelListedAsExtra(part.label, extras));
}

export function encodePartLibraryItemDescription(line: ComposeProductLine, slot: ComposePartSlot, note = ""): string {
  const text = note.trim();
  return text ? `__HULL_PART:${line}:${slot}__\n${text}` : `__HULL_PART:${line}:${slot}__`;
}

export function decodePartLibraryItem(item: MenuItem, defaultLine: ComposeProductLine = "burger"): HubMenuPart {
  const v2 = item.description?.match(PART_V2_PREFIX);
  if (v2?.[1] && v2[2]) {
    return {
      id: item.id,
      label: item.name.trim(),
      line: v2[1] as ComposeProductLine,
      slot: v2[2] as ComposePartSlot,
    };
  }

  const legacy = item.description?.match(PART_LEGACY_PREFIX);
  const legacyKind = legacy?.[1] ?? "other";
  const line = defaultLine;
  const slot: ComposePartSlot =
    line === "burger"
      ? (LEGACY_KIND_TO_BURGER_SLOT[legacyKind] ?? "salad")
      : legacyKind === "bread"
        ? "bread"
        : legacyKind === "protein"
          ? "meat"
          : "salad";

  return {
    id: item.id,
    label: item.name.trim(),
    line,
    slot,
  };
}

export function defaultPartSlotDefinitions(line: ComposeProductLine): PartSlotDefinition[] {
  if (line === "burger") {
    return [
      { id: "slot-bun", key: "bun", label: BURGER_SLOT_LABELS.bun },
      { id: "slot-meat", key: "meat", label: BURGER_SLOT_LABELS.meat },
      { id: "slot-salad", key: "salad", label: BURGER_SLOT_LABELS.salad },
    ];
  }
  return [
    { id: "slot-bread", key: "bread", label: KEBAB_SLOT_LABELS.bread },
    { id: "slot-meat", key: "meat", label: KEBAB_SLOT_LABELS.meat },
    { id: "slot-salad", key: "salad", label: KEBAB_SLOT_LABELS.salad },
  ];
}

function parsePartSlotsPayload(raw: string): PartSlotDefinition[] {
  try {
    const parsed = JSON.parse(raw) as { slots?: unknown };
    if (!Array.isArray(parsed.slots)) {
      return [];
    }
    return parsed.slots
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const row = entry as { id?: string; key?: string; label?: string };
        const key = row.key?.trim();
        const label = row.label?.trim();
        if (!key || !label) {
          return null;
        }
        return {
          id: row.id ?? createMenuDraftId("slot-def"),
          key,
          label,
        };
      })
      .filter(Boolean) as PartSlotDefinition[];
  } catch {
    return [];
  }
}

function stripPartSlotsMarker(description: string): string {
  const match = description.trim().match(PART_SLOTS_CFG_PREFIX);
  if (!match) {
    return description.trim();
  }
  return (match[3] ?? "").trim();
}

function encodePartSlotsInDescription(line: ComposeProductLine, slots: PartSlotDefinition[], userNote = ""): string {
  const payload = JSON.stringify({ slots });
  const note = stripPartSlotsMarker(userNote.trim());
  const marker = `__HULL_PART_SLOTS:${line}:${payload}__`;
  return note ? `${marker}\n${note}` : marker;
}

export function readPartSlotDefinitions(section: HubMenuSection | null | undefined, line: ComposeProductLine): PartSlotDefinition[] {
  if (!section) {
    return defaultPartSlotDefinitions(line);
  }
  const decoded = decodeHubMenuCategoryDescription(section.description ?? "");
  const match = decoded.description.match(PART_SLOTS_CFG_PREFIX);
  if (match?.[2]) {
    const stored = parsePartSlotsPayload(match[2]);
    if (stored.length > 0) {
      return stored;
    }
  }
  return defaultPartSlotDefinitions(line);
}

export function writePartSlotDefinitions(
  section: HubMenuSection,
  line: ComposeProductLine,
  slots: PartSlotDefinition[],
): HubMenuSection {
  const decoded = decodeHubMenuCategoryDescription(section.description ?? "");
  const description = encodePartSlotsInDescription(line, slots, decoded.description);
  return {
    ...section,
    description: encodeHubMenuCategoryDescription(section.presetKey ?? null, description),
  };
}

export function addPartSlotDefinition(section: HubMenuSection, line: ComposeProductLine, label: string): HubMenuSection {
  const slots = readPartSlotDefinitions(section, line);
  const trimmed = label.trim() || "New group";
  const key = `custom-${createMenuDraftId("slot")}`;
  return writePartSlotDefinitions(section, line, [
    ...slots,
    { id: createMenuDraftId("slot-def"), key, label: trimmed },
  ]);
}

export function renamePartSlotDefinition(
  section: HubMenuSection,
  line: ComposeProductLine,
  slotKey: ComposePartSlot,
  label: string,
): HubMenuSection {
  const slots = readPartSlotDefinitions(section, line).map((slot) =>
    slot.key === slotKey ? { ...slot, label: label.trim() || slot.label } : slot,
  );
  return writePartSlotDefinitions(section, line, slots);
}

export function removePartSlotDefinition(
  section: HubMenuSection,
  line: ComposeProductLine,
  slotKey: ComposePartSlot,
): HubMenuSection {
  const slots = readPartSlotDefinitions(section, line).filter((slot) => slot.key !== slotKey);
  const nextSlots = slots.length > 0 ? slots : defaultPartSlotDefinitions(line);
  const withoutSlotItems = section.items.filter((item) => decodePartLibraryItem(item, line).slot !== slotKey);
  return {
    ...writePartSlotDefinitions(section, line, nextSlots),
    items: withoutSlotItems,
  };
}

export function partSlotLabel(
  line: ComposeProductLine,
  slot: ComposePartSlot,
  slotDefinitions?: PartSlotDefinition[],
): string {
  const fromConfig = slotDefinitions?.find((entry) => entry.key === slot)?.label;
  if (fromConfig) {
    return fromConfig;
  }
  if (line === "burger") {
    return BURGER_SLOT_LABELS[slot as BurgerPartSlot] ?? slot;
  }
  return KEBAB_SLOT_LABELS[slot as KebabPartSlot] ?? slot;
}

export function burgerPartSlots(section?: HubMenuSection | null): ComposePartSlot[] {
  return readPartSlotDefinitions(section, "burger").map((slot) => slot.key);
}

export function kebabPartSlots(section?: HubMenuSection | null): ComposePartSlot[] {
  return readPartSlotDefinitions(section, "kebab").map((slot) => slot.key);
}

export function formatPartSlotTabMeta(section: HubMenuSection | null | undefined, line: ComposeProductLine): string {
  const slots = readPartSlotDefinitions(section, line);
  if (slots.length === 0) {
    return line === "burger" ? "Buns, meat, salad" : "Bread, meat, salad";
  }
  return slots.map((slot) => slot.label).join(", ");
}

export function componentFromMenuPart(part: HubMenuPart, quantity = 1, removable = false): MenuComponent {
  return {
    id: part.id,
    label: part.label,
    quantity: Math.max(1, quantity),
    removable,
  };
}

export type CategoryItemBuilderMode = "pizza-sizes" | "burger-compose" | "kebab-compose" | "fixed-price";

export function getCategoryItemBuilderMode(section: HubMenuSection | null | undefined): CategoryItemBuilderMode {
  if (isHubMenuSectionPizza(section)) {
    return "pizza-sizes";
  }
  if (isHubMenuBurgerMenuCategory(section)) {
    return "burger-compose";
  }
  if (isHubMenuKebabMenuCategory(section)) {
    return "kebab-compose";
  }
  return "fixed-price";
}

export function isMealDealBundleItem(item: MenuItem): boolean {
  return item.optionGroups.some((group) =>
    [MEAL_BUNDLE_MAIN_GROUP, MEAL_BUNDLE_SIDE_GROUP, MEAL_BUNDLE_DRINK_GROUP].includes(group.name),
  );
}

export function describeCategoryItemBuilder(section: HubMenuSection | null | undefined): string {
  const mode = getCategoryItemBuilderMode(section);
  if (mode === "pizza-sizes") {
    return "Add the pizza name, then tick each size and set a price. Use choices for crust/base — not auto-added.";
  }
  if (mode === "burger-compose") {
    return "Set name and price, tick buns/meat/salad from Burger parts (left). Paid add-ons (cheese, onion…) come from Added extras on this item.";
  }
  if (mode === "kebab-compose") {
    return "Set name and price, tick bread/meat/salad from Kebab parts (left). Paid add-ons come from Added extras on this item.";
  }
  const key = section?.presetKey ?? "";
  if (key === "drinks" || key === "milkshakes" || key === "coffee") {
    return "Add sub-categories (Cans, Milkshakes…) in category settings, then one product per drink (Coke, Fanta…) each with its own photo and price — not as option names only.";
  }
  if (key === "chicken" || key === "starters" || key === "sides") {
    return "Set the portion price (e.g. 6 wings), then add flavour options (BBQ, Spicy…) with any extra £.";
  }
  if (isHubMenuMealDealsCategory(section)) {
    return "Set one bundle price, then pick items from your menu for main, side, and drink choices.";
  }
  return "Set name and price on each item. Add base, sauce, or crust under choices if needed.";
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
    for (const item of section.items) {
      if (!item.name.trim()) {
        issues.push("Every item needs a name.");
      }

      if (isHubMenuMealDealsCategory(section) && item.isActive) {
        const bundle = getMealDealBundleSelection(item);
        if (bundle.mainIds.length === 0 || bundle.sideIds.length === 0 || bundle.drinkIds.length === 0) {
          issues.push(`"${item.name.trim() || "Meal deal"}" needs at least one main, side, and drink from your menu.`);
        }
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
  subGroups: string[];
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

export function findSaucesLibrarySection(sections: HubMenuSection[]): HubMenuSection | null {
  return sections.find((section) => isHubMenuSaucesLibrarySection(section)) ?? null;
}

export function getHubSaucesFromSection(section: HubMenuSection | null): HubSauceOption[] {
  if (!section) {
    return [];
  }
  return section.items.map((item) => ({
    id: item.id,
    label: item.name.trim(),
    extraPrice: Number(item.price) || 0,
  }));
}

export function buildSaucesLibrarySection(): HubMenuSection {
  return {
    id: createMenuDraftId("section"),
    name: "Sauces",
    description: "Master sauce list — pick one included and optional paid extras per product.",
    presetKey: HUB_MENU_SAUCES_LIBRARY_PRESET,
    defaultPrice: 0,
    items: [],
  };
}

export function ensureSaucesLibrarySection(sections: HubMenuSection[]): HubMenuSection[] {
  if (findSaucesLibrarySection(sections)) {
    return sections;
  }
  const extrasIndex = sections.findIndex((section) => isHubMenuExtrasLibrarySection(section));
  const insertAt = extrasIndex >= 0 ? extrasIndex + 1 : 0;
  return [...sections.slice(0, insertAt), buildSaucesLibrarySection(), ...sections.slice(insertAt)];
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

export const MENU_BOARDS_CONFIG_ITEM_ID = "menu-boards-root";
const MENU_BOARDS_CFG_PREFIX = /^__HULL_MENU_BOARDS:([\s\S]*?)__(?:\r?\n)?([\s\S]*)$/;

export type HubMenuBoardKind = "standard" | "seasonal" | "alternative";
export type HubMenuBoardPublishMode = "replace" | "addon";

export type HubMenuBoardRecord = {
  id: string;
  name: string;
  kind: HubMenuBoardKind;
  publishMode: HubMenuBoardPublishMode;
  sections: HubMenuSection[];
  updatedAt: string;
};

export type HubMenuBoardsConfig = {
  mainSections: HubMenuSection[];
  boards: HubMenuBoardRecord[];
};

export function defaultHubMenuBoardsConfig(sections: HubMenuSection[]): HubMenuBoardsConfig {
  return {
    mainSections: cloneCustomerMenuSections(customerFacingMenuSections(sections)),
    boards: [],
  };
}

export function cloneCustomerMenuSections(sections: HubMenuSection[]): HubMenuSection[] {
  return JSON.parse(JSON.stringify(sections)) as HubMenuSection[];
}

export function findMenuBoardsConfigSection(sections: HubMenuSection[]): HubMenuSection | null {
  return sections.find((section) => isHubMenuMenuBoardsConfigSection(section)) ?? null;
}

function parseMenuBoardsPayload(raw: string): HubMenuBoardsConfig | null {
  try {
    const parsed = JSON.parse(raw) as Partial<HubMenuBoardsConfig>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return {
      mainSections: Array.isArray(parsed.mainSections) ? (parsed.mainSections as HubMenuSection[]) : [],
      boards: Array.isArray(parsed.boards) ? (parsed.boards as HubMenuBoardRecord[]) : [],
    };
  } catch {
    return null;
  }
}

export function encodeMenuBoardsConfig(config: HubMenuBoardsConfig): string {
  const payload = JSON.stringify({
    mainSections: config.mainSections,
    boards: config.boards,
  });
  return `__HULL_MENU_BOARDS:${payload}__`;
}

export function readMenuBoardsConfig(sections: HubMenuSection[]): HubMenuBoardsConfig {
  const section = findMenuBoardsConfigSection(sections);
  const item = section?.items.find((entry) => entry.id === MENU_BOARDS_CONFIG_ITEM_ID);
  const match = item?.description?.match(MENU_BOARDS_CFG_PREFIX);
  if (match?.[1]) {
    const parsed = parseMenuBoardsPayload(match[1]);
    if (parsed) {
      if (parsed.mainSections.length === 0) {
        return { ...parsed, mainSections: cloneCustomerMenuSections(customerFacingMenuSections(sections)) };
      }
      return parsed;
    }
  }
  return defaultHubMenuBoardsConfig(sections);
}

export function writeMenuBoardsConfig(sections: HubMenuSection[], config: HubMenuBoardsConfig): HubMenuSection[] {
  const encoded = encodeMenuBoardsConfig(config);
  const existing = findMenuBoardsConfigSection(sections);
  if (!existing) {
    return sections;
  }
  const configItem =
    existing.items.find((entry) => entry.id === MENU_BOARDS_CONFIG_ITEM_ID) ??
    buildLocalMenuItem({
      categoryId: existing.id,
      name: "Menu boards data",
      description: encoded,
      price: 0,
      requiresIdVerification: false,
      isActive: false,
      components: [],
      optionGroups: [],
    });

  return sections.map((section) =>
    section.id === existing.id
      ? {
          ...section,
          items: [
            {
              ...configItem,
              description: encoded,
            },
          ],
        }
      : section,
  );
}

export function buildMenuBoardsConfigSection(): HubMenuSection {
  const sectionId = createMenuDraftId("section");
  return {
    id: sectionId,
    name: "Menu boards",
    description: "Draft seasonal and alternative menus.",
    presetKey: HUB_MENU_BOARDS_PRESET,
    defaultPrice: 0,
    items: [
      buildLocalMenuItem({
        categoryId: sectionId,
        name: "Menu boards data",
        description: encodeMenuBoardsConfig({ mainSections: [], boards: [] }),
        price: 0,
        requiresIdVerification: false,
        isActive: false,
        components: [],
        optionGroups: [],
      }),
    ],
  };
}

export function ensureMenuBoardsConfigSection(sections: HubMenuSection[]): HubMenuSection[] {
  if (findMenuBoardsConfigSection(sections)) {
    return sections;
  }
  return [...sections, buildMenuBoardsConfigSection()];
}

export function createHubMenuBoard(
  kind: HubMenuBoardKind,
  sourceSections: HubMenuSection[],
  publishMode: HubMenuBoardPublishMode = "addon",
): HubMenuBoardRecord {
  const labels: Record<HubMenuBoardKind, string> = {
    standard: "New menu",
    seasonal: "Seasonal menu",
    alternative: "Alternative menu",
  };
  return {
    id: createMenuDraftId("board"),
    name: labels[kind],
    kind,
    publishMode,
    sections: cloneCustomerMenuSections(sourceSections),
    updatedAt: new Date().toISOString(),
  };
}

export function replaceCustomerMenuSections(
  sections: HubMenuSection[],
  customerSections: HubMenuSection[],
): HubMenuSection[] {
  const staff = staffMenuSections(sections);
  return sortMenuSectionsForStudio([...staff, ...customerSections]);
}

export function flushMenuBoardDraft(sections: HubMenuSection[], editingBoardId: string | null): HubMenuSection[] {
  const config = readMenuBoardsConfig(sections);
  const customer = cloneCustomerMenuSections(customerFacingMenuSections(sections));
  const nextConfig: HubMenuBoardsConfig = editingBoardId
    ? {
        ...config,
        boards: config.boards.map((board) =>
          board.id === editingBoardId ? { ...board, sections: customer, updatedAt: new Date().toISOString() } : board,
        ),
      }
    : { ...config, mainSections: customer };
  return writeMenuBoardsConfig(sections, nextConfig);
}

export function switchToMainMenu(sections: HubMenuSection[], editingBoardId: string | null): HubMenuSection[] {
  const flushed = flushMenuBoardDraft(sections, editingBoardId);
  const config = readMenuBoardsConfig(flushed);
  return replaceCustomerMenuSections(flushed, config.mainSections);
}

export function switchToMenuBoard(
  sections: HubMenuSection[],
  editingBoardId: string | null,
  targetBoardId: string,
): HubMenuSection[] {
  const flushed = flushMenuBoardDraft(sections, editingBoardId);
  const config = readMenuBoardsConfig(flushed);
  const board = config.boards.find((entry) => entry.id === targetBoardId);
  if (!board) {
    return flushed;
  }
  return replaceCustomerMenuSections(flushed, board.sections);
}

export function appendMenuBoard(
  sections: HubMenuSection[],
  editingBoardId: string | null,
  kind: HubMenuBoardKind,
): { sections: HubMenuSection[]; boardId: string } {
  const flushed = flushMenuBoardDraft(sections, editingBoardId);
  const config = readMenuBoardsConfig(flushed);
  const source = editingBoardId
    ? (config.boards.find((board) => board.id === editingBoardId)?.sections ?? config.mainSections)
    : customerFacingMenuSections(flushed);
  const board = createHubMenuBoard(kind, source.length > 0 ? source : config.mainSections);
  const nextConfig: HubMenuBoardsConfig = { ...config, boards: [...config.boards, board] };
  const next = replaceCustomerMenuSections(writeMenuBoardsConfig(flushed, nextConfig), board.sections);
  return { sections: next, boardId: board.id };
}

export function updateMenuBoardInConfig(
  sections: HubMenuSection[],
  boardId: string,
  patch: Partial<Pick<HubMenuBoardRecord, "name" | "publishMode">>,
): HubMenuSection[] {
  const config = readMenuBoardsConfig(sections);
  return writeMenuBoardsConfig(sections, {
    ...config,
    boards: config.boards.map((board) => (board.id === boardId ? { ...board, ...patch, updatedAt: new Date().toISOString() } : board)),
  });
}

export function applyMenuBoardPublish(
  sections: HubMenuSection[],
  boardId: string,
  editingBoardId: string | null,
): HubMenuSection[] {
  const flushed = flushMenuBoardDraft(sections, editingBoardId);
  const config = readMenuBoardsConfig(flushed);
  const board = config.boards.find((entry) => entry.id === boardId);
  if (!board) {
    return flushed;
  }

  const main = config.mainSections.length > 0 ? config.mainSections : customerFacingMenuSections(flushed);
  let nextMain: HubMenuSection[];

  if (board.publishMode === "replace") {
    nextMain = cloneCustomerMenuSections(board.sections);
  } else {
    const prefix = board.name.trim() ? `${board.name.trim()} · ` : "";
    const addonSections = board.sections.map((section) => {
      const sectionId = createMenuDraftId("section");
      return {
        ...section,
        id: sectionId,
        name: prefix + section.name.trim(),
        items: section.items.map((item) => ({
          ...item,
          id: createMenuDraftId("item"),
          categoryId: sectionId,
        })),
      };
    });
    nextMain = [...cloneCustomerMenuSections(main), ...addonSections];
  }

  const nextConfig: HubMenuBoardsConfig = {
    mainSections: nextMain,
    boards: config.boards.map((entry) =>
      entry.id === board.id
        ? { ...entry, sections: cloneCustomerMenuSections(board.sections), updatedAt: new Date().toISOString() }
        : entry,
    ),
  };

  let next = replaceCustomerMenuSections(flushed, nextMain);
  next = writeMenuBoardsConfig(next, nextConfig);
  return next;
}

export const MEAL_BUNDLE_MAIN_GROUP = "Main (pick one)";
export const MEAL_BUNDLE_SIDE_GROUP = "Side (pick one)";
export const MEAL_BUNDLE_DRINK_GROUP = "Drink (pick one)";
const MEAL_BUNDLE_ITEM_REF = /^__HULL_MENU_ITEM_REF:([a-zA-Z0-9_-]+)__$/;

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

function mealBundleGroupName(slot: MealDealBundleSlot): string {
  if (slot === "main") {
    return MEAL_BUNDLE_MAIN_GROUP;
  }
  if (slot === "side") {
    return MEAL_BUNDLE_SIDE_GROUP;
  }
  return MEAL_BUNDLE_DRINK_GROUP;
}

export function getMealDealBundleSelection(item: MenuItem): MealDealBundleSelection {
  const readSlot = (slot: MealDealBundleSlot) => {
    const group = item.optionGroups.find((entry) => entry.name === mealBundleGroupName(slot));
    if (!group) {
      return [] as string[];
    }
    return group.options
      .map((option) => decodeMealBundleMenuItemId(option.description) ?? option.id)
      .filter(Boolean);
  };
  return {
    mainIds: readSlot("main"),
    sideIds: readSlot("side"),
    drinkIds: readSlot("drink"),
  };
}

export function buildMealDealBundleOptionGroups(
  selection: MealDealBundleSelection,
  menuProducts: PickableMenuProduct[],
): MenuItem["optionGroups"] {
  const productsById = new Map(menuProducts.map((product) => [product.id, product]));

  const buildGroup = (slot: MealDealBundleSlot, ids: string[], required: boolean): MenuItem["optionGroups"][number] | null => {
    const options = ids
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
      id: createMenuDraftId("group"),
      name: mealBundleGroupName(slot),
      description: "",
      selectionMode: "single" as const,
      isRequired: required,
      minSelections: required ? 1 : 0,
      maxSelections: 1,
      showWhenValueIds: [],
      options,
    };
  };

  return [
    buildGroup("main", selection.mainIds, true),
    buildGroup("side", selection.sideIds, true),
    buildGroup("drink", selection.drinkIds, true),
  ].filter(Boolean) as MenuItem["optionGroups"];
}

export function applyMealDealBundleToItem(
  item: MenuItem,
  selection: MealDealBundleSelection,
  menuProducts: PickableMenuProduct[],
): MenuItem {
  const withoutBundle = item.optionGroups.filter(
    (group) => ![MEAL_BUNDLE_MAIN_GROUP, MEAL_BUNDLE_SIDE_GROUP, MEAL_BUNDLE_DRINK_GROUP].includes(group.name),
  );
  const bundleGroups = buildMealDealBundleOptionGroups(selection, menuProducts);
  return { ...item, optionGroups: [...withoutBundle, ...bundleGroups] };
}

export function createEmptyMealDealBundleSelection(): MealDealBundleSelection {
  return { mainIds: [], sideIds: [], drinkIds: [] };
}

export function findBurgerPartsSection(sections: HubMenuSection[]): HubMenuSection | null {
  return sections.find((section) => isHubMenuBurgerPartsSection(section)) ?? null;
}

export function findKebabPartsSection(sections: HubMenuSection[]): HubMenuSection | null {
  return sections.find((section) => isHubMenuKebabPartsSection(section)) ?? null;
}

/** @deprecated Use findBurgerPartsSection */
export function findBurgerKebabPartsSection(sections: HubMenuSection[]): HubMenuSection | null {
  return sections.find((section) => isHubMenuBurgerKebabPartsSection(section)) ?? null;
}

export function getHubPartsFromSection(
  section: HubMenuSection | null,
  defaultLine: ComposeProductLine = "burger",
): HubMenuPart[] {
  if (!section) {
    return [];
  }
  return section.items
    .map((item) => decodePartLibraryItem(item, defaultLine))
    .filter((part) => part.label.length > 0);
}

export function buildBurgerPartsLibrarySection(): HubMenuSection {
  return {
    id: createMenuDraftId("section"),
    name: "Burger parts",
    description: "Buns, meat, and salad for burgers — not sold on their own.",
    presetKey: HUB_MENU_BURGER_PARTS_PRESET,
    defaultPrice: 0,
    items: [],
  };
}

export function buildKebabPartsLibrarySection(): HubMenuSection {
  return {
    id: createMenuDraftId("section"),
    name: "Kebab parts",
    description: "Bread, meat, and salad for kebabs — not sold on their own.",
    presetKey: HUB_MENU_KEBAB_PARTS_PRESET,
    defaultPrice: 0,
    items: [],
  };
}

function migrateLegacyBurgerKebabPartsSection(sections: HubMenuSection[]): HubMenuSection[] {
  const legacy = findBurgerKebabPartsSection(sections);
  if (!legacy) {
    return sections;
  }

  let next = sections.filter((section) => section.id !== legacy.id);
  if (!findBurgerPartsSection(next)) {
    const burger = buildBurgerPartsLibrarySection();
    burger.items = legacy.items.map((item) => {
      const part = decodePartLibraryItem(item, "burger");
      return {
        ...item,
        categoryId: burger.id,
        description: encodePartLibraryItemDescription("burger", part.slot),
      };
    });
    next = [...next, burger];
  }
  if (!findKebabPartsSection(next)) {
    next = [...next, buildKebabPartsLibrarySection()];
  }
  return next;
}

export function ensureBurgerKebabPartsSections(sections: HubMenuSection[]): HubMenuSection[] {
  let next = migrateLegacyBurgerKebabPartsSection(sections);
  const extrasIndex = next.findIndex((section) => isHubMenuExtrasLibrarySection(section));
  const insertAt = extrasIndex >= 0 ? extrasIndex + 1 : 0;

  if (!findBurgerPartsSection(next)) {
    next = [...next.slice(0, insertAt), buildBurgerPartsLibrarySection(), ...next.slice(insertAt)];
  }
  if (!findKebabPartsSection(next)) {
    const burgerIndex = next.findIndex((section) => isHubMenuBurgerPartsSection(section));
    const kebabInsert = burgerIndex >= 0 ? burgerIndex + 1 : insertAt;
    next = [...next.slice(0, kebabInsert), buildKebabPartsLibrarySection(), ...next.slice(kebabInsert)];
  }
  return next;
}

export function ensureStaffMenuSections(sections: HubMenuSection[]): HubMenuSection[] {
  return sortMenuSectionsForStudio(
    ensureMenuBoardsConfigSection(
      ensureMealLibrarySection(ensureBurgerKebabPartsSections(ensureSaucesLibrarySection(ensureExtrasLibrarySection(sections)))),
    ),
  );
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
      const row = entry as { id?: string; label?: string; priceDelta?: number; menuItemId?: string | null };
      return row.label?.trim()
        ? {
            id: row.id ?? createMenuDraftId(idPrefix),
            label: row.label.trim(),
            priceDelta: Number(row.priceDelta) || 0,
            menuItemId: row.menuItemId ?? null,
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
    sides,
    drinks,
  };
}

export function listPickableMenuProducts(sections: HubMenuSection[]): PickableMenuProduct[] {
  const products: PickableMenuProduct[] = [];

  for (const section of customerFacingMenuSections(sections)) {
    for (const item of section.items) {
      if (getMenuAvailabilityMode(item) === "hidden") {
        continue;
      }
      const name = item.name.trim();
      if (!name) {
        continue;
      }
      products.push({
        id: item.id,
        name,
        price: Number(item.price) || 0,
        categoryId: section.id,
        categoryName: section.name.trim(),
      });
    }
  }

  return products;
}

export function mealOptionFromMenuProduct(product: PickableMenuProduct): HubMealSideOption {
  return {
    id: product.id,
    menuItemId: product.id,
    label: product.name,
    priceDelta: 0,
  };
}

export function createMealCustomOption(
  label: string,
  priceDelta: number,
  kind: "side" | "drink",
): HubMealSideOption {
  return {
    id: createMenuDraftId(kind === "side" ? "meal-side" : "meal-drink"),
    label: label.trim(),
    priceDelta: Number.isFinite(priceDelta) && priceDelta >= 0 ? priceDelta : 0,
    menuItemId: null,
  };
}

export function resolveMealOptionsWithMenu(
  options: HubMealSideOption[],
  products: PickableMenuProduct[],
): HubMealSideOption[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  return options.map((option) => {
    const menuItemId = option.menuItemId ?? null;
    if (!menuItemId) {
      return option;
    }
    const product = byId.get(menuItemId);
    if (!product) {
      return option;
    }
    return {
      ...option,
      id: option.id || product.id,
      label: product.name,
    };
  });
}

export function getHubMealTemplatesFromSection(
  section: HubMenuSection | null,
  allSections: HubMenuSection[] = [],
): HubMealTemplate[] {
  if (!section) {
    return [];
  }
  const menuProducts = listPickableMenuProducts(allSections);

  return section.items.map((item) => {
    const { sides, drinks } = readMealTemplateConfig(item);
    const resolvedSides = resolveMealOptionsWithMenu(sides, menuProducts);
    const resolvedDrinks = resolveMealOptionsWithMenu(drinks, menuProducts);
    return {
      id: item.id,
      label: item.name.trim(),
      upgradePrice: Number(item.price) || 0,
      sides: resolvedSides,
      drinks: resolvedDrinks,
    };
  });
}

export function buildPartLibraryItem(input: {
  categoryId: string;
  label: string;
  line: ComposeProductLine;
  slot: ComposePartSlot;
}): MenuItem {
  return buildLocalMenuItem({
    categoryId: input.categoryId,
    name: input.label.trim(),
    description: encodePartLibraryItemDescription(input.line, input.slot),
    price: 0,
    requiresIdVerification: false,
    isActive: true,
    components: [],
    optionGroups: [],
  });
}

export function renamePartLibraryItem(section: HubMenuSection, itemId: string, label: string): HubMenuSection {
  const trimmed = label.trim();
  if (!trimmed) {
    return section;
  }

  return {
    ...section,
    items: section.items.map((item) => (item.id === itemId ? { ...item, name: trimmed } : item)),
  };
}

export function buildMealLibraryItem(input: {
  categoryId: string;
  label: string;
  upgradePrice: number;
  sides?: HubMealSideOption[];
  drinks?: HubMealDrinkOption[];
  customerNote?: string;
}): MenuItem {
  const sides = input.sides ?? [];
  const drinks = input.drinks ?? [];

  return buildLocalMenuItem({
    categoryId: input.categoryId,
    name: input.label.trim(),
    description: encodeMealLibraryItemDescription(sides, drinks, input.customerNote?.trim() ?? ""),
    price: input.upgradePrice,
    requiresIdVerification: false,
    isActive: true,
    components: [],
    optionGroups: [],
  });
}

export function updateMealLibraryItemTemplate(
  item: MenuItem,
  patch: Partial<Pick<HubMealTemplate, "label" | "upgradePrice" | "sides" | "drinks">> & { customerNote?: string },
): MenuItem {
  const current = readMealTemplateConfig(item);
  const sides = patch.sides ?? current.sides;
  const drinks = patch.drinks ?? current.drinks;
  const userNote =
    patch.customerNote !== undefined ? patch.customerNote : getMealTemplateCustomerNote(item);

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
  const sauces = staff.find((section) => isHubMenuSaucesLibrarySection(section));
  const burgerParts = staff.find((section) => isHubMenuBurgerPartsSection(section));
  const kebabParts = staff.find((section) => isHubMenuKebabPartsSection(section));
  const meals = staff.find((section) => isHubMenuMealLibrarySection(section));
  const boards = staff.find((section) => isHubMenuMenuBoardsConfigSection(section));
  const otherStaff = staff.filter(
    (section) =>
      !isHubMenuExtrasLibrarySection(section) &&
      !isHubMenuSaucesLibrarySection(section) &&
      !isHubMenuMealLibrarySection(section) &&
      !isHubMenuBurgerPartsSection(section) &&
      !isHubMenuKebabPartsSection(section) &&
      !isHubMenuBurgerKebabPartsSection(section) &&
      !isHubMenuMenuBoardsConfigSection(section),
  );
  const customer = customerFacingMenuSections(sections);
  return [...[extras, sauces, burgerParts, kebabParts, meals, boards].filter(Boolean), ...otherStaff, ...customer] as HubMenuSection[];
}

export function getItemExtraToppingSelection(item: MenuItem): {
  enabled: boolean;
  selectedIds: Set<string>;
  priceById: Map<string, number>;
  includedQtyById: Map<string, number>;
} {
  const group = findExtrasToppingsGroup(item);
  if (!group) {
    return { enabled: false, selectedIds: new Set(), priceById: new Map(), includedQtyById: new Map() };
  }
  const priceById = new Map<string, number>();
  const includedQtyById = new Map<string, number>();
  for (const option of group.options) {
    priceById.set(option.id, option.priceDelta);
    includedQtyById.set(option.id, parseExtraIncludedQuantity(option.description));
  }
  return {
    enabled: true,
    selectedIds: new Set(group.options.map((option) => option.id)),
    priceById,
    includedQtyById,
  };
}

export function applyExtraToppingsToItem(
  item: MenuItem,
  enabled: boolean,
  toppings: HubExtraTopping[],
  selectedIds: Set<string>,
  priceById: Map<string, number>,
  includedQtyById: Map<string, number> = new Map(),
): MenuItem {
  const withoutExtras = item.optionGroups.filter((group) => !isExtrasToppingsGroup(group));
  if (!enabled || selectedIds.size === 0) {
    return { ...item, optionGroups: withoutExtras };
  }

  const options = toppings
    .filter((topping) => selectedIds.has(topping.id))
    .map((topping) => {
      const includedQty = Math.max(0, includedQtyById.get(topping.id) ?? 0);
      return {
        id: topping.id,
        label: topping.label,
        description: encodeExtraIncludedQuantity(includedQty),
        priceDelta: priceById.get(topping.id) ?? topping.price,
        isDefault: includedQty > 0,
        maxQuantity: 8,
      };
    });

  if (options.length === 0) {
    return { ...item, optionGroups: withoutExtras };
  }

  const existingTitle = findExtrasToppingsGroup(item)?.name ?? EXTRAS_TOPPINGS_GROUP_NAME;

  return {
    ...item,
    optionGroups: [
      ...withoutExtras,
      {
        id: createMenuDraftId("group"),
        name: existingTitle,
        description: "__HULL_EXTRAS__",
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

export function getItemSauceSelection(item: MenuItem): {
  enabled: boolean;
  includedIds: Set<string>;
  extraEnabled: boolean;
  extraIds: Set<string>;
  extraPriceById: Map<string, number>;
} {
  const includedGroup = findSaucesIncludedGroup(item);
  if (!includedGroup) {
    return { enabled: false, includedIds: new Set(), extraEnabled: false, extraIds: new Set(), extraPriceById: new Map() };
  }

  const extraGroup = findSaucesExtraGroup(item);
  const extraPriceById = new Map<string, number>();
  for (const option of extraGroup?.options ?? []) {
    extraPriceById.set(option.id, option.priceDelta);
  }

  return {
    enabled: true,
    includedIds: new Set(includedGroup.options.map((option) => option.id)),
    extraEnabled: Boolean(extraGroup),
    extraIds: new Set(extraGroup?.options.map((option) => option.id) ?? []),
    extraPriceById,
  };
}

export function applySaucesToItem(
  item: MenuItem,
  enabled: boolean,
  sauces: HubSauceOption[],
  includedIds: Set<string>,
  extraEnabled: boolean,
  extraIds: Set<string>,
  extraPriceById: Map<string, number>,
): MenuItem {
  const withoutSauces = item.optionGroups.filter((group) => !isAnySaucesGroup(group));
  if (!enabled || includedIds.size === 0) {
    return { ...item, optionGroups: withoutSauces };
  }

  const includedOptions = sauces
    .filter((sauce) => includedIds.has(sauce.id))
    .map((sauce, index) => ({
      id: sauce.id,
      label: sauce.label,
      description: "",
      priceDelta: 0,
      isDefault: index === 0,
      maxQuantity: 1,
    }));

  if (includedOptions.length === 0) {
    return { ...item, optionGroups: withoutSauces };
  }

  const existingIncluded = findSaucesIncludedGroup(item);
  const groups: MenuOptionGroup[] = [
    ...withoutSauces,
    {
      id: existingIncluded?.id ?? createMenuDraftId("group"),
      name: existingIncluded?.name.trim() || SAUCES_INCLUDED_GROUP_NAME,
      description: "__HULL_SAUCES_INCLUDED__",
      selectionMode: "single",
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      showWhenValueIds: [],
      options: includedOptions,
    },
  ];

  if (extraEnabled && extraIds.size > 0) {
    const extraOptions = sauces
      .filter((sauce) => extraIds.has(sauce.id))
      .map((sauce) => ({
        id: sauce.id,
        label: sauce.label,
        description: "",
        priceDelta: extraPriceById.get(sauce.id) ?? sauce.extraPrice,
        isDefault: false,
        maxQuantity: 1,
      }));

    if (extraOptions.length > 0) {
      const existingExtra = findSaucesExtraGroup(item);
      groups.push({
        id: existingExtra?.id ?? createMenuDraftId("group"),
        name: existingExtra?.name.trim() || SAUCES_EXTRA_GROUP_NAME,
        description: "__HULL_SAUCES_EXTRA__",
        selectionMode: "multiple",
        isRequired: false,
        minSelections: 0,
        maxSelections: null,
        showWhenValueIds: [],
        options: extraOptions,
      });
    }
  }

  return { ...item, optionGroups: groups };
}

export function updateSaucesIncludedGroupTitle(item: MenuItem, title: string): MenuItem {
  const group = findSaucesIncludedGroup(item);
  if (!group) {
    return item;
  }
  return updateItemOptionGroup(item, group.id, { name: title.trim() || SAUCES_INCLUDED_GROUP_NAME });
}

export function updateSaucesExtraGroupTitle(item: MenuItem, title: string): MenuItem {
  const group = findSaucesExtraGroup(item);
  if (!group) {
    return item;
  }
  return updateItemOptionGroup(item, group.id, { name: title.trim() || SAUCES_EXTRA_GROUP_NAME });
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

export type ItemOptionBlockKind = "extras" | "sauces" | "meal" | "custom" | "pizza_sizes" | "meal_bundle" | "crust";

export type ItemOptionBlock = {
  id: string;
  kind: ItemOptionBlockKind;
  label: string;
  groupIds: string[];
  canReorder: boolean;
  canRemove: boolean;
};

function isPizzaSizeOptionGroupName(group: MenuOptionGroup): boolean {
  return group.isRequired && /size/i.test(group.name);
}

function isMealBundleOptionGroupName(name: string): boolean {
  return name === MEAL_BUNDLE_MAIN_GROUP || name === MEAL_BUNDLE_SIDE_GROUP || name === MEAL_BUNDLE_DRINK_GROUP;
}

function isMealFollowOnGroup(group: MenuOptionGroup, mealYesIds: Set<string>): boolean {
  return group.showWhenValueIds.some((id) => mealYesIds.has(id) || id.includes("-meal-yes"));
}

function collectMealCluster(groups: MenuOptionGroup[], startIndex: number): { cluster: MenuOptionGroup[]; endIndex: number } {
  const mealGroup = groups[startIndex];
  if (!mealGroup) {
    return { cluster: [], endIndex: startIndex };
  }
  const mealYesIds = new Set(mealGroup.options.filter((option) => option.id.includes("-meal-yes")).map((option) => option.id));
  const cluster = [mealGroup];
  let index = startIndex + 1;
  while (index < groups.length) {
    const group = groups[index];
    if (!group || !isMealFollowOnGroup(group, mealYesIds)) {
      break;
    }
    cluster.push(group);
    index += 1;
  }
  return { cluster, endIndex: index };
}

export function listItemOptionBlocks(item: MenuItem): ItemOptionBlock[] {
  const blocks: ItemOptionBlock[] = [];
  const groups = item.optionGroups;
  let index = 0;

  while (index < groups.length) {
    const group = groups[index];
    if (!group) {
      index += 1;
      continue;
    }

    if (isExtrasToppingsGroup(group)) {
      blocks.push({
        id: `block-extras-${group.id}`,
        kind: "extras",
        label: group.name.trim() || EXTRAS_TOPPINGS_GROUP_NAME,
        groupIds: [group.id],
        canReorder: true,
        canRemove: true,
      });
      index += 1;
      continue;
    }

    if (isSaucesIncludedGroup(group)) {
      const cluster = [group];
      const next = groups[index + 1];
      if (next && isSaucesExtraGroup(next)) {
        cluster.push(next);
        index += 2;
      } else {
        index += 1;
      }
      blocks.push({
        id: `block-sauces-${cluster[0]?.id ?? group.id}`,
        kind: "sauces",
        label: cluster[0]?.name.trim() || SAUCES_INCLUDED_GROUP_NAME,
        groupIds: cluster.map((entry) => entry.id),
        canReorder: true,
        canRemove: true,
      });
      continue;
    }

    if (isSaucesExtraGroup(group)) {
      blocks.push({
        id: `block-sauces-extra-${group.id}`,
        kind: "sauces",
        label: group.name.trim() || SAUCES_EXTRA_GROUP_NAME,
        groupIds: [group.id],
        canReorder: true,
        canRemove: true,
      });
      index += 1;
      continue;
    }

    if (isPartChoiceOptionGroup(group)) {
      blocks.push({
        id: `block-part-choice-${group.id}`,
        kind: "custom",
        label: `${group.name.trim()} (from parts)`,
        groupIds: [group.id],
        canReorder: true,
        canRemove: false,
      });
      index += 1;
      continue;
    }

    if (isMealChoiceGroup(group)) {
      const { cluster, endIndex } = collectMealCluster(groups, index);
      blocks.push({
        id: `block-meal-${cluster[0]?.id ?? group.id}`,
        kind: "meal",
        label: group.name.trim() || MEAL_CHOICE_GROUP_DEFAULT_NAME,
        groupIds: cluster.map((entry) => entry.id),
        canReorder: true,
        canRemove: true,
      });
      index = endIndex;
      continue;
    }

    if (isMealBundleOptionGroupName(group.name)) {
      const bundleIds: string[] = [];
      while (index < groups.length && groups[index] && isMealBundleOptionGroupName(groups[index]!.name)) {
        bundleIds.push(groups[index]!.id);
        index += 1;
      }
      blocks.push({
        id: `block-meal-bundle-${bundleIds[0] ?? group.id}`,
        kind: "meal_bundle",
        label: "Meal deal choices",
        groupIds: bundleIds,
        canReorder: false,
        canRemove: false,
      });
      continue;
    }

    if (isPizzaSizeOptionGroupName(group)) {
      blocks.push({
        id: `block-pizza-size-${group.id}`,
        kind: "pizza_sizes",
        label: group.name.trim() || "Pizza sizes",
        groupIds: [group.id],
        canReorder: false,
        canRemove: false,
      });
      index += 1;
      continue;
    }

    if (/^Crust \(/i.test(group.name)) {
      blocks.push({
        id: `block-crust-${group.id}`,
        kind: "crust",
        label: group.name.trim(),
        groupIds: [group.id],
        canReorder: false,
        canRemove: false,
      });
      index += 1;
      continue;
    }

    blocks.push({
      id: `block-custom-${group.id}`,
      kind: "custom",
      label: group.name.trim() || "Customer choice",
      groupIds: [group.id],
      canReorder: true,
      canRemove: true,
    });
    index += 1;
  }

  return blocks;
}

export function flattenItemOptionBlocks(item: MenuItem, blocks: ItemOptionBlock[]): MenuItem {
  const groupsById = new Map(item.optionGroups.map((group) => [group.id, group]));
  const ordered: MenuOptionGroup[] = [];

  for (const block of blocks) {
    for (const groupId of block.groupIds) {
      const group = groupsById.get(groupId);
      if (group) {
        ordered.push(group);
      }
    }
  }

  for (const group of item.optionGroups) {
    if (!ordered.some((entry) => entry.id === group.id)) {
      ordered.push(group);
    }
  }

  return { ...item, optionGroups: ordered };
}

export function reorderItemOptionBlocks(item: MenuItem, fromIndex: number, toIndex: number): MenuItem {
  const blocks = listItemOptionBlocks(item);
  const reorderable = blocks.filter((block) => block.canReorder);

  const fromBlock = reorderable[fromIndex];
  if (!fromBlock) {
    return item;
  }

  const reorderableNext = [...reorderable];
  const [moved] = reorderableNext.splice(fromIndex, 1);
  if (!moved) {
    return item;
  }
  const clampedTo = Math.max(0, Math.min(toIndex, reorderableNext.length));
  reorderableNext.splice(clampedTo, 0, moved);

  const merged: ItemOptionBlock[] = [];
  let reorderCursor = 0;
  for (const block of blocks) {
    if (!block.canReorder) {
      merged.push(block);
    } else {
      const next = reorderableNext[reorderCursor];
      if (next) {
        merged.push(next);
      }
      reorderCursor += 1;
    }
  }

  return flattenItemOptionBlocks(item, merged);
}

export function removeItemOptionBlock(item: MenuItem, blockId: string): MenuItem {
  const block = listItemOptionBlocks(item).find((entry) => entry.id === blockId);
  if (!block) {
    return item;
  }
  const removeIds = new Set(block.groupIds);
  return {
    ...item,
    optionGroups: item.optionGroups.filter((group) => !removeIds.has(group.id)),
  };
}

export function updateItemOptionGroup(
  item: MenuItem,
  groupId: string,
  patch: Partial<MenuOptionGroup>,
): MenuItem {
  return {
    ...item,
    optionGroups: item.optionGroups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)),
  };
}

export function updateItemOptionInGroup(
  item: MenuItem,
  groupId: string,
  optionId: string,
  patch: Partial<MenuOption>,
): MenuItem {
  return {
    ...item,
    optionGroups: item.optionGroups.map((group) =>
      group.id === groupId
        ? {
            ...group,
            options: group.options.map((option) => (option.id === optionId ? { ...option, ...patch } : option)),
          }
        : group,
    ),
  };
}

export function addItemCustomOptionGroup(item: MenuItem, title = "New choice"): MenuItem {
  const group = createEmptyOptionGroup();
  group.name = title;
  return { ...item, optionGroups: [...item.optionGroups, group] };
}

export function addItemOptionToGroup(item: MenuItem, groupId: string): MenuItem {
  return {
    ...item,
    optionGroups: item.optionGroups.map((group) =>
      group.id === groupId ? { ...group, options: [...group.options, createEmptyOption()] } : group,
    ),
  };
}

export function removeItemOptionFromGroup(item: MenuItem, groupId: string, optionId: string): MenuItem {
  return {
    ...item,
    optionGroups: item.optionGroups.map((group) =>
      group.id === groupId ? { ...group, options: group.options.filter((option) => option.id !== optionId) } : group,
    ),
  };
}

/** Customer-facing categories from the current draft (hidden items omitted, order preserved). */
export function buildMenuPreviewCategories(sections: HubMenuSection[]): MenuPreviewCategory[] {
  return customerFacingMenuSections(sections).map((section) => ({
    id: section.id,
    name: section.name,
    description: getCategoryCustomerDescription(section) || undefined,
    subGroups: readMenuSubGroupsFromSection(section).map((group) => group.label),
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

/** Move a customer category to a new index in the customer list (drag-and-drop). */
export function moveCustomerMenuSectionToIndex(
  sections: HubMenuSection[],
  sectionId: string,
  toIndex: number,
): HubMenuSection[] {
  if (isHubMenuStaffLibrarySection(sections.find((section) => section.id === sectionId))) {
    return sections;
  }

  const sorted = sortMenuSectionsForStudio(sections);
  const staff = staffMenuSections(sorted);
  const customer = customerFacingMenuSections(sorted);
  const fromIndex = customer.findIndex((section) => section.id === sectionId);
  if (fromIndex < 0) {
    return sections;
  }

  const clampedIndex = Math.max(0, Math.min(toIndex, customer.length - 1));
  if (fromIndex === clampedIndex) {
    return sections;
  }

  const nextCustomer = [...customer];
  const [moved] = nextCustomer.splice(fromIndex, 1);
  if (!moved) {
    return sections;
  }
  nextCustomer.splice(clampedIndex, 0, moved);
  return [...staff, ...nextCustomer];
}

export function stripMealUpgradeGroups(item: MenuItem): MenuItem {
  return {
    ...item,
    optionGroups: item.optionGroups.filter((group) => {
      if (isMealChoiceGroup(group)) {
        return false;
      }
      return !group.showWhenValueIds.some((id) => id.includes("-meal-yes"));
    }),
  };
}

export function updateMealChoiceGroupTitle(item: MenuItem, title: string): MenuItem {
  const mealGroup = findMealChoiceGroup(item);
  if (!mealGroup) {
    return item;
  }
  return updateItemOptionGroup(item, mealGroup.id, { name: title.trim() || MEAL_CHOICE_GROUP_DEFAULT_NAME });
}

export function updateExtrasGroupTitle(item: MenuItem, title: string): MenuItem {
  const group = findExtrasToppingsGroup(item);
  if (!group) {
    return item;
  }
  return updateItemOptionGroup(item, group.id, { name: title.trim() || EXTRAS_TOPPINGS_GROUP_NAME });
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
  const mealGroup = findMealChoiceGroup(item);
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
  customerGroupTitle = MEAL_CHOICE_GROUP_DEFAULT_NAME,
): MenuItem["optionGroups"] {
  const seed = createMenuDraftId("meal");
  const mealYesId = `${seed}-meal-yes`;
  const sides = template.sides.filter((side) => selectedSideIds.has(side.id));
  const drinks = template.drinks.filter((drink) => selectedDrinkIds.has(drink.id));
  const upgradeLabel = template.label.trim() || MEAL_CHOICE_GROUP_DEFAULT_NAME;

  const groups: MenuItem["optionGroups"] = [
    {
      id: createMenuDraftId("group"),
      name: customerGroupTitle.trim() || MEAL_CHOICE_GROUP_DEFAULT_NAME,
      description: `__HULL_MEAL_CHOICE__\n__HULL_MEAL_TEMPLATE:${template.id}__`,
      selectionMode: "single",
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      showWhenValueIds: [],
      options: [
        {
          id: `${seed}-no-meal`,
          label: MEAL_ON_ITS_OWN_LABEL,
          description: "",
          priceDelta: 0,
          isDefault: true,
          maxQuantity: 1,
        },
        {
          id: mealYesId,
          label: upgradeLabel,
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
  const existingTitle = findMealChoiceGroup(item)?.name ?? MEAL_CHOICE_GROUP_DEFAULT_NAME;

  return {
    ...withoutMeal,
    optionGroups: [...withoutMeal.optionGroups, ...buildMealUpgradeOptionGroups(template, sideIds, drinkIds, existingTitle)],
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
