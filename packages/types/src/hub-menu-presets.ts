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

export type HubMenuCategoryPresetChoice = {
  id: string;
  label: string;
  defaultName: string;
  defaultDescription: string;
};

/** First option in UI should be “Add custom category” — use `HUB_MENU_CATEGORY_CUSTOM_ID`. */
export const HUB_MENU_CATEGORY_PRESET_CHOICES: HubMenuCategoryPresetChoice[] = [
  { id: "pizza", label: "Pizza", defaultName: "Pizza", defaultDescription: "Pizzas with size options." },
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
