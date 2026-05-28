const HULL_PRESET_PREFIX = /^__HULL_PRESET:([a-z0-9-]+)__(?:\r?\n)?([\s\S]*)$/;

/** Persisted on `MenuCategory.description` so no DB migration is required. */
export function encodeHubMenuCategoryDescription(presetKey: string | null | undefined, userDescription: string): string {
  const text = (userDescription ?? "").trim();
  if (!presetKey) {
    return text;
  }
  return `__HULL_PRESET:${presetKey}__\n${text}`;
}

export function decodeHubMenuCategoryDescription(raw: string | null | undefined): { presetKey: string | null; description: string } {
  const s = raw ?? "";
  const match = s.match(HULL_PRESET_PREFIX);
  if (!match) {
    return { presetKey: null, description: s.trim() };
  }
  return { presetKey: match[1] ?? null, description: (match[2] ?? "").trim() };
}

export const HUB_MENU_CATEGORY_CUSTOM_ID = "custom";

/** Internal category for hub-wide extra toppings (hidden on customer menu). */
export const HUB_MENU_EXTRAS_LIBRARY_PRESET = "extras-library";

/** Internal category for hub-wide sauce choices (hidden on customer menu). */
export const HUB_MENU_SAUCES_LIBRARY_PRESET = "sauces-library";

/** Internal category for meal-upgrade templates (hidden on customer menu). */
export const HUB_MENU_MEAL_LIBRARY_PRESET = "meal-upgrades-library";

/** @deprecated Migrated to burger-parts-library + kebab-parts-library */
export const HUB_MENU_BURGER_KEBAB_PARTS_PRESET = "burger-kebab-parts-library";

/** Internal category for burger base parts (buns, meat, salad — hidden on customer menu). */
export const HUB_MENU_BURGER_PARTS_PRESET = "burger-parts-library";

/** Internal category for kebab base parts (bread, meat, salad — hidden on customer menu). */
export const HUB_MENU_KEBAB_PARTS_PRESET = "kebab-parts-library";

/** Internal store for draft menu boards (seasonal / alternative menus — hidden on customer menu). */
export const HUB_MENU_BOARDS_PRESET = "menu-boards-config";

export type HubMenuCategoryPresetChoice = {
  id: string;
  label: string;
  defaultName: string;
  defaultDescription: string;
};

/** First option in UI should be “Add custom category” — use `HUB_MENU_CATEGORY_CUSTOM_ID`. */
export const HUB_MENU_CATEGORY_PRESET_CHOICES: HubMenuCategoryPresetChoice[] = [
  { id: "pizza", label: "Pizzas", defaultName: "Pizzas", defaultDescription: "Pizza menu — add each pizza name, then sizes and toppings per item." },
  { id: "burgers", label: "Burgers", defaultName: "Burgers", defaultDescription: "Classic burgers and house specials." },
  { id: "gourmet-burgers", label: "Gourmet burgers", defaultName: "Gourmet burgers", defaultDescription: "Premium burgers and chef specials." },
  { id: "kebabs", label: "Kebabs", defaultName: "Kebabs", defaultDescription: "Doner, shish, kofte, and wraps." },
  { id: "meal-deals", label: "Meal deals", defaultName: "Meal deals", defaultDescription: "Bundles and combo meals." },
  { id: "desserts", label: "Desserts", defaultName: "Desserts", defaultDescription: "Cakes, cookies, ice cream, and sweets." },
  { id: "starters", label: "Starters", defaultName: "Starters", defaultDescription: "Small plates and appetisers." },
  { id: "sides", label: "Sides", defaultName: "Sides", defaultDescription: "Fries, salads, and extras." },
  { id: "soups", label: "Soups", defaultName: "Soups", defaultDescription: "Seasonal soups and broths." },
  { id: "salads", label: "Salads", defaultName: "Salads", defaultDescription: "Fresh salads and bowls." },
  { id: "wraps", label: "Wraps", defaultName: "Wraps", defaultDescription: "Flatbread and tortilla wraps." },
  { id: "grill", label: "Grill", defaultName: "Grill", defaultDescription: "Grilled meats and mains." },
  { id: "fish", label: "Fish", defaultName: "Fish", defaultDescription: "Fish and seafood dishes." },
  { id: "chicken", label: "Chicken", defaultName: "Chicken", defaultDescription: "Chicken mains and buckets." },
  { id: "rice-dishes", label: "Rice dishes", defaultName: "Rice dishes", defaultDescription: "Curries, biryanis, and rice bowls." },
  { id: "noodles", label: "Noodles", defaultName: "Noodles", defaultDescription: "Noodle boxes and soups." },
  { id: "curry", label: "Curry", defaultName: "Curry", defaultDescription: "Curries and Indian-style mains." },
  { id: "indian", label: "Indian", defaultName: "Indian", defaultDescription: "Indian favourites." },
  { id: "chinese", label: "Chinese", defaultName: "Chinese", defaultDescription: "Chinese takeaway classics." },
  { id: "thai", label: "Thai", defaultName: "Thai", defaultDescription: "Thai curries and stir fries." },
  { id: "mexican", label: "Mexican", defaultName: "Mexican", defaultDescription: "Burritos, tacos, and nachos." },
  { id: "breakfast", label: "Breakfast", defaultName: "Breakfast", defaultDescription: "Morning plates and brunch." },
  { id: "kids", label: "Kids meals", defaultName: "Kids meals", defaultDescription: "Smaller portions for children." },
  { id: "drinks", label: "Drinks", defaultName: "Drinks", defaultDescription: "Soft drinks and cold beverages." },
  { id: "milkshakes", label: "Milkshakes", defaultName: "Milkshakes", defaultDescription: "Thick shakes and smoothies." },
  { id: "coffee", label: "Coffee", defaultName: "Coffee", defaultDescription: "Coffee and hot drinks." },
  { id: "alcohol", label: "Alcohol", defaultName: "Alcohol", defaultDescription: "Beer, wine, and spirits where licensed." },
  { id: "sundries", label: "Sundries", defaultName: "Sundries", defaultDescription: "Sauces, dips, and extras." },
  { id: "specials", label: "Specials", defaultName: "Specials", defaultDescription: "Limited-time offers." },
];

export function hubMenuCategorySelectOptions(): HubMenuCategoryPresetChoice[] {
  return [
    { id: HUB_MENU_CATEGORY_CUSTOM_ID, label: "Add custom category", defaultName: "", defaultDescription: "" },
    ...HUB_MENU_CATEGORY_PRESET_CHOICES,
  ];
}

export function isHubMenuExtrasLibrarySection(
  section: { presetKey?: string | null; name?: string } | null | undefined,
): boolean {
  return section?.presetKey === HUB_MENU_EXTRAS_LIBRARY_PRESET;
}

export function isHubMenuSaucesLibrarySection(
  section: { presetKey?: string | null; name?: string } | null | undefined,
): boolean {
  return section?.presetKey === HUB_MENU_SAUCES_LIBRARY_PRESET;
}

export function isHubMenuMealLibrarySection(
  section: { presetKey?: string | null; name?: string } | null | undefined,
): boolean {
  return section?.presetKey === HUB_MENU_MEAL_LIBRARY_PRESET;
}

export function isHubMenuBurgerKebabPartsSection(
  section: { presetKey?: string | null; name?: string } | null | undefined,
): boolean {
  return section?.presetKey === HUB_MENU_BURGER_KEBAB_PARTS_PRESET;
}

export function isHubMenuBurgerPartsSection(
  section: { presetKey?: string | null; name?: string } | null | undefined,
): boolean {
  return section?.presetKey === HUB_MENU_BURGER_PARTS_PRESET;
}

export function isHubMenuKebabPartsSection(
  section: { presetKey?: string | null; name?: string } | null | undefined,
): boolean {
  return section?.presetKey === HUB_MENU_KEBAB_PARTS_PRESET;
}

export function isHubMenuComposePartsSection(
  section: { presetKey?: string | null; name?: string } | null | undefined,
): boolean {
  return (
    isHubMenuBurgerPartsSection(section) ||
    isHubMenuKebabPartsSection(section) ||
    isHubMenuBurgerKebabPartsSection(section)
  );
}

export function isHubMenuMenuBoardsConfigSection(
  section: { presetKey?: string | null; name?: string } | null | undefined,
): boolean {
  return section?.presetKey === HUB_MENU_BOARDS_PRESET;
}

export function isHubMenuStaffLibrarySection(
  section: { presetKey?: string | null; name?: string } | null | undefined,
): boolean {
  return (
    isHubMenuExtrasLibrarySection(section) ||
    isHubMenuSaucesLibrarySection(section) ||
    isHubMenuMealLibrarySection(section) ||
    isHubMenuComposePartsSection(section) ||
    isHubMenuMenuBoardsConfigSection(section)
  );
}

/** Customer-facing meal deal bundles — pick mains/sides/drinks from the live menu. */
export function isHubMenuMealDealsCategory(
  section: { presetKey?: string | null; name?: string } | null | undefined,
): boolean {
  if (!section || isHubMenuStaffLibrarySection(section)) {
    return false;
  }
  if (section.presetKey === "meal-deals") {
    return true;
  }
  const name = (section.name ?? "").trim().toLowerCase();
  return /\bmeal deal/.test(name);
}

const BURGER_MENU_PRESET_KEYS = new Set(["burgers", "gourmet-burgers"]);
const KEBAB_MENU_PRESET_KEYS = new Set(["kebabs", "wraps"]);

/** Customer-facing burger categories — use burger parts composer. */
export function isHubMenuBurgerMenuCategory(
  section: { presetKey?: string | null; name?: string } | null | undefined,
): boolean {
  if (!section || isHubMenuStaffLibrarySection(section)) {
    return false;
  }
  if (section.presetKey && BURGER_MENU_PRESET_KEYS.has(section.presetKey)) {
    return true;
  }
  const name = (section.name ?? "").trim().toLowerCase();
  return /\bburger/.test(name);
}

/** Customer-facing kebab/wrap categories — use kebab parts composer. */
export function isHubMenuKebabMenuCategory(
  section: { presetKey?: string | null; name?: string } | null | undefined,
): boolean {
  if (!section || isHubMenuStaffLibrarySection(section)) {
    return false;
  }
  if (section.presetKey && KEBAB_MENU_PRESET_KEYS.has(section.presetKey)) {
    return true;
  }
  const name = (section.name ?? "").trim().toLowerCase();
  return /\b(kebab|wrap|doner|shawarma)\b/.test(name);
}

/** @deprecated Use isHubMenuBurgerMenuCategory or isHubMenuKebabMenuCategory */
export function isHubMenuBurgerKebabMenuCategory(
  section: { presetKey?: string | null; name?: string } | null | undefined,
): boolean {
  return isHubMenuBurgerMenuCategory(section) || isHubMenuKebabMenuCategory(section);
}

export function isHubMenuDrinksStyleCategory(
  section: { presetKey?: string | null; name?: string } | null | undefined,
): boolean {
  const key = section?.presetKey ?? "";
  return key === "drinks" || key === "milkshakes" || key === "coffee" || key === "alcohol";
}

/** Fast row-based menu builder — each preset gets columns and copy that fit that category. */
export type HubMenuOrderTicketConfig = {
  useSubGroupHeaders: boolean;
  showPhoto: boolean;
  showVariations: boolean;
  showAgeCheck: boolean;
  showSpiceHeat: boolean;
  showDrinkSizes: boolean;
  showBulkPaste: boolean;
  introTitle: string;
  introBody: string;
  namePlaceholder: string;
};

const ORDER_TICKET_SPICE_PRESETS = new Set(["curry", "indian", "thai", "rice-dishes"]);

const ORDER_TICKET_HEADER_PRESETS = new Set(["drinks", "milkshakes", "coffee", "alcohol"]);
const ORDER_TICKET_VARIATION_PRESETS = new Set(["chicken"]);
const ORDER_TICKET_FLAT_PRESETS = new Set([
  "starters",
  "sides",
  "soups",
  "salads",
  "desserts",
  "kids",
  "breakfast",
  "sundries",
  "specials",
  "grill",
  "fish",
  "rice-dishes",
  "noodles",
  "curry",
  "indian",
  "chinese",
  "thai",
  "mexican",
]);

export function isHubMenuOrderTicketCategory(
  section: { presetKey?: string | null; name?: string } | null | undefined,
): boolean {
  if (!section || isHubMenuStaffLibrarySection(section)) {
    return false;
  }
  const key = section.presetKey ?? "";
  return (
    ORDER_TICKET_HEADER_PRESETS.has(key) ||
    ORDER_TICKET_VARIATION_PRESETS.has(key) ||
    ORDER_TICKET_FLAT_PRESETS.has(key)
  );
}

function flatOrderTicketIntro(presetKey: string): string {
  const copy: Record<string, string> = {
    starters: "Add each starter on its own line — name and price, like your printed menu.",
    sides: "One line per side (fries, rings, coleslaw…) with price. Use Copy to all when prices match.",
    soups: "Each soup on its own row — name and price.",
    salads: "Each salad or bowl on its own row.",
    desserts: "Cakes, ice cream, cookies — one product per line with photo if you have one.",
    kids: "Each kids meal on its own line — name, price, and optional photo.",
    breakfast: "Morning plates and brunch items — one line each.",
    sundries: "Sauces, dips, and extras — quick lines with prices.",
    specials: "Limited-time dishes — add each special on its own row.",
    grill: "Grilled mains — name and price on each line.",
    fish: "Fish and seafood dishes — one line each.",
    "rice-dishes": "Curries, biryanis, and rice bowls — one dish per row.",
    noodles: "Noodle boxes and soups — one line each.",
    curry: "Each curry on its own row — name and price.",
    indian: "Indian favourites — one dish per line.",
    chinese: "Chinese classics — one line per dish.",
    thai: "Thai curries and stir fries — one row each.",
    mexican: "Tacos, burritos, nachos — one product per line.",
  };
  return copy[presetKey] ?? "Add each dish on its own line with name and price.";
}

function flatOrderTicketPlaceholder(presetKey: string): string {
  const copy: Record<string, string> = {
    starters: "e.g. Garlic bread",
    sides: "e.g. Chips",
    soups: "e.g. Tomato soup",
    salads: "e.g. Greek salad",
    desserts: "e.g. Chocolate fudge cake",
    kids: "e.g. Kids nuggets meal",
    breakfast: "e.g. Full English",
    sundries: "e.g. Pot of curry sauce",
    specials: "e.g. Chef's special",
    grill: "e.g. Mixed grill",
    fish: "e.g. Cod & chips",
    "rice-dishes": "e.g. Chicken biryani",
    noodles: "e.g. Chow mein",
    curry: "e.g. Chicken tikka masala",
    indian: "e.g. Lamb rogan josh",
    chinese: "e.g. Sweet & sour chicken",
    thai: "e.g. Pad thai",
    mexican: "e.g. Chicken burrito",
  };
  return copy[presetKey] ?? "e.g. Dish name";
}

export function getHubMenuOrderTicketConfig(
  section: { presetKey?: string | null; name?: string } | null | undefined,
): HubMenuOrderTicketConfig | null {
  if (!isHubMenuOrderTicketCategory(section)) {
    return null;
  }
  const key = section?.presetKey ?? "";

  if (ORDER_TICKET_HEADER_PRESETS.has(key)) {
    const isAlcohol = key === "alcohol";
    return {
      useSubGroupHeaders: true,
      showPhoto: true,
      showVariations: false,
      showAgeCheck: isAlcohol,
      showSpiceHeat: false,
      showDrinkSizes: true,
      showBulkPaste: true,
      introTitle: "Build like an order ticket",
      introBody: isAlcohol
        ? "Add menu headers (e.g. Beer — Bottles), then each drink on its own line. Tick 18+ where ID check is required."
        : "Add a menu header (e.g. Fizzy — Cans), then add each product on its own line with name and price — the way it appears when a customer orders.",
      namePlaceholder:
        key === "coffee" ? "e.g. Latte" : key === "milkshakes" ? "e.g. Strawberry shake" : isAlcohol ? "e.g. Peroni" : "e.g. Coke",
    };
  }

  if (ORDER_TICKET_VARIATION_PRESETS.has(key)) {
    return {
      useSubGroupHeaders: false,
      showPhoto: true,
      showVariations: true,
      showAgeCheck: false,
      showSpiceHeat: false,
      showDrinkSizes: false,
      showBulkPaste: true,
      introTitle: "Portions and flavours",
      introBody:
        "Each row is one product (e.g. 6 Wings). Set the portion price, then add flavour options if customers pick BBQ, Spicy, Plain, etc.",
      namePlaceholder: "e.g. 6 Chicken Wings",
    };
  }

  return {
    useSubGroupHeaders: false,
    showPhoto: true,
    showVariations: false,
    showAgeCheck: false,
    showSpiceHeat: ORDER_TICKET_SPICE_PRESETS.has(key),
    showDrinkSizes: false,
    showBulkPaste: true,
    introTitle: "Add products in a list",
    introBody: flatOrderTicketIntro(key),
    namePlaceholder: flatOrderTicketPlaceholder(key),
  };
}

export function isHubMenuSectionPizza(section: { presetKey?: string | null; name?: string } | null | undefined): boolean {
  if (!section) {
    return false;
  }
  if (section.presetKey === "pizza") {
    return true;
  }
  const n = (section.name ?? "").trim().toLowerCase();
  return n === "pizza" || n === "pizzas";
}

const HULL_INTERNAL_OPTION_LINE = /^__HULL_[A-Z0-9_]+(?::[^_]*)?__$/i;
const HULL_SPICE_DESC_PREFIX = /^__HULL_SPICE:[a-z-]+__(?:\r?\n)?/i;

/** Strip hub-internal markers from menu item descriptions before customers see them. */
export function customerFacingMenuItemDescription(description?: string | null): string {
  return (description ?? "").replace(HULL_SPICE_DESC_PREFIX, "").trim();
}

/** Strip hub-internal markers from option group descriptions before customers see them. */
export function customerFacingOptionGroupDescription(description?: string | null): string {
  if (!description?.trim()) {
    return "";
  }
  return description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !HULL_INTERNAL_OPTION_LINE.test(line))
    .join("\n")
    .trim();
}

const EXTRA_INCLUDED_QTY_PREFIX = /^__HULL_EXTRA_INCLUDED:(\d+)__$/;

/** Free quantity bundled with the item before `priceDelta` applies (extras library on hub items). */
export function parseExtraIncludedQuantity(description?: string | null | undefined): number {
  if (!description?.trim()) {
    return 0;
  }
  for (const line of description.split(/\r?\n/)) {
    const match = line.trim().match(EXTRA_INCLUDED_QTY_PREFIX);
    if (match) {
      return Math.max(0, Number(match[1]) || 0);
    }
  }
  return 0;
}

export function encodeExtraIncludedQuantity(includedQuantity: number, note = ""): string {
  const qty = Math.max(0, Math.floor(includedQuantity));
  const marker = qty > 0 ? `__HULL_EXTRA_INCLUDED:${qty}__` : "";
  const text = note.trim();
  if (marker && text) {
    return `${marker}\n${text}`;
  }
  return marker || text;
}

export function customerFacingOptionDescription(description?: string | null): string {
  if (!description?.trim()) {
    return "";
  }
  return description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !HULL_INTERNAL_OPTION_LINE.test(line) && !EXTRA_INCLUDED_QTY_PREFIX.test(line))
    .join("\n")
    .trim();
}
