/**
 * Picks a stock photo URL from item name + category preset.
 * Rules run most-specific-first (sauce before burger, coffee before generic drink).
 */

export type ImageMatch = {
  ruleId: string;
  url: string;
};

const URL = {
  sauce:
    "https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&w=1200&q=82",
  coffee:
    "https://images.unsplash.com/photo-1495474472287-4d786f3344b7?auto=format&fit=crop&w=1200&q=82",
  bakery:
    "https://images.unsplash.com/photo-1555507036-ab1f403688d2?auto=format&fit=crop&w=1200&q=82",
  softDrink:
    "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=82",
  milkshake:
    "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=1200&q=82",
  pizza:
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=82",
  burger:
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=82",
  kebab:
    "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=1200&q=82",
  chicken:
    "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=1200&q=82",
  chips:
    "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=1200&q=82",
  wrap:
    "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=1200&q=82",
  salad:
    "https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=1200&q=82",
  pasta:
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1200&q=82",
  rice:
    "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=82",
  dessert:
    "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=82",
  breakfast:
    "https://images.unsplash.com/photo-1525351484163-941d3d671060?auto=format&fit=crop&w=1200&q=82",
  sandwich:
    "https://images.unsplash.com/photo-1553909489-f577fc0b01c2?auto=format&fit=crop&w=1200&q=82",
  nachos:
    "https://images.unsplash.com/photo-1513458035277-195af84a8c9e?auto=format&fit=crop&w=1200&q=82",
  mealDeal:
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=82",
  default:
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=82",
} as const;

const INTERNAL_PRESETS = new Set([
  "extras-library",
  "sauces-library",
  "salad-library",
  "side-seasonings-library",
  "meal-upgrades-library",
  "burger-kebab-parts-library",
  "burger-parts-library",
  "kebab-parts-library",
  "menu-boards-config",
]);

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function isMealDealName(item: string): boolean {
  return /\b(meal deal|make it a meal|combo meal|value meal|family meal)\b/i.test(item);
}

function isSauceOrCondiment(item: string): boolean {
  const n = norm(item);
  if (isMealDealName(n)) return false;
  if (/\b(sandwich|toastie|panini|wrap)\b/.test(n)) return false;
  if (/\bcoleslaw\b/.test(n)) return false;
  if (/\b(chips|fries)\b/.test(n)) return false;
  if (/\b(cheeseburger|beef burger|chicken burger|smash burger|stack burger|fillet burger)\b/.test(n)) {
    return false;
  }
  if (/\b(burger|cheeseburger|pizza|kebab|wrap|bucket|platter)\b/.test(n) && !/\b(sauce|mayo|ketchup|dip|relish)\b/.test(n)) {
    return false;
  }
  return (
    /\b(sauce|mayo|mayonnaise|ketchup|relish|dip|gravy|chutney|dressing|garlic mayo|peri peri)\b/.test(n) ||
    (/\b(tub of|pot of|portion of)\b/.test(n) && !/\bcoleslaw\b/.test(n)) ||
    /(?:bbq|burger|garlic|buffalo|hot chilli|chilli|peri peri)\s+sauce$/.test(n)
  );
}

function isCoffeePastry(item: string): boolean {
  return /\b(croissant|muffin|scone|pain au|cookie|brownie|tiffin|rocky road|bakewell|shortbread|cheesecake|fudge cake)\b/i.test(
    item,
  );
}

function isCoffeeDrink(item: string, preset: string | null): boolean {
  if (isCoffeePastry(item)) return false;
  if (/\b(smoothie|milkshake|shake)\b/i.test(item)) return false;
  if (preset === "coffee") {
    return !/\b(sandwich|toastie|panini|wrap|burger|pizza|kebab)\b/i.test(item);
  }
  return /\b(latte|cappuccino|espresso|americano|macchiato|mocha|frappe|flat white|hot chocolate|chai latte|matcha latte|iced coffee|iced latte|iced matcha|whipped latte|coffee)\b/i.test(
    item,
  );
}

function isSoftDrink(item: string, category: string, preset: string | null): boolean {
  if (/\b(slush|slushie|slush puppie|slush puppy|icee)\b/i.test(item)) return true;
  if (preset === "drinks" || preset === "alcohol") return true;
  if (/\b(drinks|soft drinks|cold drinks|slush)\b/i.test(category)) return true;
  return (
    /\b(coke|cola|pepsi|tango|sprite|fanta|dr pepper|7up|7 up|rio\b|irn.?bru|lucozade|water|juice)\b/i.test(item) ||
    (/\b(can|bottle)\b/i.test(item) && /\b(pepsi|coke|cola|tango|sprite|fanta|drink)\b/i.test(item))
  );
}

function isMilkshake(item: string, preset: string | null): boolean {
  if (preset === "milkshakes") return true;
  return /\b(milkshake|thick shake|thickshake)\b/i.test(item);
}

function isPizza(item: string, preset: string | null): boolean {
  if (preset === "pizza") return !isSauceOrCondiment(item);
  return /\b(pizza|calzone|garlic bread|margherita|pepperoni|farmhouse|nutella pizza|pizza fries)\b/i.test(item);
}

function isBurger(item: string, preset: string | null): boolean {
  if (isSauceOrCondiment(item)) return false;
  if (/\b(loaded fries|fries|chips)\b/i.test(item) && !/\bburger\b/i.test(item)) return false;
  const looksLikeBurger = /\b(burger|cheeseburger|smash burger|smashed burger|fillet burger|stack burger|ringer|doritos burger)\b/i.test(
    item,
  );
  if (!looksLikeBurger) return false;
  if (preset === "burgers" || preset === "gourmet-burgers") {
    return !/\b(sauce|mayo|ketchup|dip)\b/i.test(item);
  }
  return true;
}

type Rule = { id: string; test: (item: string, category: string, preset: string | null) => boolean; url: string };

const RULES: Rule[] = [
  {
    id: "chips",
    test: (item, _c, preset) =>
      preset === "sides" ||
      /\b(chips|fries|loaded fries|wedges|curly fries|onion rings|hash brown|hashbrown|corn on the cob)\b/i.test(item),
    url: URL.chips,
  },
  { id: "sauce", test: (item) => isSauceOrCondiment(item), url: URL.sauce },
  { id: "coffee_pastry", test: (item) => isCoffeePastry(item), url: URL.bakery },
  { id: "coffee_drink", test: (item, _c, preset) => isCoffeeDrink(item, preset), url: URL.coffee },
  { id: "milkshake", test: (item, _c, preset) => isMilkshake(item, preset), url: URL.milkshake },
  { id: "soft_drink", test: (item, category, preset) => isSoftDrink(item, category, preset), url: URL.softDrink },
  {
    id: "meal_deal",
    test: (item, _c, preset) => preset === "meal-deals" || isMealDealName(item),
    url: URL.mealDeal,
  },
  { id: "pizza", test: (item, _c, preset) => isPizza(item, preset), url: URL.pizza },
  { id: "burger", test: (item, _c, preset) => isBurger(item, preset), url: URL.burger },
  { id: "kebab", test: (item, _c, preset) => preset === "kebabs" || /\b(kebab|doner|donner|shish|kofta|kofte|gyros)\b/i.test(item), url: URL.kebab },
  { id: "wrap", test: (item, _c, preset) => (preset === "wraps" || /\b(wrap|burrito|tortilla wrap)\b/i.test(item)) && !isSauceOrCondiment(item), url: URL.wrap },
  {
    id: "chicken",
    test: (item, _c, preset) =>
      preset === "chicken" ||
      /\b(wings|nuggets|strips|tenders|popcorn chicken|chicken bucket|spicy wings|bbq wings)\b/i.test(item),
    url: URL.chicken,
  },
  { id: "nachos", test: (item) => /\b(nachos)\b/i.test(item), url: URL.nachos },
  { id: "salad", test: (item, _c, preset) => (preset === "salads" || /\b(salad|coleslaw)\b/i.test(item)) && !/\b(wrap|burger)\b/i.test(item), url: URL.salad },
  { id: "pasta", test: (item) => /\b(pasta|spaghetti|lasagne|lasagna|penne|bolognese|carbonara)\b/i.test(item), url: URL.pasta },
  { id: "rice", test: (item, _c, preset) => preset === "rice-dishes" || /\b(rice bowl|biryani|fried rice|mexican rice|pilau)\b/i.test(item), url: URL.rice },
  { id: "dessert", test: (item, _c, preset) => preset === "desserts" || /\b(brownie|cookie|cake|waffle|knafeh|tiffin|sundae|cheesecake|fudge cake)\b/i.test(item), url: URL.dessert },
  {
    id: "breakfast",
    test: (item, _c, preset) =>
      preset === "breakfast" || /\b(breakfast|bap|egg muffin|porridge|beans on toast|omelette)\b/i.test(item),
    url: URL.breakfast,
  },
  { id: "sandwich", test: (item) => /\b(sandwich|toastie|panini|blt|sub)\b/i.test(item), url: URL.sandwich },
];

export function matchMenuItemImage(
  itemName: string,
  categoryName: string,
  categoryPreset: string | null,
): ImageMatch {
  const item = itemName.trim();
  const category = categoryName.trim();
  const preset = categoryPreset?.trim() || null;

  if (INTERNAL_PRESETS.has(preset ?? "")) {
    return { ruleId: "internal_skip", url: URL.default };
  }

  for (const rule of RULES) {
    if (rule.test(item, category, preset)) {
      return { ruleId: rule.id, url: rule.url };
    }
  }

  return { ruleId: "default", url: URL.default };
}
