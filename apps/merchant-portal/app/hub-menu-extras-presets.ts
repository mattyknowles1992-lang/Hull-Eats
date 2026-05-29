export type HubExtraSuggestionGroupId = "meat" | "vegetable" | "cheese" | "premium";

/** @deprecated Use HUB_EXTRA_SUGGESTIONS — kept for any stale imports. */
export type HubExtraSuggestionGroup = {
  id: HubExtraSuggestionGroupId;
  label: string;
  suggestions: readonly string[];
};

/** One suggested extra at a time — toppings only (no crusts or side dishes). */
export const HUB_EXTRA_SUGGESTIONS: readonly string[] = [
  "Pepperoni",
  "Ham",
  "Chicken",
  "Chicken Tikka",
  "Donner Meat",
  "Chicken Donner",
  "Spicy Beef",
  "Bacon",
  "Salami",
  "Chorizo",
  "Meatballs",
  "Mixed Meat",
  "Mushrooms",
  "Onions",
  "Red Onions",
  "Mixed Peppers",
  "Jalapenos",
  "Sweetcorn",
  "Pineapple",
  "Fresh Tomato",
  "Olives",
  "Black Olives",
  "Green Chillies",
  "Spinach",
  "Extra Cheese",
  "Double Cheese",
  "Mozzarella",
  "Cheddar",
  "Parmesan",
  "Halloumi",
  "Feta",
  "Vegan Cheese",
  "Garlic",
  "Extra Chicken",
  "Extra Donner",
  "Extra Meat",
  "Extra Sauce",
];

/** @deprecated Flat list replaced grouped columns. */
export const HUB_EXTRA_SUGGESTION_GROUPS: readonly HubExtraSuggestionGroup[] = [
  { id: "meat", label: "Meat extras", suggestions: HUB_EXTRA_SUGGESTIONS },
];

export const PIZZA_BASE_SUGGESTIONS: readonly string[] = [
  "Tomato",
  "BBQ",
  "Garlic",
  "Peri Peri",
  "Sweet Chilli",
  "White",
  "Pesto",
];

export const PIZZA_CRUST_SUGGESTIONS: readonly string[] = [
  "Regular",
  "Thin",
  "Deep Pan",
  "Stuffed",
  "Cheese Stuffed",
  "Garlic Crust",
];

export const HUB_SAUCE_SUGGESTIONS: readonly string[] = [
  "Garlic Sauce",
  "Garlic Mayo",
  "Chilli Sauce",
  "Hot Chilli Sauce",
  "BBQ Sauce",
  "Smoky BBQ Sauce",
  "Peri Peri Sauce",
  "Burger Sauce",
  "House Sauce",
  "Mayo",
  "Mint Sauce",
  "Mint Yoghurt",
  "Sweet Chilli Sauce",
  "Ranch Sauce",
  "Buffalo Sauce",
  "Sriracha",
  "Tomato Sauce",
  "Ketchup",
  "Brown Sauce",
  "Mustard",
];

export function normalizeExtraSuggestionName(name: string): string {
  return name.trim().toLowerCase();
}

export function normalizePizzaChoiceSuggestionName(name: string): string {
  return name.trim().toLowerCase();
}
