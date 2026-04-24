import type { MenuItem, StoreSummary } from "@hull-eats/types";

export type DemoMenuSection = {
  id: string;
  name: string;
  description?: string;
  items: MenuItem[];
};

const makeItemId = (categoryId: string, name: string) =>
  `${categoryId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;

const createMenuItem = (
  categoryId: string,
  name: string,
  price: number,
  description: string,
  sortOrder: number,
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
  sortOrder,
});

const buildSection = (
  id: string,
  name: string,
  description: string,
  entries: Array<[name: string, price: number, description: string]>,
): DemoMenuSection => ({
  id,
  name,
  description,
  items: entries.map(([entryName, price, entryDescription], index) =>
    createMenuItem(id, entryName, price, entryDescription, index),
  ),
});

export const loadedMunchStore: StoreSummary = {
  id: "store_loaded_munch_hull",
  merchantId: "business_loaded_munch",
  slug: "loaded-munch-hull",
  name: "Loaded Munch",
  type: "takeaway",
  storefrontStatus: "live",
  city: "Hull",
  postcode: "HU5 5LT",
  isOpen: true,
  cuisineLabel: "Loaded burgers, dogs, fries and desserts",
  etaMinutes: 25,
  deliveryFee: 3.49,
  minimumOrderAmount: 0,
  menuSetupComplete: true,
  onboardingMessage:
    "Launch partner takeaway with a live seeded menu. Ongoing edits, prices, images, and availability still belong only in the merchant hub.",
  heroImageUrl: "/stores/loaded-munch/hero.webp",
  logoImageUrl: "/stores/loaded-munch/logo.gif",
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
  ),
  buildSection(
    "soft-drinks",
    "Soft Drinks",
    "Soft drink options and bottled extras.",
    [
      ["Drinks", 1.5, "Choice of 330ml drink."],
      ["Redbull", 2.19, "250ml Redbull."],
      ["Water", 0.99, "500ml water."],
    ],
  ),
];

export const loadedMunchMenuItems = loadedMunchMenuSections.flatMap((section) => section.items);
