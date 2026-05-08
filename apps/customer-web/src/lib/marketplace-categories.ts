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
  subcategories: MarketplaceSubcategory[];
};

export type MarketplaceSubcategory = {
  slug: string;
  label: string;
  imageUrl: string;
  keywords: string[];
};

const createSubcategory = (label: string, imageUrl: string, keywords: string[]): MarketplaceSubcategory => ({
  slug: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  label,
  imageUrl,
  keywords,
});

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
    subcategories: [
      createSubcategory("Burgers", "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=500&q=80", ["burger", "smash", "cheeseburger"]),
      createSubcategory("Chicken", "https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=500&q=80", ["chicken", "wings", "strips"]),
      createSubcategory("Pizza", "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=500&q=80", ["pizza", "pepperoni", "margherita"]),
      createSubcategory("Kebabs", "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=500&q=80", ["kebab", "doner", "shawarma"]),
      createSubcategory("Loaded fries", "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=500&q=80", ["loaded fries", "fries", "chips"]),
      createSubcategory("Curries", "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=500&q=80", ["curry", "masala", "madras"]),
      createSubcategory("Wraps", "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=500&q=80", ["wrap", "burrito"]),
      createSubcategory("Desserts", "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=500&q=80", ["dessert", "waffle", "cookie"]),
    ],
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
    subcategories: [
      createSubcategory("Modern comfort", "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=500&q=80", ["comfort", "special", "kitchen"]),
      createSubcategory("Breakfast", "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=500&q=80", ["breakfast", "brunch"]),
      createSubcategory("Lunch", "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80", ["lunch", "salad", "sandwich"]),
      createSubcategory("Dinner", "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=500&q=80", ["dinner", "main", "meal"]),
      createSubcategory("Family meals", "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=500&q=80", ["family", "bundle", "sharing"]),
      createSubcategory("Healthy", "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=80", ["healthy", "salad", "grill"]),
      createSubcategory("Local specials", "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=500&q=80", ["special", "seasonal", "local"]),
    ],
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
    subcategories: [
      createSubcategory("Fresh food", "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80", ["fresh", "fruit", "veg"]),
      createSubcategory("Snacks", "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=500&q=80", ["snack", "crisps", "sweets"]),
      createSubcategory("Drinks", "https://images.unsplash.com/photo-1596803244618-8dbee441d70b?auto=format&fit=crop&w=500&q=80", ["drink", "cola", "water", "juice"]),
      createSubcategory("Household", "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=500&q=80", ["household", "cleaning", "toilet"]),
      createSubcategory("Cupboard", "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80", ["cupboard", "pasta", "rice", "tinned"]),
      createSubcategory("Frozen", "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=500&q=80", ["frozen", "ice cream"]),
      createSubcategory("Convenience", "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=500&q=80", ["convenience", "essentials"]),
    ],
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
    subcategories: [
      createSubcategory("Bread", "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80", ["bread", "loaf", "sourdough"]),
      createSubcategory("Pastries", "https://images.unsplash.com/photo-1519682577862-22b62b24e493?auto=format&fit=crop&w=500&q=80", ["pastry", "croissant"]),
      createSubcategory("Cakes", "https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?auto=format&fit=crop&w=500&q=80", ["cake", "cakes"]),
      createSubcategory("Cookies", "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=500&q=80", ["cookie", "cookies"]),
      createSubcategory("Savouries", "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=500&q=80", ["savoury", "pie", "pasty"]),
      createSubcategory("Breakfast bakes", "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=500&q=80", ["breakfast", "bake"]),
    ],
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
    subcategories: [
      createSubcategory("Meal packs", "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=500&q=80", ["meal pack", "box", "bundle"]),
      createSubcategory("Chicken", "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=500&q=80", ["chicken"]),
      createSubcategory("Steak", "https://images.unsplash.com/photo-1551028150-64b9f398f678?auto=format&fit=crop&w=500&q=80", ["steak", "sirloin", "ribeye"]),
      createSubcategory("Sausages", "https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=500&q=80", ["sausage", "sausages"]),
      createSubcategory("Breakfast", "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=500&q=80", ["breakfast", "bacon"]),
      createSubcategory("BBQ", "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=500&q=80", ["bbq", "barbecue", "grill"]),
      createSubcategory("Marinades", "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=500&q=80", ["marinade", "seasoned"]),
    ],
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
    subcategories: [
      createSubcategory("Beer", "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=500&q=80", ["beer", "lager", "ale"]),
      createSubcategory("Wine", "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=500&q=80", ["wine", "prosecco"]),
      createSubcategory("Spirits", "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=500&q=80", ["spirit", "vodka", "gin", "whisky", "rum"]),
      createSubcategory("Cider", "https://images.unsplash.com/photo-1567696911980-2eed69a46042?auto=format&fit=crop&w=500&q=80", ["cider"]),
      createSubcategory("Mixers", "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=500&q=80", ["mixer", "tonic", "cola"]),
      createSubcategory("Bundles", "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=500&q=80", ["bundle", "party"]),
      createSubcategory("No alcohol", "https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=500&q=80", ["zero", "no alcohol", "soft"]),
    ],
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
    subcategories: [
      createSubcategory("Devices", "https://images.unsplash.com/photo-1527156231393-7023794f363c?auto=format&fit=crop&w=500&q=80", ["device", "vape"]),
      createSubcategory("Pods", "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=500&q=80", ["pod", "pods"]),
      createSubcategory("Liquids", "https://images.unsplash.com/photo-1516542076529-1ea3854896f2?auto=format&fit=crop&w=500&q=80", ["liquid", "eliquid", "refill"]),
      createSubcategory("Accessories", "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=500&q=80", ["accessory", "charger"]),
      createSubcategory("Bundles", "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=500&q=80", ["bundle", "kit"]),
    ],
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
    subcategories: [
      createSubcategory("Drinks", "https://images.unsplash.com/photo-1596803244618-8dbee441d70b?auto=format&fit=crop&w=500&q=80", ["drink", "cola", "water"]),
      createSubcategory("Snacks", "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=500&q=80", ["snack", "crisps"]),
      createSubcategory("Essentials", "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=500&q=80", ["essential", "milk", "bread"]),
      createSubcategory("Household", "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=500&q=80", ["household", "cleaning"]),
      createSubcategory("Sweets", "https://images.unsplash.com/photo-1581798459219-318e76aecc7b?auto=format&fit=crop&w=500&q=80", ["sweet", "sweets", "chocolate"]),
      createSubcategory("Ice cream", "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=500&q=80", ["ice cream", "gelato"]),
    ],
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
    subcategories: [
      createSubcategory("Waffles", "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=500&q=80", ["waffle", "waffles"]),
      createSubcategory("Cookie dough", "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=500&q=80", ["cookie dough", "cookie"]),
      createSubcategory("Churros", "https://images.unsplash.com/photo-1624371414361-e670edf4898d?auto=format&fit=crop&w=500&q=80", ["churro", "churros"]),
      createSubcategory("Ice cream", "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=500&q=80", ["ice cream", "gelato"]),
      createSubcategory("Cakes", "https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?auto=format&fit=crop&w=500&q=80", ["cake", "cakes"]),
      createSubcategory("Milkshakes", "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=500&q=80", ["milkshake", "shake"]),
    ],
  },
  {
    slug: "speciality",
    label: "Speciality",
    shortLabel: "Speciality",
    description: "Cheese, deli counters, local makers, premium treats, and harder-to-find favourites.",
    searchPlaceholder: "Search speciality, deli, cheese, local makers...",
    imageUrl: "https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=800&q=80",
    heroImages: [
      "https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=1200&q=80",
    ],
    storeTypes: ["shop", "restaurant"],
    keywords: ["speciality", "specialty", "deli", "cheese", "artisan", "local", "premium"],
    subcategories: [
      createSubcategory("Deli", "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=500&q=80", ["deli", "counter"]),
      createSubcategory("Cheese", "https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=500&q=80", ["cheese", "cheddar", "brie"]),
      createSubcategory("Artisan", "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=500&q=80", ["artisan", "maker", "local"]),
      createSubcategory("Premium treats", "https://images.unsplash.com/photo-1514517220038-7ac9b7835963?auto=format&fit=crop&w=500&q=80", ["premium", "treat", "luxury"]),
      createSubcategory("Hampers", "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=500&q=80", ["hamper", "gift", "box"]),
      createSubcategory("Local makers", "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=500&q=80", ["local", "maker", "craft"]),
    ],
  },
  {
    slug: "electronics",
    label: "Electronics",
    shortLabel: "Electronics",
    description: "Chargers, cables, headphones, phone accessories, small tech, and urgent replacements.",
    searchPlaceholder: "Search chargers, cables, headphones...",
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
    heroImages: [
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1516542076529-1ea3854896f2?auto=format&fit=crop&w=1200&q=80",
    ],
    storeTypes: ["shop"],
    keywords: ["electronics", "charger", "cable", "headphones", "phone", "tech", "accessories"],
    subcategories: [
      createSubcategory("Chargers", "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=500&q=80", ["charger", "charging"]),
      createSubcategory("Cables", "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=500&q=80", ["cable", "usb"]),
      createSubcategory("Headphones", "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80", ["headphones", "earbuds"]),
      createSubcategory("Phone accessories", "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=500&q=80", ["phone", "case", "screen"]),
      createSubcategory("Batteries", "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=500&q=80", ["battery", "batteries"]),
      createSubcategory("Small tech", "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=500&q=80", ["tech", "gadget"]),
    ],
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
    subcategories: [
      createSubcategory("Flowers", "https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=500&q=80", ["flower", "flowers"]),
      createSubcategory("Cards", "https://images.unsplash.com/photo-1529251333259-d36cccaf22ea?auto=format&fit=crop&w=500&q=80", ["card", "cards"]),
      createSubcategory("Treat boxes", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=500&q=80", ["treat", "box", "gift"]),
      createSubcategory("Celebrations", "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=500&q=80", ["celebration", "birthday"]),
      createSubcategory("Self-care", "https://images.unsplash.com/photo-1607006483224-4e3f6b55d1a8?auto=format&fit=crop&w=500&q=80", ["self care", "bath", "care"]),
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
