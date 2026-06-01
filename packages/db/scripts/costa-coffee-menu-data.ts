import { randomUUID } from "node:crypto";

import type { HubMenuSection, MenuItem, StoreOpeningHours } from "@hull-eats/types";
import { STORE_OPENING_DAY_OF_WEEK } from "@hull-eats/types";

import {
  applyMealDealConfigToMenuItem,
  type HubMealDealConfig,
} from "@hull-eats/types";

import { COSTA_COFFEE_MENU_CATALOG } from "./costa-coffee-menu-catalog.js";

export const COSTA_COFFEE_HUB = {
  businessName: "Costa Coffee",
  ownerEmail: "costa@coffee.com",
  password: "letmein",
  slug: "costa-coffee",
  city: "Hull",
  postcode: "HU6 7PT",
  addressLine1: "Drive Thru, Unit 6",
  cuisineLabel: "Coffee & food",
} as const;

export const COSTA_COFFEE_BUSINESS = {
  minimumOrderAmount: 5,
  deliveryFee: 2.99,
  deliveryRadiusMiles: 3,
  etaMinutes: 25,
  orderFulfillment: "delivery_and_collection" as const,
  deliveryDistanceRanges: [
    { maxMiles: 1.5, fee: 2.99, minimumOrderAmount: 5 },
    { maxMiles: 2.5, fee: 3.49, minimumOrderAmount: 6 },
    { maxMiles: 3, fee: 3.99, minimumOrderAmount: 7 },
  ],
  openingTime: "06:30",
  closingTime: "20:00",
  pickupFromTime: "06:30",
  onboardingMessage:
    "Welcome to Costa Coffee. Your menu is provisioned live — review deals and drink customisations in Menu Studio, then publish when ready.",
} as const;

const COFFEE_PRESET_CATEGORIES = new Set([
  "What's New",
  "Iced Drinks",
  "Matcha Lattes",
  "Coffee",
  "Hot Chocolate and More",
  "Teas and Infusions",
]);

function buildMenuItem(input: {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  description?: string;
  isActive?: boolean;
  stockStatus?: MenuItem["stockStatus"];
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
    stockStatus: input.stockStatus ?? "in_stock",
    allowBackorder: false,
    maxPerOrder: null,
    requiresIdVerification: false,
    sortOrder: 0,
    components: [],
    optionGroups: [],
  };
}

function resolveSectionPresetKey(categoryName: string, explicit?: string | null): string | null {
  if (explicit !== undefined && explicit !== null) {
    return explicit;
  }
  if (categoryName === "Deals") {
    return "meal-deals";
  }
  if (categoryName === "Chilled Drinks") {
    return "drinks";
  }
  if (COFFEE_PRESET_CATEGORIES.has(categoryName)) {
    return "coffee";
  }
  return null;
}

export function buildCostaCoffeeOpeningHours(): StoreOpeningHours {
  const { openingTime, closingTime } = COSTA_COFFEE_BUSINESS;
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

export function buildCostaCoffeeDeliveryConfig() {
  return {
    mode: "business_radius" as const,
    radiusMiles: COSTA_COFFEE_BUSINESS.deliveryRadiusMiles,
    distanceRanges: COSTA_COFFEE_BUSINESS.deliveryDistanceRanges.map((range) => ({ ...range })),
    postcodeZones: [],
    postcodeDistricts: [],
    mileFees: [0, 0, 0],
    originLatitude: null,
    originLongitude: null,
    orderFulfillment: COSTA_COFFEE_BUSINESS.orderFulfillment,
  };
}

function listMenuProductRefs(sections: HubMenuSection[]) {
  const products: Array<{ id: string; name: string; categoryId: string }> = [];
  for (const section of sections) {
    if (section.presetKey === "meal-deals") {
      continue;
    }
    for (const item of section.items) {
      if (item.name.trim()) {
        products.push({ id: item.id, name: item.name.trim(), categoryId: section.id });
      }
    }
  }
  return products;
}

function sectionIdsByNames(sections: HubMenuSection[], names: string[]): string[] {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  return sections.filter((section) => wanted.has(section.name.trim().toLowerCase())).map((section) => section.id);
}

function wireCostaMealDeals(sections: HubMenuSection[]): HubMenuSection[] {
  const products = listMenuProductRefs(sections);
  const dealsSection = sections.find((section) => section.presetKey === "meal-deals");
  if (!dealsSection) {
    return sections;
  }

  const foodCategoryIds = sectionIdsByNames(sections, [
    "Main Meals",
    "Pastries, Baps & Breakfast",
    "Sandwiches & Toasties",
    "What's New",
    "Muffins, Cakes and Bakes",
  ]);
  const drinkCategoryIds = sectionIdsByNames(sections, [
    "Coffee",
    "Iced Drinks & Cold Brew",
    "Fruit Coolers",
    "Chillers",
    "Hot Chocolate & More",
    "Teas & Infusions",
    "Chilled Drinks",
  ]);
  const snackCategoryIds = sectionIdsByNames(sections, ["Crisps & Snacks"]);

  const configsByDealName: Record<string, HubMealDealConfig> = {
    "Lunch Meal For 1": {
      steps: [
        { id: "food", label: "Food", source: "pick_categories", productIds: [], categoryIds: foodCategoryIds, required: true },
        { id: "drink", label: "Drink", source: "pick_categories", productIds: [], categoryIds: drinkCategoryIds, required: true },
      ],
    },
    "Lunch + Crisps Meal for 1": {
      steps: [
        { id: "food", label: "Food", source: "pick_categories", productIds: [], categoryIds: foodCategoryIds, required: true },
        { id: "snack", label: "Crisps", source: "pick_categories", productIds: [], categoryIds: snackCategoryIds, required: true },
        { id: "drink", label: "Drink", source: "pick_categories", productIds: [], categoryIds: drinkCategoryIds, required: true },
      ],
    },
    "Afternoon Coffee & Cake Deal": {
      steps: [
        { id: "drink", label: "Drink", source: "pick_categories", productIds: [], categoryIds: drinkCategoryIds, required: true },
        {
          id: "cake",
          label: "Cake or bake",
          source: "pick_categories",
          productIds: [],
          categoryIds: sectionIdsByNames(sections, ["Muffins, Cakes and Bakes"]),
          required: true,
        },
      ],
    },
  };

  return sections.map((section) => {
    if (section.id !== dealsSection.id) {
      return section;
    }
    return {
      ...section,
      items: section.items.map((item) => {
        const config = configsByDealName[item.name.trim()];
        if (!config) {
          return item;
        }
        return applyMealDealConfigToMenuItem(item, config, products, () => randomUUID());
      }),
    };
  });
}

export function buildCostaCoffeeMenuSections(): HubMenuSection[] {
  const sections = COSTA_COFFEE_MENU_CATALOG.map((category) => {
    const sectionId = randomUUID();
    const presetKey = resolveSectionPresetKey(category.name, category.presetKey);

    const items = category.items.map((entry) =>
      buildMenuItem({
        id: randomUUID(),
        categoryId: sectionId,
        name: entry.name,
        price: entry.price,
        description: entry.description,
        isActive: true,
        stockStatus: entry.soldOut ? "out_of_stock" : "in_stock",
      }),
    );

    return {
      id: sectionId,
      name: category.name,
      description: category.categoryDescription ?? "",
      presetKey,
      defaultPrice: null,
      items,
    };
  });
  return wireCostaMealDeals(sections);
}
