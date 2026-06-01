import { randomUUID } from "node:crypto";

import type { HubMenuSection, MenuItem, StoreOpeningHours } from "@hull-eats/types";
import {
  HUB_MENU_BURGER_PARTS_PRESET,
  HUB_MENU_EXTRAS_LIBRARY_PRESET,
  HUB_MENU_MEAL_LIBRARY_PRESET,
  HUB_MENU_SAUCES_LIBRARY_PRESET,
  STORE_OPENING_DAY_OF_WEEK,
} from "@hull-eats/types";

export const CHEEKY_CHICKEN_HUB = {
  businessName: "Cheeky Chicken",
  ownerEmail: "cheeky@chicken.com",
  password: "let me in",
  slug: "cheeky-chicken",
  mealUpgradePrice: 2.5,
  city: "Hull",
  postcode: "HU6 7AA",
  cuisineLabel: "Chicken & burgers",
} as const;

/** Store settings from the business listing (delivery tiers mapped to distance ranges in provision). */
export const CHEEKY_CHICKEN_BUSINESS = {
  minimumOrderAmount: 8,
  deliveryFee: 2.3,
  deliveryRadiusMiles: 5,
  etaMinutes: 35,
  orderFulfillment: "delivery_and_collection" as const,
  /** Original min/fee pairs — distance bands are approximate until tuned in Delivery ranges. */
  deliveryTiers: [
    { minimumOrderAmount: 8, deliveryFee: 2.3 },
    { minimumOrderAmount: 10, deliveryFee: 3.5 },
    { minimumOrderAmount: 10, deliveryFee: 4 },
    { minimumOrderAmount: 20, deliveryFee: 5 },
  ],
  deliveryDistanceRanges: [
    { maxMiles: 1.5, fee: 2.3, minimumOrderAmount: 8 },
    { maxMiles: 2.5, fee: 3.5, minimumOrderAmount: 10 },
    { maxMiles: 3.5, fee: 4, minimumOrderAmount: 10 },
    { maxMiles: 5, fee: 5, minimumOrderAmount: 20 },
  ],
  openingTime: "15:30",
  closingTime: "23:00",
  pickupFromTime: "12:00",
  onboardingMessage:
    "Welcome to Cheeky Chicken. Collection Mon–Sun 12:00–23:00. Delivery Mon–Sun 15:30–23:00. Finish menu setup, set items live, then publish.",
} as const;

export function buildCheekyChickenOpeningHours(): StoreOpeningHours {
  const { openingTime, closingTime } = CHEEKY_CHICKEN_BUSINESS;
  const days = [
    STORE_OPENING_DAY_OF_WEEK.sunday,
    STORE_OPENING_DAY_OF_WEEK.monday,
    STORE_OPENING_DAY_OF_WEEK.tuesday,
    STORE_OPENING_DAY_OF_WEEK.wednesday,
    STORE_OPENING_DAY_OF_WEEK.thursday,
    STORE_OPENING_DAY_OF_WEEK.friday,
    STORE_OPENING_DAY_OF_WEEK.saturday,
  ];
  return days.map((dayOfWeek) => ({
    dayOfWeek,
    isOpen: true,
    openTime: openingTime,
    closeTime: closingTime,
  }));
}

export function buildCheekyChickenDeliveryConfig() {
  return {
    mode: "business_radius" as const,
    radiusMiles: CHEEKY_CHICKEN_BUSINESS.deliveryRadiusMiles,
    distanceRanges: CHEEKY_CHICKEN_BUSINESS.deliveryDistanceRanges.map((range) => ({ ...range })),
    postcodeZones: [],
    postcodeDistricts: [],
    mileFees: [0, 0, 0, 0, 0],
    originLatitude: null,
    originLongitude: null,
    orderFulfillment: CHEEKY_CHICKEN_BUSINESS.orderFulfillment,
  };
}

const EXTRAS_CATALOG: Array<{ name: string; price: number }> = [
  { name: "Cheese slice", price: 0.8 },
  { name: "Mozzarella cheese", price: 1 },
  { name: "Bacon", price: 1 },
  { name: "Hash brown", price: 0.8 },
  { name: "2 onion rings", price: 0.8 },
  { name: "Doritos", price: 0.8 },
  { name: "Jalapenos", price: 0.5 },
  { name: "Mushrooms", price: 0.6 },
  { name: "Onion", price: 0.4 },
  { name: "Tomato", price: 0.4 },
  { name: "Pepperoni", price: 0.9 },
  { name: "Ham", price: 0.9 },
  { name: "Chicken", price: 1 },
  { name: "Bolognese", price: 1.2 },
  { name: "Large portion", price: 1 },
];

const SAUCES_CATALOG: Array<{ name: string; price: number }> = [
  { name: "Garlic mayo", price: 1.3 },
  { name: "Ketchup", price: 1.3 },
  { name: "Mayo", price: 1.3 },
  { name: "BBQ sauce", price: 1.3 },
  { name: "Chilli sauce", price: 1.3 },
  { name: "Garlic yoghurt", price: 1.3 },
  { name: "Sweetcorn relish", price: 1.3 },
  { name: "Sweet chilli", price: 1.3 },
  { name: "Burger sauce", price: 1.3 },
  { name: "Buffalo sauce", price: 1.3 },
];

const BURGER_PARTS = ["Lettuce", "Mayo", "Salad", "BBQ sauce", "Chilli sauce", "Salsa", "Garlic sauce"];

const BURGER_CATEGORY_NAMES = new Set([
  "CHICKEN FILLET BURGERS",
  "BEEF BURGERS",
  "SMASH BURGERS",
]);

const MEAL_CATEGORY_NAMES = new Set(["CHICKEN FILLET BURGERS", "BEEF BURGERS", "SMASH BURGERS", "WRAPS & MEALS"]);

/** Full menu paste — parsed into customer categories. */
export const CHEEKY_CHICKEN_MENU_TEXT = `
THE CHICKEN
1 PC OF CHICKEN
£1.90
1 PC OF CHICKEN & CHIPS
£3.90
2 PCS OF CHICKEN & CHIPS
£4.90
3 PC OF CHICKEN & CHIPS
£5.90
4 PC OF CHICKEN & CHIPS
£6.90
6 PCS OF CHICKEN NUGGETS
£3.60
6 PCS OF CHICKEN NUGGETS & CHIPS
£5.20
SPICY WINGS
4 PCS SPICY WINGS
£2.00
4 PCS SPICY WINGS & CHIPS
£3.50
6 PCS SPICY WINGS & CHIPS
£4.50
8 PCS SPICY WINGS & CHIPS
£5.00
10 PCS SPICY WINGS & CHIPS
£5.90
6 BBQ WINGS
£3.50
6 BBQ WINGS & CHIPS
£5.00
8 BBQ WINGS
£5.00
8 BBQ WINGS & CHIPS
£6.50
HOT SHOT
1 SKEWER OF HOT SHOT
£2.70
1 SKEWER OF HOT SHOT & CHIPS
£4.00
2 SKEWERS OF HOT SHOT
£5.40
2 SKEWERS OF HOT SHOT & CHIPS
£6.40
CHICKEN FILLET, STRIPS & POPCORN
1 PC OF CHICKEN FILLET
£2.20
1 PC OF CHICKEN FILLET & CHIPS
£3.90
2 PCS OF CHICKEN FILLET & CHIPS
£5.90
3 PCS OF CHICKEN FILLET & CHIPS
£7.30
4 PCS OF CHICKEN STRIPS
£4.60
4 PCS OF CHICKEN STRIPS & CHIPS
£6.50
6 PCS OF CHICKEN STRIPS
£5.40
6 PCS OF CHICKEN STRIPS & CHIPS
£7.20
15 PCS OF POPCORN CHICKEN
£3.90
15 PCS OF POPCORN CHICKEN & CHIPS
£5.60
20 PCS OF POPCORN CHICKEN
£4.60
20 PCS OF POPCORN CHICKEN & CHIPS
£7.00
CHICKEN FILLET BURGERS
CHICKEN FILLET BURGER
From£4.50
CHICKEN CHEESE FILLET BURGER
From£4.80
FIRE CHICKEN FILLET BURGER
From£4.90
CHICKEN BACON BURGER
From£5.20
CHICKEN DORITOS BURGER
£5.20
DOUBLE RINGER FILLET BURGER
£4.80
EMPIRE FILLET BURGER
£4.80
BIG DADDY FILLET BURGER
£6.30
DOUBLE DECKER BURGER
£6.50
LOADED BEDDED FRIES
MEAT FEAST LOADED FRIES
£6.00
BOLOGNESE LOADED FRIES
£5.80
CHICKEN & BACON LOADED FRIES
£6.00
VEGETARIAN LOADED FRIES
£5.00
BACON, CHEESE & CHIPS LOADED FRIES
£6.10
CREATE YOUR OWN LOADED FRIES
£7.00
WRAPS & MEALS
CHICKEN WRAP
From£4.60
BBQ CHICKEN WRAP
From£4.80
CHICKEN BACON WRAP
From£5.90
MEGA CHICKEN WRAP
From£5.60
MEXICAN CHICKEN WRAP
From£5.60
CHICKEN WRAP SALSA
From£4.90
CHICKEN CHEESE WRAP
From£5.90
CHICKEN, CHEESE & CHIPS WRAP
From£6.40
HALLOUMI CHICKEN WRAP
From£6.40
CHIPS & CHEESE WRAP
From£4.50
FLAME & SIZZLE
CHICKEN GRILL & FRIES
£9.00
CHICKEN GRILL & MEXICAN RICE
£10.00
CHICKEN BACON MELT
£10.00
CHICKEN PLATTER
£11.00
CHICKEN PLATTER CHEESE
£12.00
MIX PLATTER
£13.00
NACHOS
CHEESE NACHOS
£5.00
CHICKEN FILLET NACHOS
£6.00
CLASSIC BEEF NACHOS
£6.00
BEEF BURGERS
BEEF BURGER
From£4.00
CHEESEBURGER
From£4.40
BEEF BACON BURGER
From£4.90
DOUBLE DECKER BURGER
£6.50
ROCKSTAR BURGER
£6.50
DOUBLE RINGER CHEESEBURGER
£4.80
DORITOS BURGER
£4.80
EMPIRE BEEF BURGER
£4.80
MONSTER BURGER
£6.90
KING KONG BURGER
£8.20
SMASH BURGERS
CLASSIC SMASH BURGER
£5.70
DOUBLE TROUBLE SMASH BURGER
£7.30
THE CRUNCH STACK SMASHED BURGER
£7.40
SMASHED SUPREME BURGER
£9.00
SMOKED MEXICANO SMASHED BURGER
£7.00
NEW YORKER SMASH BURGER
£8.50
MEAT STACK SMASH BURGER
£7.30
RICE BOWL
CHICKEN FILLET RICE BOWL
£5.80
GRILLED CHICKEN RICE BOWL
£6.00
VEGETARIAN RICE BOWL
£6.50
NACHO RICE BOWL
£5.70
BBQ CHICKEN RICE BOWL
£5.80
FAMILY MEALS
FAMILY BUCKET
£33.99
FAMILY MEAL 1
£14.99
FAMILY MEAL 2
£16.99
FAMILY MEAL 3
£18.99
FAMILY MEAL 4
£19.99
BONELESS SAMPLER TO SHARE
£31.99
CHEEKY SNACK BOX
£21.99
VALUE MEALS
SOLO VALUE MEAL
£5.40
DUO VALUE MEAL
£14.00
TRIO VALUE MEAL
£19.99
COMBO VALUE MEAL
£11.00
KIDS MEALS
KIDS MEAL 1
£4.50
KIDS MEAL 2
£4.50
KIDS MEAL 3
£4.50
KIDS MEAL 4
£4.50
STARTERS
CHIPS
From£2.00
CHIPS & CHEESE
From£3.50
CHIP & BUTTY
£3.30
CHIP & BUTTY WITH CHEESE
£4.50
CHIPS & CHEESE WITH BOLOGNESE
£5.50
POTATO WEDGES
£3.30
HASH BROWN (4)
£2.50
ONION RINGS (10)
£2.90
ONION RINGS (10) WITH CHEESE
£3.90
CHILLI CHEESE POPPERS (6)
£4.30
MOZZARELLA STICKS (6)
£4.50
BREADED GARLIC MUSHROOMS (10)
£3.40
CORN ON THE COB
£2.00
SIDE SALAD
£2.00
COLESLAW POT
£1.50
BBQ BEANS POT
£1.50
DIPS
GARLIC MAYO
£1.30
KETCHUP
£1.30
MAYO
£1.30
BBQ SAUCE
£1.30
CHILLI SAUCE
£1.30
GARLIC YOGHURT
£1.30
SWEETCORN RELISH
£1.30
SWEET CHILLI
£1.30
BURGER SAUCE
£1.30
BUFFALO SAUCE
£1.30
DRINKS
SLUSH PUPPIE
£1.30
COKE CAN
£1.50
DIET COKE CAN
£1.50
FANTA ORANGE CAN
£1.50
DR PEPPER CAN
£1.50
RIO CAN
£1.50
CHERRY COKE CAN
£1.50
7UP CAN
£1.50
PEPSI CAN
£1.50
PEPSI MAX CAN
£1.50
TANGO ORANGE CAN
£1.50
TANGO APPLE CAN
£1.50
PEPSI BOTTLE 1.5L
£3.50
DIET COKE BOTTLE 1.5L
£3.50
COKE BOTTLE 1.5L
£3.50
7UP BOTTLE 1.5L
£3.50
TANGO ORANGE BOTTLE 1.5L
£3.50
BOTTLE OF WATER
£1.00
MILK SHAKES
CLASSIC PISTACHIO KNAFEH MILKSHAKE
£6.50
DUBAI CHOCOLATE MILKSHAKE
£6.50
OREO SHAKE
£5.40
KINDER BUENO SHAKE
£5.40
FERRERO ROCHER SHAKE
£5.40
LOTUS BISCOFF SHAKE
£5.40
MARS BAR MILKSHAKE
£5.40
CRUNCHY PEANUT BUTTER MILKSHAKE
£5.40
GALAXY CARAMEL MILKSHAKE
£5.40
STRAWBERRY SHAKE
£5.40
DESSERTS
CHOCOLATE FUDGE CAKE
£3.00
CHOCOLATE BROWNIE
£1.50
`.trim();

type ParsedItem = {
  name: string;
  price: number;
  fromPrice: boolean;
  note?: string;
};

type ParsedCategory = {
  name: string;
  items: ParsedItem[];
};

function parsePriceLine(line: string): { name: string; price: number; fromPrice: boolean } | null {
  const fromMatch = line.match(/^(.*?)From\s*£\s*([\d.]+)\s*$/i);
  if (fromMatch) {
    const name = fromMatch[1]?.trim() || line.replace(/From\s*£.*/i, "").trim();
    const price = Number(fromMatch[2]);
    if (name && Number.isFinite(price)) {
      return { name, price, fromPrice: true };
    }
  }
  const inlineFrom = line.match(/^(.+?)\s+From\s*£\s*([\d.]+)\s*$/i);
  if (inlineFrom) {
    return { name: inlineFrom[1]!.trim(), price: Number(inlineFrom[2]), fromPrice: true };
  }
  return null;
}

const CHEEKY_CHICKEN_CATEGORY_HEADERS = [
  "THE CHICKEN",
  "CHICKEN FILLET BURGERS",
  "WRAPS & MEALS",
  "FLAME & SIZZLE",
  "BEEF BURGERS",
  "SMASH BURGERS",
  "RICE BOWL",
  "FAMILY MEALS",
  "VALUE MEALS",
  "KIDS MEALS",
  "STARTERS",
  "DIPS",
  "DRINKS",
  "MILK SHAKES",
  "DESSERTS",
] as const;

function isStandalonePriceLine(line: string): { price: number; fromPrice: boolean } | null {
  const fromOnly = line.match(/^From\s*£\s*([\d.]+)\s*$/i);
  if (fromOnly) {
    return { price: Number(fromOnly[1]), fromPrice: true };
  }
  const gbp = line.match(/^£\s*([\d.]+)\s*$/);
  if (gbp) {
    return { price: Number(gbp[1]), fromPrice: false };
  }
  return null;
}

function isSubheadingLine(line: string, nextLine: string | undefined): boolean {
  if (!/^[A-Z0-9][A-Z0-9\s&'’\-!,]+$/.test(line)) {
    return false;
  }
  if (!nextLine) {
    return false;
  }
  if (isStandalonePriceLine(nextLine)) {
    return false;
  }
  if (parsePriceLine(line)) {
    return false;
  }
  return true;
}

function parseCategoryItems(chunk: string): ParsedItem[] {
  const lines = chunk
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const items: ParsedItem[] = [];
  let pendingName: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const nextLine = lines[index + 1];

    if (isSubheadingLine(line, nextLine)) {
      pendingName = null;
      continue;
    }

    const inline = parsePriceLine(line);
    if (inline) {
      items.push({ name: inline.name, price: inline.price, fromPrice: inline.fromPrice });
      pendingName = null;
      continue;
    }

    const standalonePrice = isStandalonePriceLine(line);
    if (standalonePrice && pendingName) {
      items.push({
        name: pendingName,
        price: standalonePrice.price,
        fromPrice: standalonePrice.fromPrice,
      });
      pendingName = null;
      continue;
    }

    if (isDescriptionLine(line)) {
      const last = items[items.length - 1];
      if (last) {
        last.note = last.note ? `${last.note} ${line}` : line;
      }
      continue;
    }

    pendingName = line;
  }

  return items;
}

function isDescriptionLine(line: string): boolean {
  return /^[a-z]/.test(line) || (/^[A-Z]/.test(line) && line.includes(" with ") && !isCategoryHeader(line));
}

export function parseCheekyChickenMenu(raw: string): ParsedCategory[] {
  const text = raw.trim();
  const categories: ParsedCategory[] = [];

  for (let index = 0; index < CHEEKY_CHICKEN_CATEGORY_HEADERS.length; index += 1) {
    const name = CHEEKY_CHICKEN_CATEGORY_HEADERS[index]!;
    const nextName = CHEEKY_CHICKEN_CATEGORY_HEADERS[index + 1];
    const start = text.indexOf(name);
    if (start === -1) {
      continue;
    }

    const contentStart = start + name.length;
    const end = nextName ? text.indexOf(nextName, contentStart) : text.length;
    const chunk = text.slice(contentStart, end < 0 ? text.length : end).trim();
    const items = parseCategoryItems(chunk);
    if (items.length > 0) {
      categories.push({ name, items });
    }
  }

  return categories;
}

function buildMenuItem(input: {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  description?: string;
  isActive?: boolean;
  optionGroups?: MenuItem["optionGroups"];
  components?: MenuItem["components"];
}): MenuItem {
  return {
    id: input.id,
    categoryId: input.categoryId,
    name: input.name,
    description: input.description ?? "",
    price: input.price,
    isActive: input.isActive ?? true,
    trackStock: false,
    stockQuantity: null,
    stockStatus: "in_stock",
    allowBackorder: false,
    maxPerOrder: null,
    requiresIdVerification: false,
    sortOrder: 0,
    components: input.components ?? [],
    optionGroups: input.optionGroups ?? [],
  };
}

function encodeMealCfg(sides: Array<{ id: string; label: string }>, drinks: Array<{ id: string; label: string }>, note = "") {
  const payload = JSON.stringify({
    sides: sides.map((side) => ({ id: side.id, label: side.label, priceDelta: 0, menuItemId: null })),
    drinks: drinks.map((drink) => ({ id: drink.id, label: drink.label, priceDelta: 0, menuItemId: null })),
  });
  return note ? `__HULL_MEAL_CFG:${payload}__\n${note}` : `__HULL_MEAL_CFG:${payload}__`;
}

function buildBurgerSauceGroups(sauceItems: MenuItem[]): MenuItem["optionGroups"] {
  const preferred = ["Mayo", "Burger sauce", "BBQ sauce", "Chilli sauce", "Garlic mayo", "Sweet chilli"];
  const includedOptions = sauceItems
    .filter((sauce) => preferred.some((label) => sauce.name.toLowerCase() === label.toLowerCase()))
    .map((sauce, index) => ({
      id: sauce.id,
      label: sauce.name,
      description: "",
      priceDelta: 0,
      isDefault: index === 0,
      maxQuantity: 1,
    }));

  if (includedOptions.length === 0) {
    return [];
  }

  return [
    {
      id: randomUUID(),
      name: "Sauces",
      description: "__HULL_SAUCES_INCLUDED__",
      selectionMode: "single",
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      showWhenValueIds: [],
      options: includedOptions,
    },
    {
      id: randomUUID(),
      name: "Extra sauce",
      description: "__HULL_SAUCES_EXTRA__",
      selectionMode: "multiple",
      isRequired: false,
      minSelections: 0,
      maxSelections: null,
      showWhenValueIds: [],
      options: sauceItems.map((sauce) => ({
        id: `${sauce.id}-extra`,
        label: sauce.name,
        description: "",
        priceDelta: sauce.price,
        isDefault: false,
        maxQuantity: 1,
      })),
    },
  ];
}

function buildBurgerPaidExtrasGroup(extraItems: MenuItem[]): MenuItem["optionGroups"] {
  const paidExtras = extraItems.filter((extra) => extra.name !== "Large portion");
  if (paidExtras.length === 0) {
    return [];
  }

  return [
    {
      id: randomUUID(),
      name: "Added extras",
      description: "__HULL_EXTRAS__",
      selectionMode: "multiple",
      isRequired: false,
      minSelections: 0,
      maxSelections: null,
      showWhenValueIds: [],
      options: paidExtras.map((extra) => ({
        id: extra.id,
        label: extra.name,
        description: "",
        priceDelta: extra.price,
        isDefault: false,
        maxQuantity: 1,
      })),
    },
  ];
}

type MealDrinkOption = { id: string; label: string; priceDelta?: number };

function buildMealUpgradeGroups(
  templateId: string,
  upgradePrice: number,
  sideLabel: string,
  drinkOptions: MealDrinkOption[],
): MenuItem["optionGroups"] {
  const mealYesId = `hull-meal-yes-${templateId}`;
  const mealNoId = `hull-meal-no-${templateId}`;
  const groups: MenuItem["optionGroups"] = [
    {
      id: randomUUID(),
      name: "Make it a meal",
      description: `__HULL_MEAL_CHOICE__\n__HULL_MEAL_TEMPLATE:${templateId}__`,
      selectionMode: "single",
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      showWhenValueIds: [],
      options: [
        { id: mealNoId, label: "On its own", description: "", priceDelta: 0, isDefault: true, maxQuantity: 1 },
        {
          id: mealYesId,
          label: "Make it a meal",
          description: "",
          priceDelta: upgradePrice,
          isDefault: false,
          maxQuantity: 1,
        },
      ],
    },
    {
      id: randomUUID(),
      name: "Choose your side",
      description: "",
      selectionMode: "single",
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      showWhenValueIds: [mealYesId],
      options: [
        {
          id: `hull-meal-side-${templateId}`,
          label: sideLabel,
          description: "",
          priceDelta: 0,
          isDefault: true,
          maxQuantity: 1,
        },
      ],
    },
  ];

  const drinks =
    drinkOptions.length > 0
      ? drinkOptions
      : [{ id: `hull-meal-drink-${templateId}`, label: "Can of drink", priceDelta: 0 }];

  groups.push({
    id: randomUUID(),
    name: "Choose your drink",
    description: "",
    selectionMode: "single",
    isRequired: true,
    minSelections: 1,
    maxSelections: 1,
    showWhenValueIds: [mealYesId],
    options: drinks.map((drink, index) => ({
      id: drink.id,
      label: drink.label,
      description: "",
      priceDelta: drink.priceDelta ?? 0,
      isDefault: index === 0,
      maxQuantity: 1,
    })),
  });

  return groups;
}

function buildPickThreeExtrasGroup(extraItems: MenuItem[]): MenuItem["optionGroups"] {
  return [
    {
      id: randomUUID(),
      name: "Choose 3 toppings",
      description: "__HULL_EXTRAS__",
      selectionMode: "multiple",
      isRequired: true,
      minSelections: 3,
      maxSelections: 3,
      showWhenValueIds: [],
      options: extraItems.map((extra) => ({
        id: extra.id,
        label: extra.name,
        description: "",
        priceDelta: extra.price,
        isDefault: false,
        maxQuantity: 1,
      })),
    },
  ];
}

function buildSizeExtraGroup(largeExtra: MenuItem): MenuItem["optionGroups"] {
  return [
    {
      id: randomUUID(),
      name: "Size",
      description: "",
      selectionMode: "single",
      isRequired: false,
      minSelections: 0,
      maxSelections: 1,
      showWhenValueIds: [],
      options: [
        { id: randomUUID(), label: "Regular", description: "", priceDelta: 0, isDefault: true, maxQuantity: 1 },
        {
          id: randomUUID(),
          label: largeExtra.name,
          description: "",
          priceDelta: largeExtra.price,
          isDefault: false,
          maxQuantity: 1,
        },
      ],
    },
  ];
}

export function buildCheekyChickenMenuSections(): HubMenuSection[] {
  const extrasSectionId = randomUUID();
  const saucesSectionId = randomUUID();
  const burgerPartsSectionId = randomUUID();
  const mealSectionId = randomUUID();
  const mealTemplateId = randomUUID();
  const largePortionExtraId = randomUUID();

  const extraItems = EXTRAS_CATALOG.map((extra, index) =>
    buildMenuItem({
      id: index === EXTRAS_CATALOG.length - 1 ? largePortionExtraId : randomUUID(),
      categoryId: extrasSectionId,
      name: extra.name,
      price: extra.price,
      isActive: true,
    }),
  );

  const largePortionExtra = extraItems.find((item) => item.id === largePortionExtraId)!;

  const sauceItems = SAUCES_CATALOG.map((sauce) =>
    buildMenuItem({
      id: randomUUID(),
      categoryId: saucesSectionId,
      name: sauce.name,
      price: sauce.price,
      isActive: true,
    }),
  );

  const burgerPartItems = BURGER_PARTS.map((label) =>
    buildMenuItem({
      id: randomUUID(),
      categoryId: burgerPartsSectionId,
      name: label,
      price: 0,
      description: `__HULL_PART:burger:salad__`,
      isActive: true,
    }),
  );

  const mealTemplateItem = buildMenuItem({
    id: mealTemplateId,
    categoryId: mealSectionId,
    name: "Regular fries & can",
    price: CHEEKY_CHICKEN_HUB.mealUpgradePrice,
    description: encodeMealCfg(
      [{ id: randomUUID(), label: "Regular fries" }],
      [{ id: randomUUID(), label: "Can of drink" }],
      "Standard meal upgrade — fries and a can.",
    ),
    isActive: true,
  });

  const staffSections: HubMenuSection[] = [
    {
      id: extrasSectionId,
      name: "Added extras",
      description: "Paid add-ons and loaded-fries toppings.",
      presetKey: HUB_MENU_EXTRAS_LIBRARY_PRESET,
      defaultPrice: 0,
      items: extraItems,
    },
    {
      id: saucesSectionId,
      name: "Sauces",
      description: "Sauce list for products and dips.",
      presetKey: HUB_MENU_SAUCES_LIBRARY_PRESET,
      defaultPrice: 0,
      items: sauceItems,
    },
    {
      id: burgerPartsSectionId,
      name: "Burger parts",
      description: "Base burger/wrap parts.",
      presetKey: HUB_MENU_BURGER_PARTS_PRESET,
      defaultPrice: 0,
      items: burgerPartItems,
    },
    {
      id: mealSectionId,
      name: "Make it a meal",
      description: "Single meal upgrade price for the menu.",
      presetKey: HUB_MENU_MEAL_LIBRARY_PRESET,
      defaultPrice: CHEEKY_CHICKEN_HUB.mealUpgradePrice,
      items: [mealTemplateItem],
    },
  ];

  const parsedCategories = parseCheekyChickenMenu(CHEEKY_CHICKEN_MENU_TEXT);
  const drinksParsed = parsedCategories.find((category) => category.name === "DRINKS");
  const drinkSectionId = randomUUID();
  const drinkCatalogItems =
    drinksParsed?.items.map((entry) =>
      buildMenuItem({
        id: randomUUID(),
        categoryId: drinkSectionId,
        name: entry.name,
        price: entry.price,
        isActive: true,
      }),
    ) ?? [];
  const drinkOptions: MealDrinkOption[] = drinkCatalogItems.map((item) => ({
    id: item.id,
    label: item.name,
    priceDelta: 0,
  }));

  const customerSections: HubMenuSection[] = parsedCategories.map((category) => {
    if (category.name === "DRINKS") {
      return {
        id: drinkSectionId,
        name: "Drinks",
        description: "",
        presetKey: null,
        defaultPrice: null,
        items: drinkCatalogItems,
      };
    }

    const sectionId = randomUUID();
    const presetKey = BURGER_CATEGORY_NAMES.has(category.name) ? "burgers" : null;
    const items = category.items.map((entry) => {
      const isCustomLoaded = /CREATE YOUR OWN LOADED FRIES/i.test(entry.name);
      const isBurgerCategory = BURGER_CATEGORY_NAMES.has(category.name);
      const mealEligible = MEAL_CATEGORY_NAMES.has(category.name) && entry.fromPrice;
      const sizeEligible = /^(CHIPS|CHIPS & CHEESE)$/i.test(entry.name) && entry.fromPrice;

      let optionGroups: MenuItem["optionGroups"] = [];
      if (isCustomLoaded) {
        optionGroups = buildPickThreeExtrasGroup(extraItems);
      } else if (sizeEligible) {
        optionGroups = buildSizeExtraGroup(largePortionExtra);
      } else if (isBurgerCategory) {
        if (mealEligible) {
          optionGroups = buildMealUpgradeGroups(
            mealTemplateId,
            CHEEKY_CHICKEN_HUB.mealUpgradePrice,
            "Regular fries",
            drinkOptions,
          );
        }
        optionGroups = [...optionGroups, ...buildBurgerSauceGroups(sauceItems), ...buildBurgerPaidExtrasGroup(extraItems)];
      }

      const components =
        isBurgerCategory && !isCustomLoaded
          ? burgerPartItems
              .filter((part) => /lettuce|mayo|salad/i.test(part.name))
              .map((part) => ({
                id: randomUUID(),
                label: part.name,
                quantity: 1,
                removable: true,
              }))
          : [];

      return buildMenuItem({
        id: randomUUID(),
        categoryId: sectionId,
        name: entry.name,
        price: entry.price,
        description: entry.note ?? "",
        isActive: true,
        optionGroups,
        components,
      });
    });

    return {
      id: sectionId,
      name: category.name
        .split(" ")
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(" ")
        .replace(/\bBbq\b/g, "BBQ")
        .replace(/\b&\b/g, "&"),
      description: "",
      presetKey,
      defaultPrice: null,
      items,
    };
  });

  return [...staffSections, ...customerSections];
}
