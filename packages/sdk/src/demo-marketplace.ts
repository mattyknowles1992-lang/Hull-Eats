import type { MenuItem, StoreSummary } from "@hull-eats/types";

export type DemoMenuSection = {
  id: string;
  name: string;
  description?: string;
  items: MenuItem[];
};

const makeItemId = (categoryId: string, name: string) =>
  `${categoryId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;

const makeOptionId = (seed: string) => seed.toLowerCase().replace(/[^a-z0-9]+/g, "-");

type CustomisationTemplate = "none" | "burger_meal" | "chicken_burger_meal" | "hotdog_meal";

const createMealOptions = (seed: string) => {
  const mealYesId = `${seed}-make-it-a-meal`;
  const cheeseFriesId = `${seed}-meal-fries-cheese`;

  return [
    {
      id: `${seed}-meal-upgrade`,
      name: "Meal choice",
      description: "Choose this item on its own or upgrade it into a meal.",
      selectionMode: "single" as const,
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      showWhenValueIds: [],
      options: [
        {
          id: `${seed}-no-meal`,
          label: "On its Own",
          description: "",
          priceDelta: 0,
          isDefault: true,
          maxQuantity: 1,
        },
        {
          id: mealYesId,
          label: "Make it a Meal (Fries & a Can)",
          description: "Add fries and a can.",
          priceDelta: 3,
          isDefault: false,
          maxQuantity: 1,
        },
      ],
    },
    {
      id: `${seed}-fries-salt`,
      name: "Salt on fries?",
      description: "Choose how the fries are finished.",
      selectionMode: "single" as const,
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      showWhenValueIds: [mealYesId],
      options: [
        { id: `${seed}-fries-salted`, label: "Salt", description: "", priceDelta: 0, isDefault: true, maxQuantity: 1 },
        { id: `${seed}-fries-no-salt`, label: "No Salt", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 },
      ],
    },
    {
      id: `${seed}-fries-cheese`,
      name: "Cheese on fries?",
      description: "Add cheese to the fries if you want it.",
      selectionMode: "single" as const,
      isRequired: false,
      minSelections: 0,
      maxSelections: 1,
      showWhenValueIds: [mealYesId],
      options: [
        { id: `${seed}-meal-fries-plain`, label: "Without Cheese", description: "", priceDelta: 0, isDefault: true, maxQuantity: 1 },
        { id: cheeseFriesId, label: "Cheese on Fries", description: "", priceDelta: 0.99, isDefault: false, maxQuantity: 1 },
      ],
    },
    {
      id: `${seed}-drink-choice`,
      name: "Choose your can",
      description: "Choose your drink for the meal.",
      selectionMode: "single" as const,
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      showWhenValueIds: [mealYesId],
      options: [
        { id: `${seed}-drink-coke`, label: "Coke", description: "", priceDelta: 0.29, isDefault: true, maxQuantity: 1 },
        { id: `${seed}-drink-redbull`, label: "Redbull", description: "", priceDelta: 1.79, isDefault: false, maxQuantity: 1 },
        { id: `${seed}-drink-water`, label: "Water", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 },
        { id: `${seed}-drink-dr-pepper`, label: "Dr Pepper", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 },
        { id: `${seed}-drink-fanta-orange`, label: "Fanta Orange", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 },
        { id: `${seed}-drink-fanta-fruit-twist`, label: "Fanta Fruit Twist", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 },
        { id: `${seed}-drink-fanta-lemon`, label: "Fanta Lemon", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 },
        { id: `${seed}-drink-pepsi-max`, label: "Pepsi Max", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 },
        { id: `${seed}-drink-cherry-coke-zero`, label: "Cherry Coke Zero", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 },
        { id: `${seed}-drink-coke-zero`, label: "Coke Zero", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 },
        { id: `${seed}-drink-diet-coke`, label: "Diet Coke", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 },
      ],
    },
  ];
};

const createBurgerTemplate = (seed: string, meatLabel = "3oz beef burger") => ({
  components: [
    { id: `${seed}-bun`, label: "Bun", quantity: 1, removable: false },
    { id: `${seed}-patty-1`, label: meatLabel, quantity: 1, removable: false },
    { id: `${seed}-patty-2`, label: meatLabel, quantity: 1, removable: false },
    { id: `${seed}-cheese-1`, label: "Cheese", quantity: 1, removable: false },
    { id: `${seed}-cheese-2`, label: "Cheese", quantity: 1, removable: false },
    { id: `${seed}-onions`, label: "Onions", quantity: 1, removable: true },
    { id: `${seed}-gherkins`, label: "Gherkins", quantity: 1, removable: true },
    { id: `${seed}-lettuce`, label: "Lettuce", quantity: 1, removable: true },
  ],
  optionGroups: [
    {
      id: `${seed}-extra-patty`,
      name: "Extra Patty & Cheese?",
      description: "Add another patty and cheese if you want the stack even bigger.",
      selectionMode: "single" as const,
      isRequired: false,
      minSelections: 0,
      maxSelections: 1,
      showWhenValueIds: [],
      options: [
        {
          id: `${seed}-extra-patty-cheese`,
          label: "Extra Patty & Cheese",
          description: "",
          priceDelta: 3.99,
          isDefault: false,
          maxQuantity: 1,
        },
      ],
    },
    {
      id: `${seed}-extras`,
      name: "Extras?",
      description: "Add any extra loaded toppings you want on this burger.",
      selectionMode: "multiple" as const,
      isRequired: false,
      minSelections: 0,
      maxSelections: null,
      showWhenValueIds: [],
      options: [
        { id: `${seed}-extra-brisket`, label: "Beef Brisket", description: "", priceDelta: 4.79, isDefault: false, maxQuantity: 1 },
        { id: `${seed}-extra-pulled-pork`, label: "Pulled Pork", description: "", priceDelta: 3.59, isDefault: false, maxQuantity: 1 },
        { id: `${seed}-extra-tenders`, label: "2 Buttermilk Tenders", description: "", priceDelta: 2.39, isDefault: false, maxQuantity: 1 },
        { id: `${seed}-extra-bacon`, label: "Streaky Bacon", description: "", priceDelta: 1.99, isDefault: false, maxQuantity: 1 },
        { id: `${seed}-extra-chorizo`, label: "Chorizo", description: "", priceDelta: 1.99, isDefault: false, maxQuantity: 1 },
        { id: `${seed}-extra-hash-brown`, label: "Hash Brown", description: "", priceDelta: 1.49, isDefault: false, maxQuantity: 1 },
        { id: `${seed}-extra-cheese`, label: "Extra Cheese", description: "", priceDelta: 1.2, isDefault: false, maxQuantity: 2 },
      ],
    },
    {
      id: `${seed}-cheese-choice`,
      name: "Cheese?",
      description: "Choose your cheese style.",
      selectionMode: "single" as const,
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      showWhenValueIds: [],
      options: [
        { id: `${seed}-cheese-standard`, label: "Cheese", description: "", priceDelta: 0, isDefault: true, maxQuantity: 1 },
        { id: `${seed}-cheese-nacho`, label: "Nacho Cheese", description: "", priceDelta: 0.99, isDefault: false, maxQuantity: 1 },
        { id: `${seed}-cheese-none`, label: "No Cheese", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 },
      ],
    },
    {
      id: `${seed}-sauce-choice`,
      name: "Sauce?",
      description: "Choose the sauce finish for the burger.",
      selectionMode: "single" as const,
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      showWhenValueIds: [],
      options: [
        { id: `${seed}-sauce-loaded`, label: "Loaded Munch Sauce", description: "", priceDelta: 0, isDefault: true, maxQuantity: 1 },
        { id: `${seed}-sauce-burger`, label: "Burger Sauce", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 },
        { id: `${seed}-sauce-bbq`, label: "BBQ Sauce", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 },
        { id: `${seed}-sauce-mayo`, label: "Mayo", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 },
        { id: `${seed}-sauce-hot-honey`, label: "Hot Honey", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 },
      ],
    },
    ...createMealOptions(seed),
  ],
});

const createChickenBurgerTemplate = (seed: string) =>
  createBurgerTemplate(seed, "Buttermilk chicken tender");

const createHotDogTemplate = (seed: string) => ({
  components: [
    { id: `${seed}-bun`, label: "Brioche bun", quantity: 1, removable: false },
    { id: `${seed}-sausage`, label: "Beechwood smoked hot dog", quantity: 1, removable: false },
    { id: `${seed}-caramelised-onions`, label: "Caramelised onions", quantity: 1, removable: true },
    { id: `${seed}-nacho-cheese`, label: "Nacho cheese", quantity: 1, removable: true },
    { id: `${seed}-waffle-fries`, label: "Waffle fries", quantity: 1, removable: false },
  ],
  optionGroups: [
    {
      id: `${seed}-sauces`,
      name: "Sauce",
      description: "Choose your sauce.",
      selectionMode: "single" as const,
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      showWhenValueIds: [],
      options: [
        { id: `${seed}-loaded-sauce`, label: "Loaded Munch sauce", description: "", priceDelta: 0, isDefault: true, maxQuantity: 1 },
        { id: `${seed}-bbq`, label: "BBQ sauce", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 },
        { id: `${seed}-mayo`, label: "Mayo", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 },
      ],
    },
    {
      id: `${seed}-extras`,
      name: "Add extras",
      description: "Choose any extras to add.",
      selectionMode: "multiple" as const,
      isRequired: false,
      minSelections: 0,
      maxSelections: null,
      showWhenValueIds: [],
      options: [
        { id: `${seed}-extra-cheese`, label: "Extra nacho cheese", description: "", priceDelta: 1, isDefault: false, maxQuantity: 2 },
        { id: `${seed}-extra-onions`, label: "Extra onions", description: "", priceDelta: 0.4, isDefault: false, maxQuantity: 1 },
      ],
    },
  ],
});

const buildCustomisationConfig = (template: CustomisationTemplate, seed: string) => {
  switch (template) {
    case "burger_meal":
      return createBurgerTemplate(seed);
    case "chicken_burger_meal":
      return createChickenBurgerTemplate(seed);
    case "hotdog_meal":
      return createHotDogTemplate(seed);
    default:
      return { components: [], optionGroups: [] };
  }
};

const createMenuItem = (
  categoryId: string,
  name: string,
  price: number,
  description: string,
  sortOrder: number,
  customisationTemplate: CustomisationTemplate = "none",
  sectionImageUrl?: string,
  requiresIdVerification = false,
): MenuItem => ({
  id: makeItemId(categoryId, name),
  categoryId,
  name,
  description,
  price,
  isActive: true,
  trackStock: false,
  stockQuantity: null,
  stockStatus: "in_stock",
  allowBackorder: false,
  maxPerOrder: null,
  requiresIdVerification,
  sortOrder,
  ...(sectionImageUrl ? { imageUrl: sectionImageUrl } : {}),
  ...buildCustomisationConfig(customisationTemplate, makeOptionId(`${categoryId}-${name}`)),
});

const buildSection = (
  id: string,
  name: string,
  description: string,
  entries: Array<[name: string, price: number, description: string, verifyWithId?: boolean]>,
  customisationTemplate: CustomisationTemplate = "none",
  sectionImageUrl?: string,
): DemoMenuSection => ({
  id,
  name,
  description,
  items: entries.map(([entryName, price, entryDescription, verifyWithId], index) =>
    createMenuItem(id, entryName, price, entryDescription, index, customisationTemplate, sectionImageUrl, Boolean(verifyWithId)),
  ),
});

/** Default HTTPS preview image per menu category (matches storefront vibes); swap per item in merchant hub. */
const lmUnsplash = {
  burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=82",
  chicken: "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=1200&q=82",
  fries: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=1200&q=82",
  hotdog: "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=1200&q=82",
  dessert: "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=82",
  drink: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=82",
} as const;

export const loadedMunchSectionImageUrls: Record<string, string> = {
  "smash-burgers": lmUnsplash.burger,
  "chicken-burgers": lmUnsplash.chicken,
  "hot-dogs": lmUnsplash.hotdog,
  "loaded-fries": lmUnsplash.fries,
  "chicken-sides": lmUnsplash.chicken,
  "sides": lmUnsplash.fries,
  "kids-meals": lmUnsplash.burger,
  "chocolate-fudge-cake": lmUnsplash.dessert,
  "cookie-dough": lmUnsplash.dessert,
  "brownie-dough": lmUnsplash.dessert,
  "shakes": lmUnsplash.drink,
  "refreshers": lmUnsplash.drink,
  "soft-drinks": lmUnsplash.drink,
};

export const loadedMunchStore: StoreSummary = {
  id: "store_loaded_munch_hull",
  merchantId: "business_loaded_munch",
  slug: "loaded-munch-hull",
  name: "Loaded Munch",
  type: "takeaway",
  storefrontStatus: "live",
  addressLine1: "Unit 1, 200 Clough Road",
  addressLine2: "Kingston upon Hull",
  city: "Hull",
  postcode: "HU5 1SN",
  isOpen: true,
  cuisineLabel: "Smash Burgers, Chicken & Desserts",
  etaMinutes: 25,
  deliveryFee: 3.49,
  deliveryPricing: {
    mode: "business_radius",
    radiusMiles: 9,
    distanceRanges: [],
    postcodeZones: [],
    postcodeDistricts: ["HU1", "HU2", "HU3", "HU4", "HU5", "HU6", "HU7", "HU8", "HU9", "HU10", "HU11", "HU12", "HU13", "HU14", "HU15", "HU16"],
    mileFees: [2.5, 3.0, 3.5, 3.99, 4.49],
    originLatitude: null,
    originLongitude: null,
    orderFulfillment: "delivery_and_collection",
  },
  minimumOrderAmount: 0,
  menuSetupComplete: true,
  onboardingMessage: "",
  heroImageUrl: "/stores/loaded-munch/hero.jpg",
  logoImageUrl: "/stores/loaded-munch/hero.jpg",
  homepageFeatured: false,
  homepageFeatureOrder: null,
  courierTrackingAvailable: false,
};

export const loadedMunchMenuSections: DemoMenuSection[] = [
  buildSection(
    "smash-burgers",
    "Smash Burgers",
    "Signature smashed beef burgers with loaded toppings and choice-led build-outs. Prices use the current listed entry price.",
    [
      [
        "The Piggy Cow",
        14.99,
        "Two 3oz smashed beef patties with melted cheese, fresh salad, and your choice of sauce, loaded with slow-cooked BBQ pulled pork, spiced chorizo, and smoked streaky bacon.",
      ],
      [
        "Brisket Baby",
        14.99,
        "Two 3oz smashed beef patties with melted cheese, fresh salad, and your choice of sauce, topped with tender, slow-cooked brisket.",
      ],
      [
        "Pulled Pork Melt",
        12.99,
        "Two 3oz smashed beef patties with melted cheese, fresh salad, and your choice of sauce, stacked with slow-cooked BBQ pulled pork.",
      ],
      [
        "Chorizo Melt",
        12.99,
        "Two 3oz smashed beef patties with melted cheese, fresh salad, and your choice of sauce, finished with spiced chorizo.",
      ],
      [
        "Bacon Melt",
        12.99,
        "Two 3oz smashed beef patties with melted cheese, fresh salad, and your choice of sauce, loaded with smoked streaky bacon.",
      ],
      [
        "Egg & Hash Melt",
        11.99,
        "Two 3oz smashed beef patties with melted cheese, fresh salad, and your choice of sauce, topped with a golden fried egg and crispy hash brown.",
      ],
      [
        "Cheesy Smash Stack",
        10.79,
        "Two 3oz smashed beef patties layered with extra melted cheese, fresh salad, and your choice of sauce.",
      ],
      [
        "Single Cheesy Smash Stack",
        7.79,
        "A single 3oz smashed beef patty with melted cheese, fresh salad, and your choice of sauce.",
      ],
    ],
    "burger_meal",
    loadedMunchSectionImageUrls["smash-burgers"],
  ),
  buildSection(
    "chicken-burgers",
    "Chicken Burgers",
    "Buttermilk chicken burger line built on crispy tenders in brioche buns with premium loaded toppings.",
    [
      [
        "Big Piggy Chicken Burger",
        13.99,
        "Three buttermilk chicken tenders in a soft brioche bun with melted cheese, fresh salad, and your choice of sauce, loaded with BBQ pulled pork, spiced chorizo, and smoked streaky bacon.",
      ],
      [
        "Brisket Chicken Burger",
        13.99,
        "Three buttermilk chicken tenders in a brioche bun with melted cheese, fresh salad, and your choice of sauce, topped with tender, slow-cooked brisket.",
      ],
      [
        "Pulled Pork Chicken Burger",
        11.99,
        "Three buttermilk chicken tenders in a brioche bun with melted cheese, fresh salad, and your choice of sauce, stacked with slow-cooked BBQ pulled pork.",
      ],
      [
        "Chorizo Chicken Burger",
        11.99,
        "Three buttermilk chicken tenders in a brioche bun with melted cheese, fresh salad, and your choice of sauce, finished with spiced chorizo.",
      ],
      [
        "Bacon Chicken Burger",
        11.99,
        "Three buttermilk chicken tenders in a brioche bun with melted cheese, fresh salad, and your choice of sauce, loaded with smoked streaky bacon.",
      ],
      [
        "Egg & Hash Chicken Burger",
        10.79,
        "Three buttermilk chicken tenders in a brioche bun with melted cheese, fresh salad, and your choice of sauce, topped with a golden fried egg and crispy hash brown.",
      ],
      [
        "Hot Honey Chicken Burger",
        10.79,
        "Three buttermilk chicken tenders in a brioche bun with melted cheese, fresh salad, and your choice of sauce, drizzled with hot honey.",
      ],
      [
        "Buttermilk Chicken Burger",
        9.79,
        "Three buttermilk chicken tenders in a brioche bun with melted cheese, fresh salad, and your choice of sauce.",
      ],
    ],
    "chicken_burger_meal",
    loadedMunchSectionImageUrls["chicken-burgers"],
  ),
  buildSection(
    "hot-dogs",
    "Hot Dogs",
    "Beechwood smoked hot dogs served in brioche buns and paired with waffle fries.",
    [
      [
        "The Big Pig Smoked Dog",
        14.99,
        "Beechwood smoked hot dog served in a soft brioche bun with caramelised onions, nacho cheese, and your choice of sauce, loaded with BBQ pulled pork, spiced chorizo, and smoked streaky bacon. Served with crispy waffle fries.",
      ],
      [
        "Beef Brisket Smoked Dog",
        14.99,
        "Beechwood smoked hot dog in a brioche bun with caramelised onions, nacho cheese, and your choice of sauce, topped with tender, slow-cooked brisket. Served with crispy waffle fries.",
      ],
      [
        "Chorizo & Bacon Smoked Dog",
        13.99,
        "Beechwood smoked hot dog in a brioche bun with caramelised onions, nacho cheese, and your choice of sauce, finished with spiced chorizo and smoked streaky bacon. Served with crispy waffle fries.",
      ],
      [
        "Pulled Pork Smoked Dog",
        12.99,
        "Beechwood smoked hot dog in a brioche bun with caramelised onions, nacho cheese, and your choice of sauce, stacked with slow-cooked BBQ pulled pork. Served with crispy waffle fries.",
      ],
      [
        "Chorizo Smoked Dog",
        12.99,
        "Beechwood smoked hot dog in a brioche bun with caramelised onions, nacho cheese, and your choice of sauce, topped with spiced chorizo. Served with crispy waffle fries.",
      ],
      [
        "Beechwood Smoked Dog",
        10.99,
        "Beechwood smoked hot dog in a brioche bun with caramelised onions, nacho cheese, and your choice of sauce. Served with crispy waffle fries.",
      ],
    ],
    "hotdog_meal",
    loadedMunchSectionImageUrls["hot-dogs"],
  ),
  buildSection(
    "loaded-fries",
    "Loaded Fries",
    "Crispy fries with nacho cheese, salad, sauce, and bigger loaded toppings.",
    [
      [
        "Piggy Fries",
        11.99,
        "Crispy fries loaded with nacho cheese, fresh salad, and your choice of sauce, piled high with BBQ pulled pork, spiced chorizo, and smoked streaky bacon.",
      ],
      [
        "Brisket Fries",
        11.99,
        "Crispy fries topped with nacho cheese, fresh salad, and your choice of sauce, finished with tender, slow-cooked brisket.",
      ],
      [
        "Cow & Chick Fries",
        11.99,
        "Crispy fries loaded with nacho cheese, fresh salad, and your choice of sauce, stacked with chopped smash burger patties and buttermilk chicken tenders.",
      ],
      [
        "Smash Patty Fries",
        10.79,
        "Crispy fries topped with nacho cheese, fresh salad, and your choice of sauce, finished with chopped smash burger patties.",
      ],
      [
        "Pulled Pork Fries",
        10.79,
        "Crispy fries loaded with nacho cheese, fresh salad, and your choice of sauce, topped with BBQ pulled pork.",
      ],
      [
        "Chorizo Fries",
        8.49,
        "Crispy fries topped with nacho cheese, fresh salad, and your choice of sauce, finished with spiced chorizo.",
      ],
      [
        "Bacon Fries",
        8.49,
        "Crispy fries loaded with nacho cheese, fresh salad, and your choice of sauce, topped with smoked streaky bacon.",
      ],
    ],
    "none",
    loadedMunchSectionImageUrls["loaded-fries"],
  ),
  buildSection(
    "chicken-sides",
    "Chicken Sides",
    "Golden chicken strip sides with seasoning-led flavour choices.",
    [
      [
        "5 Salt & Pepper Chicken Strips",
        5.99,
        "Crispy chicken strips tossed in bold salt and pepper seasoning. Includes Buttermilk Ranch or Loaded Munch sauce pot.",
      ],
      [
        "5 Hot & Spicy Chicken Strips",
        5.99,
        "Crispy chicken strips coated in hot and spicy seasoning. Includes Buttermilk Ranch or Loaded Munch sauce pot.",
      ],
    ],
    "none",
    loadedMunchSectionImageUrls["chicken-sides"],
  ),
  buildSection(
    "sides",
    "Sides",
    "Simple add-ons and sauces to round out the order.",
    [
      ["Fries", 3.29, "Bag of crispy fries topped with salt."],
      ["Waffle Fries", 4.29, "Bag of crispy waffle fries topped with salt."],
      ["Cheesy Chips", 4.99, "Cheesy chips topped with salt."],
      ["Sauce Pots", 0.99, "2oz sauce pot."],
      ["Nacho Cheese Sauce Pot", 1.49, "2oz nacho cheese sauce pot."],
    ],
    "none",
    loadedMunchSectionImageUrls["sides"],
  ),
  buildSection(
    "kids-meals",
    "Kids Meals",
    "Kids meal deals served with chips and a milkshake choice.",
    [
      ["Chicken Burger, Chips & Milkshake", 6.99, "Choice of banana, strawberry, or chocolate milkshake."],
      ["6 Chicken Nuggets, Chips & Milkshake", 6.99, "Choice of banana, strawberry, or chocolate milkshake."],
      ["10 Popcorn Chicken, Chips & Milkshake", 6.99, "Choice of banana, strawberry, or chocolate milkshake."],
      ["5 Hash Browns, Chips & Milkshake", 6.99, "Choice of banana, strawberry, or chocolate milkshake."],
    ],
    "none",
    loadedMunchSectionImageUrls["kids-meals"],
  ),
  buildSection(
    "chocolate-fudge-cake",
    "Chocolate Fudge Cake",
    "Store-made chocolate fudge cakes served with vanilla ice cream.",
    [
      ["Chocolate Fudge Cake", 5.49, "Chocolate fudge cake with vanilla ice cream."],
      ["Biscoff Chocolate Fudge Cake", 7.99, "Biscoff chocolate fudge cake with vanilla ice cream."],
      ["Oreo Chocolate Fudge Cake", 7.99, "Oreo chocolate fudge cake with vanilla ice cream."],
      ["Kinder Bueno Chocolate Fudge Cake", 7.99, "Kinder Bueno chocolate fudge cake with vanilla ice cream."],
      ["Pistachio Chocolate Fudge Cake", 7.99, "Pistachio chocolate fudge cake with vanilla ice cream."],
      ["Milky Way Chocolate Fudge Cake", 7.99, "Milky Way chocolate fudge cake with vanilla ice cream."],
      ["Milky Bar Chocolate Fudge Cake", 7.99, "Milky Bar chocolate fudge cake with vanilla ice cream."],
    ],
    "none",
    loadedMunchSectionImageUrls["chocolate-fudge-cake"],
  ),
  buildSection(
    "cookie-dough",
    "Cookie Dough",
    "Chocolate chip cookie dough served with vanilla ice cream.",
    [
      ["Plain Cookie Dough", 5.49, "Served with vanilla ice cream."],
      ["Oreo Cookie Dough", 7.99, "Served with vanilla ice cream."],
      ["Biscoff Cookie Dough", 7.99, "Served with vanilla ice cream."],
      ["Kinder Bueno Cookie Dough", 7.99, "Served with vanilla ice cream."],
      ["Pistachio Cookie Dough", 7.99, "Served with vanilla ice cream."],
      ["Milky Bar Cookie Dough", 7.99, "Served with vanilla ice cream."],
      ["Milky Way Cookie Dough", 7.99, "Served with vanilla ice cream."],
    ],
    "none",
    loadedMunchSectionImageUrls["cookie-dough"],
  ),
  buildSection(
    "brownie-dough",
    "Brownie Dough",
    "Brownie dough dessert line served with vanilla ice cream.",
    [
      ["Plain Brownie Dough", 5.49, "Served with vanilla ice cream."],
      ["Oreo Brownie Dough", 7.99, "Served with vanilla ice cream."],
      ["Biscoff Brownie Dough", 7.99, "Served with vanilla ice cream."],
      ["Kinder Bueno Brownie Dough", 7.99, "Served with vanilla ice cream."],
      ["Pistachio Brownie Dough", 7.99, "Served with vanilla ice cream."],
      ["Milky Bar Brownie Dough", 7.99, "Served with vanilla ice cream."],
      ["Milky Way Brownie Dough", 7.99, "Served with vanilla ice cream."],
    ],
    "none",
    loadedMunchSectionImageUrls["brownie-dough"],
  ),
  buildSection(
    "shakes",
    "Shakes",
    "455ml shakes made to perfection.",
    [
      ["Vanilla Shake", 4.99, "455ml vanilla shake."],
      ["Biscoff Shake", 4.99, "455ml Biscoff shake."],
      ["Oreo Shake", 4.99, "455ml Oreo shake."],
      ["Kinder Bueno Shake", 4.99, "455ml Kinder Bueno shake."],
      ["Skittle Shake", 4.99, "455ml Skittle shake."],
      ["Raspberry & White Chocolate Shake", 4.99, "455ml raspberry and white chocolate shake."],
      ["Milky Bar Shake", 4.99, "455ml Milky Bar shake."],
      ["Milky Way Shake", 4.99, "455ml Milky Way shake."],
    ],
    "none",
    loadedMunchSectionImageUrls["shakes"],
  ),
  buildSection(
    "refreshers",
    "Refreshers",
    "455ml cold refresher drinks.",
    [
      ["Raspberry & Lemon Refresher", 3.99, "455ml raspberry and lemon refresher."],
      ["Strawberry & Lemon Refresher", 3.99, "455ml strawberry and lemon refresher."],
      ["Mango & Passion Fruit Refresher", 3.99, "455ml mango and passion fruit refresher."],
      ["Pineapple & Guava Refresher", 3.99, "455ml pineapple and guava refresher."],
    ],
    "none",
    loadedMunchSectionImageUrls["refreshers"],
  ),
  buildSection(
    "soft-drinks",
    "Soft Drinks",
    "Soft drink options and bottled extras.",
    [
      ["Drinks", 1.5, "Choice of 330ml drink."],
      ["Redbull", 2.19, "250ml Redbull.", true],
      ["Water", 0.99, "500ml water."],
    ],
    "none",
    loadedMunchSectionImageUrls["soft-drinks"],
  ),
];

export const loadedMunchMenuItems = loadedMunchMenuSections.flatMap((section) => section.items);
