export type HubExtraSuggestionGroupId = "meat" | "vegetable" | "cheese" | "premium";

export type HubExtraSuggestionGroup = {
  id: HubExtraSuggestionGroupId;
  label: string;
  suggestions: readonly string[];
};

export const HUB_EXTRA_SUGGESTION_GROUPS: readonly HubExtraSuggestionGroup[] = [
  {
    id: "meat",
    label: "Meat extras",
    suggestions: [
      "Pepperoni",
      "Ham",
      "Chicken",
      "Chicken Tikka",
      "Donner Meat",
      "Chicken Donner",
      "Beef",
      "Spicy Beef",
      "Bacon",
      "Sausage",
      "Salami",
      "Pulled Pork",
      "Beef Brisket",
      "Steak",
      "BBQ Chicken",
      "Peri Peri Chicken",
      "Cajun Chicken",
      "Meatballs",
      "Chorizo",
      "Mixed Meat",
    ],
  },
  {
    id: "vegetable",
    label: "Vegetable extras",
    suggestions: [
      "Onions",
      "Red Onions",
      "Mushrooms",
      "Mixed Peppers",
      "Green Peppers",
      "Jalapenos",
      "Sweetcorn",
      "Pineapple",
      "Fresh Tomato",
      "Olives",
      "Black Olives",
      "Green Chillies",
      "Garlic",
      "Spinach",
      "Rocket",
      "Pickles",
      "Gherkins",
      "Red Cabbage",
      "Lettuce",
      "Cucumber",
    ],
  },
  {
    id: "cheese",
    label: "Cheese extras",
    suggestions: [
      "Mozzarella",
      "Extra Cheese",
      "Double Cheese",
      "Cheddar",
      "Parmesan",
      "Nacho Cheese",
      "Cheese Sauce",
      "Halloumi",
      "Feta",
      "Vegan Cheese",
    ],
  },
  {
    id: "premium",
    label: "Premium extras",
    suggestions: [
      "Stuffed Crust",
      "Cheese Stuffed Crust",
      "Garlic Crust",
      "Garlic Butter",
      "Crispy Onions",
      "Onion Rings",
      "Jalapeno Poppers",
      "Mozzarella Sticks",
      "Halloumi Fries",
      "Mac & Cheese",
      "Extra Meat",
      "Extra Chicken",
      "Extra Donner",
      "Extra Sauce",
      "Extra Cheese",
    ],
  },
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
