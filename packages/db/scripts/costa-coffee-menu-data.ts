import { randomUUID } from "node:crypto";

import type { HubMenuSection, MenuItem, StoreOpeningHours } from "@hull-eats/types";
import { STORE_OPENING_DAY_OF_WEEK } from "@hull-eats/types";

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

export function buildCostaCoffeeMenuSections(): HubMenuSection[] {
  return COSTA_COFFEE_MENU_CATALOG.map((category) => {
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
}
