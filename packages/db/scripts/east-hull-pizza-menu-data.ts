import { randomUUID } from "node:crypto";

import type { HubMenuSection, MenuItem, StoreOpeningHours } from "@hull-eats/types";
import {
  HUB_MENU_BURGER_PARTS_PRESET,
  HUB_MENU_EXTRAS_LIBRARY_PRESET,
  HUB_MENU_MEAL_LIBRARY_PRESET,
  HUB_MENU_SAUCES_LIBRARY_PRESET,
  STORE_OPENING_DAY_OF_WEEK,
} from "@hull-eats/types";

import { EAST_HULL_PIZZA_MENU_CATALOG } from "./east-hull-pizza-menu-catalog.js";

export const EAST_HULL_PIZZA_HUB = {
  businessName: "East Hull Pizza",
  ownerEmail: "easthull@pizza.com",
  password: "letmein",
  slug: "east-hull-pizza",
  mealUpgradePrice: 2.5,
  city: "Hull",
  postcode: "HU9 1AA",
  cuisineLabel: "Pizza, kebabs & burgers",
} as const;

export const EAST_HULL_PIZZA_BUSINESS = {
  minimumOrderAmount: 8,
  deliveryFee: 2.5,
  deliveryRadiusMiles: 4,
  etaMinutes: 40,
  orderFulfillment: "delivery_and_collection" as const,
  deliveryDistanceRanges: [
    { maxMiles: 1.5, fee: 2.5, minimumOrderAmount: 8 },
    { maxMiles: 2.5, fee: 3.5, minimumOrderAmount: 10 },
    { maxMiles: 4, fee: 4.5, minimumOrderAmount: 12 },
  ],
  openingTime: "16:00",
  closingTime: "23:30",
  pickupFromTime: "12:00",
  onboardingMessage:
    "Welcome to East Hull Pizza. Set items live and publish when your menu is ready. Collection and delivery hours can be tuned under Opening times.",
} as const;

const BURGER_CATEGORY_NAMES = new Set(["BURGERS"]);
const DRINKS_SECTION_NAMES = new Set(["DRINKS"]);
const MILKSHAKE_SECTION_NAMES = new Set(["Milkshakes"]);

const EXTRAS_CATALOG: Array<{ name: string; price: number }> = [
  { name: "Extra cheese", price: 1 },
  { name: "Mushrooms", price: 0.6 },
  { name: "Jalapenos", price: 0.5 },
  { name: "Onion", price: 0.4 },
  { name: "Pepperoni", price: 0.9 },
  { name: "Ham", price: 0.9 },
  { name: "Chicken", price: 1 },
  { name: "Bacon", price: 1 },
];

const SAUCES_CATALOG: Array<{ name: string; price: number }> = [
  { name: "Garlic sauce", price: 1.65 },
  { name: "Chilli sauce", price: 1.65 },
  { name: "Mayo", price: 1.65 },
  { name: "BBQ sauce", price: 1.65 },
  { name: "Burger sauce", price: 1.65 },
];

const BURGER_PARTS = ["Lettuce", "Mayo", "Salad", "Tomato", "Onion"];

function withPizzaKind(kind: "pizza" | "garlic_bread" | "calzone", description = ""): string {
  const marker = `__HULL_PIZZA_KIND:${kind}__`;
  const text = description.trim();
  return text ? `${marker}\n${text}` : marker;
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
  const preferred = ["Mayo", "BBQ sauce", "Garlic sauce", "Chilli sauce", "Burger sauce"];
  const includedOptions = sauceItems
    .filter((sauce) => preferred.some((label) => sauce.name.toLowerCase() === label.toLowerCase()))
    .map((sauce) => ({
      id: sauce.id,
      label: sauce.name,
      description: "",
      priceDelta: 0,
      isDefault: false,
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
  ];
}

function buildBurgerPaidExtrasGroup(extraItems: MenuItem[]): MenuItem["optionGroups"] {
  if (extraItems.length === 0) {
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

function buildMealUpgradeGroups(templateId: string, upgradePrice: number): MenuItem["optionGroups"] {
  const seed = randomUUID();
  const mealYesId = `${seed}-meal-yes`;
  return [
    {
      id: randomUUID(),
      name: "Make it a meal",
      description: "__HULL_MEAL_CHOICE__",
      selectionMode: "single",
      isRequired: false,
      minSelections: 0,
      maxSelections: 1,
      showWhenValueIds: [],
      options: [
        { id: `${seed}-meal-no`, label: "On its own", description: "", priceDelta: 0, isDefault: false, maxQuantity: 1 },
        { id: mealYesId, label: "Make it a meal", description: "", priceDelta: upgradePrice, isDefault: false, maxQuantity: 1 },
      ],
    },
  ];
}

function resolveSectionPresetKey(categoryName: string): string | null {
  if (categoryName === "PIZZAS" || categoryName === "CALZONES" || categoryName === "GARLIC BREAD") {
    return "pizza";
  }
  if (BURGER_CATEGORY_NAMES.has(categoryName)) {
    return "burgers";
  }
  if (DRINKS_SECTION_NAMES.has(categoryName)) {
    return "drinks";
  }
  if (MILKSHAKE_SECTION_NAMES.has(categoryName)) {
    return "milkshakes";
  }
  return null;
}

function resolveItemDescription(categoryName: string, description?: string): string {
  if (categoryName === "CALZONES") {
    return withPizzaKind("calzone", description ?? "");
  }
  if (categoryName === "GARLIC BREAD") {
    return withPizzaKind("garlic_bread", description ?? "");
  }
  if (categoryName === "PIZZAS") {
    return withPizzaKind("pizza", description ?? "");
  }
  return description ?? "";
}

export function buildEastHullPizzaOpeningHours(): StoreOpeningHours {
  const { openingTime, closingTime } = EAST_HULL_PIZZA_BUSINESS;
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

export function buildEastHullPizzaDeliveryConfig() {
  return {
    mode: "business_radius" as const,
    radiusMiles: EAST_HULL_PIZZA_BUSINESS.deliveryRadiusMiles,
    distanceRanges: EAST_HULL_PIZZA_BUSINESS.deliveryDistanceRanges.map((range) => ({ ...range })),
    postcodeZones: [],
    postcodeDistricts: [],
    mileFees: [0, 0, 0, 0],
    originLatitude: null,
    originLongitude: null,
    orderFulfillment: EAST_HULL_PIZZA_BUSINESS.orderFulfillment,
  };
}

export function buildEastHullPizzaMenuSections(): HubMenuSection[] {
  const extrasSectionId = randomUUID();
  const saucesSectionId = randomUUID();
  const burgerPartsSectionId = randomUUID();
  const mealSectionId = randomUUID();
  const mealTemplateId = randomUUID();

  const extraItems = EXTRAS_CATALOG.map((extra) =>
    buildMenuItem({
      id: randomUUID(),
      categoryId: extrasSectionId,
      name: extra.name,
      price: extra.price,
      isActive: true,
    }),
  );

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
    name: "Chips & can drink",
    price: EAST_HULL_PIZZA_HUB.mealUpgradePrice,
    description: encodeMealCfg(
      [{ id: randomUUID(), label: "Chips" }],
      [{ id: randomUUID(), label: "Can of drink" }],
      "Meal upgrade — chips and a can.",
    ),
    isActive: true,
  });

  const staffSections: HubMenuSection[] = [
    {
      id: extrasSectionId,
      name: "Added extras",
      description: "Paid add-ons for burgers and pizzas.",
      presetKey: HUB_MENU_EXTRAS_LIBRARY_PRESET,
      defaultPrice: 0,
      items: extraItems,
    },
    {
      id: saucesSectionId,
      name: "Sauces",
      description: "Sauce list for kebabs and burgers.",
      presetKey: HUB_MENU_SAUCES_LIBRARY_PRESET,
      defaultPrice: 0,
      items: sauceItems,
    },
    {
      id: burgerPartsSectionId,
      name: "Burger parts",
      description: "Salad and sauce parts for burgers.",
      presetKey: HUB_MENU_BURGER_PARTS_PRESET,
      defaultPrice: 0,
      items: burgerPartItems,
    },
    {
      id: mealSectionId,
      name: "Make it a meal",
      description: "Meal upgrade for burgers.",
      presetKey: HUB_MENU_MEAL_LIBRARY_PRESET,
      defaultPrice: EAST_HULL_PIZZA_HUB.mealUpgradePrice,
      items: [mealTemplateItem],
    },
  ];

  const customerSections: HubMenuSection[] = EAST_HULL_PIZZA_MENU_CATALOG.map((category) => {
    const sectionId = randomUUID();
    const presetKey = resolveSectionPresetKey(category.name);
    const isBurgerCategory = BURGER_CATEGORY_NAMES.has(category.name);

    const items = category.items.map((entry) => {
      let optionGroups: MenuItem["optionGroups"] = [];
      if (isBurgerCategory) {
        optionGroups = [
          ...buildMealUpgradeGroups(mealTemplateId, EAST_HULL_PIZZA_HUB.mealUpgradePrice),
          ...buildBurgerSauceGroups(sauceItems),
          ...buildBurgerPaidExtrasGroup(extraItems),
        ];
      }

      const components =
        isBurgerCategory
          ? burgerPartItems
              .filter((part) => /lettuce|mayo|salad|tomato|onion/i.test(part.name))
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
        description: resolveItemDescription(category.name, entry.description),
        isActive: true,
        optionGroups,
        components,
      });
    });

    return {
      id: sectionId,
      name: category.name,
      description: category.categoryDescription ?? "",
      presetKey,
      defaultPrice: null,
      items,
    };
  });

  return [...staffSections, ...customerSections];
}
