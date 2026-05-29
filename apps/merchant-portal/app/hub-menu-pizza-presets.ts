import type { PizzaMenuRowKind } from "./menu-studio-core";

export type { PizzaMenuRowKind };

export const PIZZA_MENU_ROW_KINDS: ReadonlyArray<{ id: PizzaMenuRowKind; label: string }> = [
  { id: "pizza", label: "Pizzas" },
  { id: "garlic_bread", label: "Garlic breads" },
  { id: "calzone", label: "Calzones" },
];

/** Ordered top → bottom — easier classics first. */
export const PIZZA_MENU_SUGGESTIONS: readonly string[] = [
  "Margherita",
  "Pepperoni",
  "Ham & Mushroom",
  "Hawaiian",
  "Cheese & Tomato",
  "Double Pepperoni",
  "Four Cheese",
  "Vegetarian",
  "Veggie Supreme",
  "Mushroom Pizza",
  "Meat Feast",
  "Mighty Meat",
  "Meat Lovers",
  "BBQ Meat Feast",
  "Chicken & Bacon",
  "Pepperoni Feast",
  "Ham & Pepperoni",
  "Doner Pizza",
  "Chicken Tikka Pizza",
  "Chicken Supreme",
  "Spicy Beef Pizza",
  "Mixed Grill Pizza",
  "Steak Pizza",
  "Beef & Onion Pizza",
  "BBQ Chicken",
  "Chicken Tikka",
  "Chicken & Sweetcorn",
  "Chicken & Mushroom",
  "Peri Peri Chicken",
  "Hot Shot Chicken",
  "Cajun Chicken",
  "Chicken Feast",
  "Southern Fried Chicken Pizza",
  "Hot Shot",
  "American Hot",
  "Mexican Hot",
  "Inferno",
  "Volcano",
  "Spicy Special",
  "Hot & Spicy Chicken",
  "Jalapeno Special",
  "Spicy Beef",
  "BBQ Special",
  "BBQ Bacon Feast",
  "BBQ Ranch Pizza",
  "House Special",
  "Pizza Special",
  "Chef's Special",
  "Ultimate Special",
  "King's Special",
  "Hull Special",
  "Mega Special",
  "Super Supreme",
  "Deluxe Special",
  "Doner Meat Pizza",
  "Chicken Doner Pizza",
  "Mixed Doner Pizza",
  "Kebab Feast Pizza",
  "Donner Supreme",
  "Tuna & Sweetcorn",
  "Tuna Special",
  "Prawn Pizza",
  "Seafood Pizza",
  "Napoli",
  "Calabrese",
  "Diavola",
  "Quattro Formaggi",
  "Capricciosa",
  "Prosciutto",
  "Parma Ham",
  "Mediterranean",
  "Napoli Special",
];

export const GARLIC_BREAD_MENU_SUGGESTIONS: readonly string[] = [
  "Garlic Bread",
  "Garlic Bread with Tomato",
  "Garlic Bread with Herbs",
  "Garlic Bread Supreme",
  "Garlic Bread with Cheese",
  "Double Cheese Garlic Bread",
  "Mozzarella Garlic Bread",
  "Four Cheese Garlic Bread",
  "Cheese Stuffed Garlic Bread",
  "Pepperoni Stuffed Garlic Bread",
  "Ham Stuffed Garlic Bread",
  "Chicken Stuffed Garlic Bread",
  "Meat Feast Garlic Bread",
  "Garlic Bread with Cheese & Mushroom",
  "Garlic Bread with Cheese & Onion",
  "Garlic Bread with Cheese & Pepperoni",
  "Garlic Bread with Cheese & Ham",
  "Garlic Bread with Cheese & Chicken",
  "Garlic Bread with Cheese & Donner Meat",
  "Garlic Bread Special",
  "BBQ Chicken Garlic Bread",
  "Folded Garlic Bread",
  "Folded Garlic Bread with Cheese",
  "Folded Garlic Bread Special",
  "Folded Garlic Bread with Pepperoni",
];

export const CALZONE_MENU_SUGGESTIONS: readonly string[] = [
  "Cheese Calzone",
  "Ham & Cheese Calzone",
  "Pepperoni Calzone",
  "Chicken Calzone",
  "Vegetarian Calzone",
  "Meat Feast Calzone",
  "Doner Calzone",
  "Chicken Tikka Calzone",
  "Mixed Meat Calzone",
  "BBQ Meat Calzone",
  "Steak Calzone",
  "Hot Shot Calzone",
  "American Hot Calzone",
  "Mexican Calzone",
  "Spicy Chicken Calzone",
  "Jalapeno Calzone",
  "House Special Calzone",
  "Supreme Calzone",
  "Special Calzone",
  "Mega Calzone",
  "Chef's Special Calzone",
  "Italian Calzone",
  "Napoli Calzone",
  "Four Cheese Calzone",
  "Mediterranean Calzone",
];

export const PIZZA_MENU_SUGGESTIONS_BY_KIND: Record<PizzaMenuRowKind, readonly string[]> = {
  pizza: PIZZA_MENU_SUGGESTIONS,
  garlic_bread: GARLIC_BREAD_MENU_SUGGESTIONS,
  calzone: CALZONE_MENU_SUGGESTIONS,
};

export const MENU_SUGGESTION_CHIP_BATCH = 3;

/** Match menu rows when comparing suggestion names to existing items. */
export function normalizeMenuSuggestionName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+pizza$/i, "")
    .replace(/\s+calzone$/i, "")
    .replace(/\s+garlic bread$/i, "");
}

/** Default display name when quick-adding a pizza row (not garlic bread / calzone). */
export function formatPizzaMenuSuggestionName(kind: PizzaMenuRowKind, suggestion: string): string {
  const trimmed = suggestion.trim();
  if (!trimmed) {
    return "";
  }
  if (kind === "garlic_bread" || kind === "calzone") {
    return trimmed;
  }
  if (/\bpizza$/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed} Pizza`;
}
