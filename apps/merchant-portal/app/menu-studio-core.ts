import type { HubMenuSection, MenuItem } from "@hull-eats/types";
import { HUB_MENU_CATEGORY_CUSTOM_ID } from "@hull-eats/types";

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
    name: nameOverride ?? `${source.name.trim()} (copy)`,
    isActive: false,
    stockStatus: "in_stock",
  });
}

export function computeMenuPublishIssues(sections: HubMenuSection[]): string[] {
  const issues: string[] = [];

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

export function buildMenuPublishSummary(
  sections: HubMenuSection[],
  savedSections: HubMenuSection[] | null,
  hasUnsavedChanges: boolean,
): MenuPublishSummary {
  const items = sections.flatMap((section) => section.items);
  const savedIds = savedSections ? flattenMenuItemIds(savedSections) : new Set<string>();
  const currentIds = flattenMenuItemIds(sections);

  return {
    issues: computeMenuPublishIssues(sections),
    categoryCount: sections.length,
    itemCount: items.length,
    liveCount: items.filter((item) => getMenuAvailabilityMode(item) === "live").length,
    soldOutCount: items.filter((item) => getMenuAvailabilityMode(item) === "sold_out").length,
    hiddenCount: items.filter((item) => getMenuAvailabilityMode(item) === "hidden").length,
    newItemCount: [...currentIds].filter((id) => !savedIds.has(id)).length,
    removedItemCount: [...savedIds].filter((id) => !currentIds.has(id)).length,
    hasUnsavedChanges,
  };
}
