import type { StoreSummary } from "@hull-eats/types";

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
  subcategories: string[];
};

export const marketplaceCategories: MarketplaceCategory[] = [
  {
    slug: "takeaways",
    label: "Takeaways",
    shortLabel: "Takeaways",
    description: "Burgers, pizza, chicken, kebabs, curries, wraps, loaded fries, and late-night favourites.",
    searchPlaceholder: "Search takeaways, burgers, pizza, chicken...",
    imageUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=800&q=80",
    heroImages: [
      "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=1200&q=80",
    ],
    storeTypes: ["takeaway", "restaurant"],
    keywords: ["takeaway", "burger", "pizza", "chicken", "kebab", "fries", "wrap", "late"],
    subcategories: ["Burgers", "Chicken", "Pizza", "Kebabs", "Loaded fries", "Curries", "Wraps", "Desserts"],
  },
  {
    slug: "restaurants",
    label: "Restaurants",
    shortLabel: "Restaurants",
    description: "Local kitchens, sit-down favourites, comfort food, specials, and proper dinner plans.",
    searchPlaceholder: "Search restaurants, kitchens, dinner...",
    imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
    heroImages: [
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80",
    ],
    storeTypes: ["restaurant"],
    keywords: ["restaurant", "kitchen", "dinner", "lunch", "comfort"],
    subcategories: ["Modern comfort", "Breakfast", "Lunch", "Dinner", "Family meals", "Healthy", "Local specials"],
  },
  {
    slug: "groceries",
    label: "Groceries",
    shortLabel: "Groceries",
    description: "Essentials, snacks, drinks, cupboard staples, household items, and convenience runs.",
    searchPlaceholder: "Search groceries, snacks, drinks...",
    imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
    heroImages: [
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1543168256-418811576931?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=1200&q=80",
    ],
    storeTypes: ["shop"],
    keywords: ["grocery", "groceries", "shop", "snacks", "drinks", "essentials", "convenience"],
    subcategories: ["Fresh food", "Snacks", "Drinks", "Household", "Cupboard", "Frozen", "Convenience"],
  },
  {
    slug: "bakery",
    label: "Bakery",
    shortLabel: "Bakery",
    description: "Fresh bread, pastries, cakes, savouries, breakfast bakes, and sweet boxes.",
    searchPlaceholder: "Search bakery, cakes, pastries...",
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
    heroImages: [
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1519682577862-22b62b24e493?auto=format&fit=crop&w=1200&q=80",
    ],
    storeTypes: ["shop"],
    keywords: ["bakery", "bread", "pastry", "cake", "cakes", "cookie", "dessert"],
    subcategories: ["Bread", "Pastries", "Cakes", "Cookies", "Savouries", "Breakfast bakes"],
  },
  {
    slug: "butcher",
    label: "Butcher",
    shortLabel: "Butcher",
    description: "Fresh meat, meal packs, breakfast boxes, barbecue cuts, and local counter orders.",
    searchPlaceholder: "Search butcher, meat, meal packs...",
    imageUrl: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80",
    heroImages: [
      "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1551028150-64b9f398f678?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=1200&q=80",
    ],
    storeTypes: ["shop"],
    keywords: ["butcher", "meat", "steak", "chicken", "sausages", "bbq", "breakfast"],
    subcategories: ["Meal packs", "Chicken", "Steak", "Sausages", "Breakfast", "BBQ", "Marinades"],
  },
  {
    slug: "alcohol",
    label: "Alcohol",
    shortLabel: "Alcohol",
    description: "Beer, wine, spirits, mixers, party bundles, and licensed local delivery.",
    searchPlaceholder: "Search beer, wine, spirits...",
    imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80",
    heroImages: [
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80",
    ],
    storeTypes: ["shop"],
    keywords: ["alcohol", "beer", "wine", "spirits", "vodka", "whisky", "gin", "mixers"],
    subcategories: ["Beer", "Wine", "Spirits", "Cider", "Mixers", "Bundles", "No alcohol"],
  },
  {
    slug: "vapes",
    label: "Vapes",
    shortLabel: "Vapes",
    description: "Vape stores, refills, accessories, and compliant local delivery where available.",
    searchPlaceholder: "Search vapes, refills, accessories...",
    imageUrl: "https://images.unsplash.com/photo-1527156231393-7023794f363c?auto=format&fit=crop&w=800&q=80",
    heroImages: [
      "https://images.unsplash.com/photo-1527156231393-7023794f363c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1516542076529-1ea3854896f2?auto=format&fit=crop&w=1200&q=80",
    ],
    storeTypes: ["shop"],
    keywords: ["vape", "vapes", "refill", "eliquid", "pods", "accessories"],
    subcategories: ["Devices", "Pods", "Liquids", "Accessories", "Bundles"],
  },
  {
    slug: "convenience",
    label: "Convenience",
    shortLabel: "Convenience",
    description: "Corner-shop runs, drinks, snacks, household basics, and everyday last-minute needs.",
    searchPlaceholder: "Search convenience, drinks, snacks...",
    imageUrl: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=800&q=80",
    heroImages: [
      "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=1200&q=80",
    ],
    storeTypes: ["shop"],
    keywords: ["convenience", "corner", "snacks", "drinks", "essentials", "shop"],
    subcategories: ["Drinks", "Snacks", "Essentials", "Household", "Sweets", "Ice cream"],
  },
  {
    slug: "desserts",
    label: "Desserts",
    shortLabel: "Desserts",
    description: "Waffles, churros, cookie dough, ice cream, cakes, shakes, and sweet fixes.",
    searchPlaceholder: "Search waffles, churros, cookie dough...",
    imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80",
    heroImages: [
      "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=80",
    ],
    storeTypes: ["takeaway", "restaurant", "shop"],
    keywords: ["dessert", "desserts", "waffle", "churro", "cookie", "ice cream", "cake", "shake"],
    subcategories: ["Waffles", "Cookie dough", "Churros", "Ice cream", "Cakes", "Milkshakes"],
  },
  {
    slug: "gifts",
    label: "Gifts",
    shortLabel: "Gifts",
    description: "Flowers, treat boxes, cards, celebration bundles, and local gift delivery.",
    searchPlaceholder: "Search gifts, flowers, treat boxes...",
    imageUrl: "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=800&q=80",
    heroImages: [
      "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1200&q=80",
    ],
    storeTypes: ["shop"],
    keywords: ["gift", "gifts", "flowers", "cards", "treat", "celebration"],
    subcategories: ["Flowers", "Cards", "Treat boxes", "Celebrations", "Self-care"],
  },
];

export function getMarketplaceCategory(slug: string) {
  return marketplaceCategories.find((category) => category.slug === slug);
}

export function storeMatchesMarketplaceCategory(store: StoreSummary, category: MarketplaceCategory, searchableText: string) {
  const typeMatch = !category.storeTypes?.length || category.storeTypes.includes(store.type);
  const keywordMatch = category.keywords.some((keyword) => searchableText.includes(keyword.toLowerCase()));

  return typeMatch && keywordMatch;
}
