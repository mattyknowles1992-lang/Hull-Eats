import type { StoreSummary } from "@hull-eats/types";

import { resolveBrandCategoryImage } from "./marketplace-category-brand-images";

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

const createSubcategory = (label: string, keywords: string[], fallbackImageUrl: string): MarketplaceSubcategory => {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return {
    slug,
    label,
    imageUrl: resolveBrandCategoryImage([slug, label], fallbackImageUrl),
    keywords,
  };
};

type PrimaryVisualArgs = {
  slug: string;
  label: string;
  shortLabel: string;
  chipFallback800: string;
  heroFirstFallback1200: string;
  heroSecond: string;
  heroThird: string;
  /**
   * Extra strings checked against `public/brand/category_images/<stem>.png` when the slug/label
   * does not normalize to the filename (e.g. main category `takeaways` → stem `takeaway.png`).
   */
  brandMatchHints?: readonly string[];
};

/** Local brand PNG replaces category chip, portrait carousel tile, and first hero slide when any candidate matches a file stem; hero slides 2–3 stay Unsplash. */
function primaryCategoryVisuals(args: PrimaryVisualArgs): Pick<MarketplaceCategory, "imageUrl" | "heroImages"> {
  const candidates = [args.slug, args.label, args.shortLabel, ...(args.brandMatchHints ?? [])];
  return {
    imageUrl: resolveBrandCategoryImage(candidates, args.chipFallback800),
    heroImages: [
      resolveBrandCategoryImage(candidates, args.heroFirstFallback1200),
      args.heroSecond,
      args.heroThird,
    ],
  };
}

export const marketplaceCategories: MarketplaceCategory[] = [
  {
    slug: "takeaways",
    label: "Takeaways",
    shortLabel: "Takeaways",
    description: "Burgers, pizza, chicken, kebabs, curries, wraps, loaded fries, and late-night favourites.",
    searchPlaceholder: "Search takeaways, burgers, pizza, chicken...",
    ...primaryCategoryVisuals({
      slug: "takeaways",
      label: "Takeaways",
      shortLabel: "Takeaways",
      brandMatchHints: ["takeaway"],
      chipFallback800: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=800&q=80",
      heroFirstFallback1200: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=1200&q=80",
      heroSecond: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80",
      heroThird: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=1200&q=80",
    }),
    storeTypes: ["takeaway", "restaurant"],
    keywords: ["takeaway", "burger", "pizza", "chicken", "kebab", "fries", "wrap", "late"],
    subcategories: [
      createSubcategory("Burgers", ["burger", "smash", "cheeseburger"], "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Chicken", ["chicken", "wings", "strips"], "https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Pizza", ["pizza", "pepperoni", "margherita"], "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Kebabs", ["kebab", "doner", "shawarma"], "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Loaded fries", ["loaded fries", "fries", "chips"], "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Curries", ["curry", "masala", "madras"], "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Wraps", ["wrap", "burrito"], "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Desserts", ["dessert", "waffle", "cookie"], "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=500&q=80"),
    ],
  },
  {
    slug: "restaurants",
    label: "Restaurants",
    shortLabel: "Restaurants",
    description: "Local kitchens, sit-down favourites, comfort food, specials, and proper dinner plans.",
    searchPlaceholder: "Search restaurants, kitchens, dinner...",
    ...primaryCategoryVisuals({
      slug: "restaurants",
      label: "Restaurants",
      shortLabel: "Restaurants",
      chipFallback800: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
      heroFirstFallback1200: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
      heroSecond: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
      heroThird: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80",
    }),
    storeTypes: ["restaurant"],
    keywords: ["restaurant", "kitchen", "dinner", "lunch", "comfort"],
    subcategories: [
      createSubcategory("Modern comfort", ["comfort", "special", "kitchen"], "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Breakfast", ["breakfast", "brunch"], "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Lunch", ["lunch", "salad", "sandwich"], "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Dinner", ["dinner", "main", "meal"], "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Family meals", ["family", "bundle", "sharing"], "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Healthy", ["healthy", "salad", "grill"], "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Local specials", ["special", "seasonal", "local"], "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=500&q=80"),
    ],
  },
  {
    slug: "groceries",
    label: "Groceries",
    shortLabel: "Groceries",
    description: "Essentials, snacks, drinks, cupboard staples, household items, and convenience runs.",
    searchPlaceholder: "Search groceries, snacks, drinks...",
    ...primaryCategoryVisuals({
      slug: "groceries",
      label: "Groceries",
      shortLabel: "Groceries",
      chipFallback800: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
      heroFirstFallback1200: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
      heroSecond: "https://images.unsplash.com/photo-1543168256-418811576931?auto=format&fit=crop&w=1200&q=80",
      heroThird: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=1200&q=80",
    }),
    storeTypes: ["shop"],
    keywords: ["grocery", "groceries", "shop", "snacks", "drinks", "essentials", "convenience"],
    subcategories: [
      createSubcategory("Fresh food", ["fresh", "fruit", "veg"], "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Snacks", ["snack", "crisps", "sweets"], "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Drinks", ["drink", "cola", "water", "juice"], "https://images.unsplash.com/photo-1596803244618-8dbee441d70b?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Household", ["household", "cleaning", "toilet"], "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Cupboard", ["cupboard", "pasta", "rice", "tinned"], "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Frozen", ["frozen", "ice cream"], "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Convenience", ["convenience", "essentials"], "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=500&q=80"),
    ],
  },
  {
    slug: "bakery",
    label: "Bakery",
    shortLabel: "Bakery",
    description: "Fresh bread, pastries, cakes, savouries, breakfast bakes, and sweet boxes.",
    searchPlaceholder: "Search bakery, cakes, pastries...",
    ...primaryCategoryVisuals({
      slug: "bakery",
      label: "Bakery",
      shortLabel: "Bakery",
      chipFallback800: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
      heroFirstFallback1200: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
      heroSecond: "https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?auto=format&fit=crop&w=1200&q=80",
      heroThird: "https://images.unsplash.com/photo-1519682577862-22b62b24e493?auto=format&fit=crop&w=1200&q=80",
    }),
    storeTypes: ["shop"],
    keywords: ["bakery", "bread", "pastry", "cake", "cakes", "cookie", "dessert"],
    subcategories: [
      createSubcategory("Bread", ["bread", "loaf", "sourdough"], "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Pastries", ["pastry", "croissant"], "https://images.unsplash.com/photo-1519682577862-22b62b24e493?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Cakes", ["cake", "cakes"], "https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Cookies", ["cookie", "cookies"], "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Savouries", ["savoury", "pie", "pasty"], "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Breakfast bakes", ["breakfast", "bake"], "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=500&q=80"),
    ],
  },
  {
    slug: "butcher",
    label: "Butcher",
    shortLabel: "Butcher",
    description: "Fresh meat, meal packs, breakfast boxes, barbecue cuts, and local counter orders.",
    searchPlaceholder: "Search butcher, meat, meal packs...",
    ...primaryCategoryVisuals({
      slug: "butcher",
      label: "Butcher",
      shortLabel: "Butcher",
      chipFallback800: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80",
      heroFirstFallback1200: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=1200&q=80",
      heroSecond: "https://images.unsplash.com/photo-1551028150-64b9f398f678?auto=format&fit=crop&w=1200&q=80",
      heroThird: "https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=1200&q=80",
    }),
    storeTypes: ["shop"],
    keywords: ["butcher", "meat", "steak", "chicken", "sausages", "bbq", "breakfast"],
    subcategories: [
      createSubcategory("Meal packs", ["meal pack", "box", "bundle"], "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Chicken", ["chicken"], "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Steak", ["steak", "sirloin", "ribeye"], "https://images.unsplash.com/photo-1551028150-64b9f398f678?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Sausages", ["sausage", "sausages"], "https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Breakfast", ["breakfast", "bacon"], "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("BBQ", ["bbq", "barbecue", "grill"], "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Marinades", ["marinade", "seasoned"], "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=500&q=80"),
    ],
  },
  {
    slug: "alcohol",
    label: "Alcohol",
    shortLabel: "Alcohol",
    description: "Beer, wine, spirits, mixers, party bundles, and licensed local delivery.",
    searchPlaceholder: "Search beer, wine, spirits...",
    ...primaryCategoryVisuals({
      slug: "alcohol",
      label: "Alcohol",
      shortLabel: "Alcohol",
      chipFallback800: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80",
      heroFirstFallback1200: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80",
      heroSecond: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=1200&q=80",
      heroThird: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80",
    }),
    storeTypes: ["shop"],
    keywords: ["alcohol", "beer", "wine", "spirits", "vodka", "whisky", "gin", "mixers"],
    subcategories: [
      createSubcategory("Beer", ["beer", "lager", "ale"], "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Wine", ["wine", "prosecco"], "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Spirits", ["spirit", "vodka", "gin", "whisky", "rum"], "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Cider", ["cider"], "https://images.unsplash.com/photo-1567696911980-2eed69a46042?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Mixers", ["mixer", "tonic", "cola"], "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Bundles", ["bundle", "party"], "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("No alcohol", ["zero", "no alcohol", "soft"], "https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=500&q=80"),
    ],
  },
  {
    slug: "vapes",
    label: "Vapes",
    shortLabel: "Vapes",
    description: "Vape stores, refills, accessories, and compliant local delivery where available.",
    searchPlaceholder: "Search vapes, refills, accessories...",
    ...primaryCategoryVisuals({
      slug: "vapes",
      label: "Vapes",
      shortLabel: "Vapes",
      chipFallback800: "https://images.unsplash.com/photo-1527156231393-7023794f363c?auto=format&fit=crop&w=800&q=80",
      heroFirstFallback1200: "https://images.unsplash.com/photo-1527156231393-7023794f363c?auto=format&fit=crop&w=1200&q=80",
      heroSecond: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1200&q=80",
      heroThird: "https://images.unsplash.com/photo-1516542076529-1ea3854896f2?auto=format&fit=crop&w=1200&q=80",
    }),
    storeTypes: ["shop"],
    keywords: ["vape", "vapes", "refill", "eliquid", "pods", "accessories"],
    subcategories: [
      createSubcategory("Devices", ["device", "vape"], "https://images.unsplash.com/photo-1527156231393-7023794f363c?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Pods", ["pod", "pods"], "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Liquids", ["liquid", "eliquid", "refill"], "https://images.unsplash.com/photo-1516542076529-1ea3854896f2?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Accessories", ["accessory", "charger"], "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Bundles", ["bundle", "kit"], "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=500&q=80"),
    ],
  },
  {
    slug: "convenience",
    label: "Convenience",
    shortLabel: "Convenience",
    description: "Corner-shop runs, drinks, snacks, household basics, and everyday last-minute needs.",
    searchPlaceholder: "Search convenience, drinks, snacks...",
    ...primaryCategoryVisuals({
      slug: "convenience",
      label: "Convenience",
      shortLabel: "Convenience",
      chipFallback800: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=800&q=80",
      heroFirstFallback1200: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=1200&q=80",
      heroSecond: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80",
      heroThird: "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=1200&q=80",
    }),
    storeTypes: ["shop"],
    keywords: ["convenience", "corner", "snacks", "drinks", "essentials", "shop"],
    subcategories: [
      createSubcategory("Drinks", ["drink", "cola", "water"], "https://images.unsplash.com/photo-1596803244618-8dbee441d70b?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Snacks", ["snack", "crisps"], "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Essentials", ["essential", "milk", "bread"], "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Household", ["household", "cleaning"], "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Sweets", ["sweet", "sweets", "chocolate"], "https://images.unsplash.com/photo-1581798459219-318e76aecc7b?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Ice cream", ["ice cream", "gelato"], "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=500&q=80"),
    ],
  },
  {
    slug: "desserts",
    label: "Desserts",
    shortLabel: "Desserts",
    description: "Waffles, churros, cookie dough, ice cream, cakes, shakes, and sweet fixes.",
    searchPlaceholder: "Search waffles, churros, cookie dough...",
    ...primaryCategoryVisuals({
      slug: "desserts",
      label: "Desserts",
      shortLabel: "Desserts",
      chipFallback800: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80",
      heroFirstFallback1200: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=1200&q=80",
      heroSecond: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=80",
      heroThird: "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=80",
    }),
    storeTypes: ["takeaway", "restaurant", "shop"],
    keywords: ["dessert", "desserts", "waffle", "churro", "cookie", "ice cream", "cake", "shake"],
    subcategories: [
      createSubcategory("Waffles", ["waffle", "waffles"], "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Cookie dough", ["cookie dough", "cookie"], "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Churros", ["churro", "churros"], "https://images.unsplash.com/photo-1624371414361-e670edf4898d?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Ice cream", ["ice cream", "gelato"], "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Cakes", ["cake", "cakes"], "https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Milkshakes", ["milkshake", "shake"], "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=500&q=80"),
    ],
  },
  {
    slug: "speciality",
    label: "Speciality",
    shortLabel: "Speciality",
    description: "Cheese, deli counters, local makers, premium treats, and harder-to-find favourites.",
    searchPlaceholder: "Search speciality, deli, cheese, local makers...",
    ...primaryCategoryVisuals({
      slug: "speciality",
      label: "Speciality",
      shortLabel: "Speciality",
      chipFallback800: "https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=800&q=80",
      heroFirstFallback1200: "https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=1200&q=80",
      heroSecond: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=1200&q=80",
      heroThird: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=1200&q=80",
    }),
    storeTypes: ["shop", "restaurant"],
    keywords: ["speciality", "specialty", "deli", "cheese", "artisan", "local", "premium"],
    subcategories: [
      createSubcategory("Deli", ["deli", "counter"], "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Cheese", ["cheese", "cheddar", "brie"], "https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Artisan", ["artisan", "maker", "local"], "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Premium treats", ["premium", "treat", "luxury"], "https://images.unsplash.com/photo-1514517220038-7ac9b7835963?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Hampers", ["hamper", "gift", "box"], "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Local makers", ["local", "maker", "craft"], "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=500&q=80"),
    ],
  },
  {
    slug: "electronics",
    label: "Electronics",
    shortLabel: "Electronics",
    description: "Chargers, cables, headphones, phone accessories, small tech, and urgent replacements.",
    searchPlaceholder: "Search chargers, cables, headphones...",
    ...primaryCategoryVisuals({
      slug: "electronics",
      label: "Electronics",
      shortLabel: "Electronics",
      brandMatchHints: ["eletronics"],
      chipFallback800: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
      heroFirstFallback1200: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      heroSecond: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
      heroThird: "https://images.unsplash.com/photo-1516542076529-1ea3854896f2?auto=format&fit=crop&w=1200&q=80",
    }),
    storeTypes: ["shop"],
    keywords: ["electronics", "charger", "cable", "headphones", "phone", "tech", "accessories"],
    subcategories: [
      createSubcategory("Chargers", ["charger", "charging"], "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Cables", ["cable", "usb"], "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Headphones", ["headphones", "earbuds"], "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Phone accessories", ["phone", "case", "screen"], "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Batteries", ["battery", "batteries"], "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Small tech", ["tech", "gadget"], "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=500&q=80"),
    ],
  },
  {
    slug: "gifts",
    label: "Gifts",
    shortLabel: "Gifts",
    description: "Flowers, treat boxes, cards, celebration bundles, and local gift delivery.",
    searchPlaceholder: "Search gifts, flowers, treat boxes...",
    ...primaryCategoryVisuals({
      slug: "gifts",
      label: "Gifts",
      shortLabel: "Gifts",
      chipFallback800: "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=800&q=80",
      heroFirstFallback1200: "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1200&q=80",
      heroSecond: "https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=1200&q=80",
      heroThird: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1200&q=80",
    }),
    storeTypes: ["shop"],
    keywords: ["gift", "gifts", "flowers", "cards", "treat", "celebration"],
    subcategories: [
      createSubcategory("Flowers", ["flower", "flowers"], "https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Cards", ["card", "cards"], "https://images.unsplash.com/photo-1529251333259-d36cccaf22ea?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Treat boxes", ["treat", "box", "gift"], "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Celebrations", ["celebration", "birthday"], "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=500&q=80"),
      createSubcategory("Self-care", ["self care", "bath", "care"], "https://images.unsplash.com/photo-1607006483224-4e3f6b55d1a8?auto=format&fit=crop&w=500&q=80"),
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
