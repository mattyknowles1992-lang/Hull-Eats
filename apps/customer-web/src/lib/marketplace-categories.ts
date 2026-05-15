import type { StoreSummary } from "@hull-eats/types";

import {
  marketplaceCategoryHeroImages,
  marketplaceMainCategoryImageBySlug,
  marketplaceSubcategoryImage,
} from "./marketplace-category-brand-images";

export type MarketplaceCategory = {
  slug: string;
  label: string;
  shortLabel: string;
  description: string;
  searchPlaceholder: string;
  imageUrl: string;
  heroImages: string[];
  storeTypes?: StoreSummary["type"][];
  keywords: string[];
  subcategories: MarketplaceSubcategory[];
};

export type MarketplaceSubcategory = {
  slug: string;
  label: string;
  imageUrl: string;
  keywords: string[];
};

const createSubcategory = (parentSlug: string, label: string, keywords: string[]): MarketplaceSubcategory => ({
  slug: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  label,
  imageUrl: marketplaceSubcategoryImage(parentSlug, label),
  keywords,
});

export const marketplaceCategories: MarketplaceCategory[] = [
  {
    slug: "takeaways",
    label: "Takeaways",
    shortLabel: "Takeaways",
    description: "Burgers, pizza, chicken, kebabs, curries, wraps, loaded fries, and late-night favourites.",
    searchPlaceholder: "Search takeaways, burgers, pizza, chicken...",
    imageUrl: marketplaceMainCategoryImageBySlug.takeaways,
    heroImages: marketplaceCategoryHeroImages("takeaways"),
    storeTypes: ["takeaway", "restaurant"],
    keywords: ["takeaway", "burger", "pizza", "chicken", "kebab", "fries", "wrap", "late"],
    subcategories: [
      createSubcategory("takeaways", "Burgers", ["burger", "smash", "cheeseburger"]),
      createSubcategory("takeaways", "Chicken", ["chicken", "wings", "strips"]),
      createSubcategory("takeaways", "Pizza", ["pizza", "pepperoni", "margherita"]),
      createSubcategory("takeaways", "Kebabs", ["kebab", "doner", "shawarma"]),
      createSubcategory("takeaways", "Loaded fries", ["loaded fries", "fries", "chips"]),
      createSubcategory("takeaways", "Curries", ["curry", "masala", "madras"]),
      createSubcategory("takeaways", "Wraps", ["wrap", "burrito"]),
      createSubcategory("takeaways", "Desserts", ["dessert", "waffle", "cookie"]),
    ],
  },
  {
    slug: "restaurants",
    label: "Restaurants",
    shortLabel: "Restaurants",
    description: "Local kitchens, sit-down favourites, comfort food, specials, and proper dinner plans.",
    searchPlaceholder: "Search restaurants, kitchens, dinner...",
    imageUrl: marketplaceMainCategoryImageBySlug.restaurants,
    heroImages: marketplaceCategoryHeroImages("restaurants"),
    storeTypes: ["restaurant"],
    keywords: ["restaurant", "kitchen", "dinner", "lunch", "comfort"],
    subcategories: [
      createSubcategory("restaurants", "Modern comfort", ["comfort", "special", "kitchen"]),
      createSubcategory("restaurants", "Breakfast", ["breakfast", "brunch"]),
      createSubcategory("restaurants", "Lunch", ["lunch", "salad", "sandwich"]),
      createSubcategory("restaurants", "Dinner", ["dinner", "main", "meal"]),
      createSubcategory("restaurants", "Family meals", ["family", "bundle", "sharing"]),
      createSubcategory("restaurants", "Healthy", ["healthy", "salad", "grill"]),
      createSubcategory("restaurants", "Local specials", ["special", "seasonal", "local"]),
    ],
  },
  {
    slug: "groceries",
    label: "Groceries",
    shortLabel: "Groceries",
    description: "Essentials, snacks, drinks, cupboard staples, household items, and convenience runs.",
    searchPlaceholder: "Search groceries, snacks, drinks...",
    imageUrl: marketplaceMainCategoryImageBySlug.groceries,
    heroImages: marketplaceCategoryHeroImages("groceries"),
    storeTypes: ["shop"],
    keywords: ["grocery", "groceries", "shop", "snacks", "drinks", "essentials", "convenience"],
    subcategories: [
      createSubcategory("groceries", "Fresh food", ["fresh", "fruit", "veg"]),
      createSubcategory("groceries", "Snacks", ["snack", "crisps", "sweets"]),
      createSubcategory("groceries", "Drinks", ["drink", "cola", "water", "juice"]),
      createSubcategory("groceries", "Household", ["household", "cleaning", "toilet"]),
      createSubcategory("groceries", "Cupboard", ["cupboard", "pasta", "rice", "tinned"]),
      createSubcategory("groceries", "Frozen", ["frozen", "ice cream"]),
      createSubcategory("groceries", "Convenience", ["convenience", "essentials"]),
    ],
  },
  {
    slug: "bakery",
    label: "Bakery",
    shortLabel: "Bakery",
    description: "Fresh bread, pastries, cakes, savouries, breakfast bakes, and sweet boxes.",
    searchPlaceholder: "Search bakery, cakes, pastries...",
    imageUrl: marketplaceMainCategoryImageBySlug.bakery,
    heroImages: marketplaceCategoryHeroImages("bakery"),
    storeTypes: ["shop"],
    keywords: ["bakery", "bread", "pastry", "cake", "cakes", "cookie", "dessert"],
    subcategories: [
      createSubcategory("bakery", "Bread", ["bread", "loaf", "sourdough"]),
      createSubcategory("bakery", "Pastries", ["pastry", "croissant"]),
      createSubcategory("bakery", "Cakes", ["cake", "cakes"]),
      createSubcategory("bakery", "Cookies", ["cookie", "cookies"]),
      createSubcategory("bakery", "Savouries", ["savoury", "pie", "pasty"]),
      createSubcategory("bakery", "Breakfast bakes", ["breakfast", "bake"]),
    ],
  },
  {
    slug: "butcher",
    label: "Butcher",
    shortLabel: "Butcher",
    description: "Fresh meat, meal packs, breakfast boxes, barbecue cuts, and local counter orders.",
    searchPlaceholder: "Search butcher, meat, meal packs...",
    imageUrl: marketplaceMainCategoryImageBySlug.butcher,
    heroImages: marketplaceCategoryHeroImages("butcher"),
    storeTypes: ["shop"],
    keywords: ["butcher", "meat", "steak", "chicken", "sausages", "bbq", "breakfast"],
    subcategories: [
      createSubcategory("butcher", "Meal packs", ["meal pack", "box", "bundle"]),
      createSubcategory("butcher", "Chicken", ["chicken"]),
      createSubcategory("butcher", "Steak", ["steak", "sirloin", "ribeye"]),
      createSubcategory("butcher", "Sausages", ["sausage", "sausages"]),
      createSubcategory("butcher", "Breakfast", ["breakfast", "bacon"]),
      createSubcategory("butcher", "BBQ", ["bbq", "barbecue", "grill"]),
      createSubcategory("butcher", "Marinades", ["marinade", "seasoned"]),
    ],
  },
  {
    slug: "alcohol",
    label: "Alcohol",
    shortLabel: "Alcohol",
    description: "Beer, wine, spirits, mixers, party bundles, and licensed local delivery.",
    searchPlaceholder: "Search beer, wine, spirits...",
    imageUrl: marketplaceMainCategoryImageBySlug.alcohol,
    heroImages: marketplaceCategoryHeroImages("alcohol"),
    storeTypes: ["shop"],
    keywords: ["alcohol", "beer", "wine", "spirits", "vodka", "whisky", "gin", "mixers"],
    subcategories: [
      createSubcategory("alcohol", "Beer", ["beer", "lager", "ale"]),
      createSubcategory("alcohol", "Wine", ["wine", "prosecco"]),
      createSubcategory("alcohol", "Spirits", ["spirit", "vodka", "gin", "whisky", "rum"]),
      createSubcategory("alcohol", "Cider", ["cider"]),
      createSubcategory("alcohol", "Mixers", ["mixer", "tonic", "cola"]),
      createSubcategory("alcohol", "Bundles", ["bundle", "party"]),
      createSubcategory("alcohol", "No alcohol", ["zero", "no alcohol", "soft"]),
    ],
  },
  {
    slug: "vapes",
    label: "Vapes",
    shortLabel: "Vapes",
    description: "Vape stores, refills, accessories, and compliant local delivery where available.",
    searchPlaceholder: "Search vapes, refills, accessories...",
    imageUrl: marketplaceMainCategoryImageBySlug.vapes,
    heroImages: marketplaceCategoryHeroImages("vapes"),
    storeTypes: ["shop"],
    keywords: ["vape", "vapes", "refill", "eliquid", "pods", "accessories"],
    subcategories: [
      createSubcategory("vapes", "Devices", ["device", "vape"]),
      createSubcategory("vapes", "Pods", ["pod", "pods"]),
      createSubcategory("vapes", "Liquids", ["liquid", "eliquid", "refill"]),
      createSubcategory("vapes", "Accessories", ["accessory", "charger"]),
      createSubcategory("vapes", "Bundles", ["bundle", "kit"]),
    ],
  },
  {
    slug: "convenience",
    label: "Convenience",
    shortLabel: "Convenience",
    description: "Corner-shop runs, drinks, snacks, household basics, and everyday last-minute needs.",
    searchPlaceholder: "Search convenience, drinks, snacks...",
    imageUrl: marketplaceMainCategoryImageBySlug.convenience,
    heroImages: marketplaceCategoryHeroImages("convenience"),
    storeTypes: ["shop"],
    keywords: ["convenience", "corner", "snacks", "drinks", "essentials", "shop"],
    subcategories: [
      createSubcategory("convenience", "Drinks", ["drink", "cola", "water"]),
      createSubcategory("convenience", "Snacks", ["snack", "crisps"]),
      createSubcategory("convenience", "Essentials", ["essential", "milk", "bread"]),
      createSubcategory("convenience", "Household", ["household", "cleaning"]),
      createSubcategory("convenience", "Sweets", ["sweet", "sweets", "chocolate"]),
      createSubcategory("convenience", "Ice cream", ["ice cream", "gelato"]),
    ],
  },
  {
    slug: "desserts",
    label: "Desserts",
    shortLabel: "Desserts",
    description: "Waffles, churros, cookie dough, ice cream, cakes, shakes, and sweet fixes.",
    searchPlaceholder: "Search waffles, churros, cookie dough...",
    imageUrl: marketplaceMainCategoryImageBySlug.desserts,
    heroImages: marketplaceCategoryHeroImages("desserts"),
    storeTypes: ["takeaway", "restaurant", "shop"],
    keywords: ["dessert", "desserts", "waffle", "churro", "cookie", "ice cream", "cake", "shake"],
    subcategories: [
      createSubcategory("desserts", "Waffles", ["waffle", "waffles"]),
      createSubcategory("desserts", "Cookie dough", ["cookie dough", "cookie"]),
      createSubcategory("desserts", "Churros", ["churro", "churros"]),
      createSubcategory("desserts", "Ice cream", ["ice cream", "gelato"]),
      createSubcategory("desserts", "Cakes", ["cake", "cakes"]),
      createSubcategory("desserts", "Milkshakes", ["milkshake", "shake"]),
    ],
  },
  {
    slug: "speciality",
    label: "Speciality",
    shortLabel: "Speciality",
    description: "Cheese, deli counters, local makers, premium treats, and harder-to-find favourites.",
    searchPlaceholder: "Search speciality, deli, cheese, local makers...",
    imageUrl: marketplaceMainCategoryImageBySlug.speciality,
    heroImages: marketplaceCategoryHeroImages("speciality"),
    storeTypes: ["shop", "restaurant"],
    keywords: ["speciality", "specialty", "deli", "cheese", "artisan", "local", "premium"],
    subcategories: [
      createSubcategory("speciality", "Deli", ["deli", "counter"]),
      createSubcategory("speciality", "Cheese", ["cheese", "cheddar", "brie"]),
      createSubcategory("speciality", "Artisan", ["artisan", "maker", "local"]),
      createSubcategory("speciality", "Premium treats", ["premium", "treat", "luxury"]),
      createSubcategory("speciality", "Hampers", ["hamper", "gift", "box"]),
      createSubcategory("speciality", "Local makers", ["local", "maker", "craft"]),
    ],
  },
  {
    slug: "electronics",
    label: "Electronics",
    shortLabel: "Electronics",
    description: "Chargers, cables, headphones, phone accessories, small tech, and urgent replacements.",
    searchPlaceholder: "Search chargers, cables, headphones...",
    imageUrl: marketplaceMainCategoryImageBySlug.electronics,
    heroImages: marketplaceCategoryHeroImages("electronics"),
    storeTypes: ["shop"],
    keywords: ["electronics", "charger", "cable", "headphones", "phone", "tech", "accessories"],
    subcategories: [
      createSubcategory("electronics", "Chargers", ["charger", "charging"]),
      createSubcategory("electronics", "Cables", ["cable", "usb"]),
      createSubcategory("electronics", "Headphones", ["headphones", "earbuds"]),
      createSubcategory("electronics", "Phone accessories", ["phone", "case", "screen"]),
      createSubcategory("electronics", "Batteries", ["battery", "batteries"]),
      createSubcategory("electronics", "Small tech", ["tech", "gadget"]),
    ],
  },
  {
    slug: "gifts",
    label: "Gifts",
    shortLabel: "Gifts",
    description: "Flowers, treat boxes, cards, celebration bundles, and local gift delivery.",
    searchPlaceholder: "Search gifts, flowers, treat boxes...",
    imageUrl: marketplaceMainCategoryImageBySlug.gifts,
    heroImages: marketplaceCategoryHeroImages("gifts"),
    storeTypes: ["shop"],
    keywords: ["gift", "gifts", "flowers", "cards", "treat", "celebration"],
    subcategories: [
      createSubcategory("gifts", "Flowers", ["flower", "flowers"]),
      createSubcategory("gifts", "Cards", ["card", "cards"]),
      createSubcategory("gifts", "Treat boxes", ["treat", "box", "gift"]),
      createSubcategory("gifts", "Celebrations", ["celebration", "birthday"]),
      createSubcategory("gifts", "Self-care", ["self care", "bath", "care"]),
    ],
  },
];

export function getMarketplaceCategory(slug: string) {
  return marketplaceCategories.find((category) => category.slug === slug);
}

export function storeMatchesMarketplaceCategory(store: StoreSummary, category: MarketplaceCategory, searchableText: string) {
  const typeMatch = !category.storeTypes?.length || category.storeTypes.includes(store.type);
  const mappedKeywords = [
    ...category.keywords,
    ...category.subcategories.flatMap((subcategory) => [subcategory.label, ...subcategory.keywords]),
  ];
  const keywordMatch = mappedKeywords.some((keyword) => searchableText.includes(keyword.toLowerCase()));

  return typeMatch && keywordMatch;
}

export function textMatchesMarketplaceSubcategory(searchableText: string, subcategory: MarketplaceSubcategory) {
  return [subcategory.label, ...subcategory.keywords].some((keyword) => searchableText.includes(keyword.toLowerCase()));
}
