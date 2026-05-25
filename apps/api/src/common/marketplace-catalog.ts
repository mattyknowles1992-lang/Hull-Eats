import { NotFoundException } from "@nestjs/common";

import { prisma } from "@hull-eats/db";
import type { MenuItem, StoreSummary, StorefrontPromotionBanner } from "@hull-eats/types";
import {
  applyStorefrontPromotionsToMenu,
  customerFacingOptionGroupDescription,
  decodeHubMenuCategoryDescription,
  normaliseDeliveryPricing,
  getCategoryCustomerDescription,
  isStoreTakingOrdersNow,
  normalizeOpeningHours,
  readMenuSubGroupsFromSection,
  type StoreOpeningHours,
} from "@hull-eats/types";

import { mapStorePromotionRow } from "./store-promotion-mapper";

import { demoMenuByStore, demoMenuSectionsByStore, demoStores } from "./demo-data";

export type MarketplaceMenuCategory = {
  id: string;
  name: string;
  description?: string;
  subGroups: string[];
  items: MenuItem[];
};

export type MarketplaceMenu = {
  storeId: string;
  storeSlug: string;
  menuSetupComplete: boolean;
  onboardingMessage?: string;
  categories: MarketplaceMenuCategory[];
  activePromotions: StorefrontPromotionBanner[];
};

const mapStoreType = (type: string): StoreSummary["type"] => type.toLowerCase() as StoreSummary["type"];

const mapStorefrontStatus = (status: string): StoreSummary["storefrontStatus"] =>
  status.toLowerCase() as StoreSummary["storefrontStatus"];

const mapMenuItem = (item: {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: unknown;
  imageUrl: string | null;
  isActive: boolean;
  trackStock: boolean;
  stockQuantity: number | null;
  stockStatus: string;
  allowBackorder: boolean;
  maxPerOrder: number | null;
  sortOrder: number;
  requiresIdVerification: boolean;
  customisationConfig: unknown;
}): MenuItem => {
  const customisationConfig =
    item.customisationConfig && typeof item.customisationConfig === "object"
      ? (item.customisationConfig as {
          components?: unknown;
          optionGroups?: unknown;
          hubMenuSubGroup?: unknown;
        })
      : {};

  return {
    id: item.id,
    categoryId: item.categoryId,
    name: item.name,
    description: item.description ?? "",
    price: Number(item.price ?? 0),
    imageUrl: item.imageUrl ?? undefined,
    isActive: item.isActive,
    trackStock: item.trackStock,
    stockQuantity: item.stockQuantity,
    stockStatus: item.stockStatus.toLowerCase() as MenuItem["stockStatus"],
    allowBackorder: item.allowBackorder,
    maxPerOrder: item.maxPerOrder,
    sortOrder: item.sortOrder,
    requiresIdVerification: Boolean(item.requiresIdVerification),
    components: Array.isArray(customisationConfig.components) ? customisationConfig.components : [],
    optionGroups: (Array.isArray(customisationConfig.optionGroups)
      ? (customisationConfig.optionGroups as MenuItem["optionGroups"])
      : []
    ).map((group) => ({
      ...group,
      description: customerFacingOptionGroupDescription(group.description),
    })),
    menuSubGroup:
      typeof customisationConfig.hubMenuSubGroup === "string" && customisationConfig.hubMenuSubGroup.trim()
        ? customisationConfig.hubMenuSubGroup.trim()
        : undefined,
  };
};

const mapStoreRow = (
  store: {
    id: string;
    merchantId: string;
    slug: string;
    name: string;
    type: string;
    storefrontStatus: string;
    addressLine1: string;
    city: string;
    postcode: string;
    cuisineLabel: string | null;
    heroImageUrl: string | null;
    deliveryFee: unknown;
    minimumOrderAmount: unknown;
    etaMinutes: number | null;
    menuSetupComplete: boolean;
    onboardingMessage: string | null;
    deliveryConfig: unknown;
    isActive: boolean;
  },
  openingHours?: StoreOpeningHours,
): StoreSummary => {
  const marketplaceLive = store.isActive && store.storefrontStatus === "LIVE";
  const takingOrdersNow = isStoreTakingOrdersNow(openingHours, store.storefrontStatus === "LIVE", store.isActive);

  return {
    id: store.id,
    merchantId: store.merchantId,
    slug: store.slug,
    name: store.name,
    type: mapStoreType(store.type),
    storefrontStatus: mapStorefrontStatus(store.storefrontStatus),
    addressLine1: store.addressLine1,
    city: store.city,
    postcode: store.postcode,
    isOpen: marketplaceLive && takingOrdersNow,
    cuisineLabel: store.cuisineLabel ?? undefined,
    heroImageUrl: store.heroImageUrl ?? undefined,
    etaMinutes: store.etaMinutes ?? undefined,
    deliveryFee: Number(store.deliveryFee ?? 0),
    minimumOrderAmount: Number(store.minimumOrderAmount ?? 0),
    deliveryPricing: normaliseDeliveryPricing(store.deliveryConfig ?? {}),
    menuSetupComplete: store.menuSetupComplete,
    onboardingMessage: store.onboardingMessage ?? undefined,
  };
};

const mapStoreOpeningHoursFromRows = (
  rows: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>,
): StoreOpeningHours | undefined => {
  if (!rows.length) {
    return undefined;
  }

  return normalizeOpeningHours(
    rows.map((row) => ({
      dayOfWeek: row.dayOfWeek,
      isOpen: !row.isClosed,
      openTime: row.openTime,
      closeTime: row.closeTime,
    })),
  );
};

const findDemoStore = (slugOrId: string) =>
  demoStores.find((entry) => entry.id === slugOrId || entry.slug === slugOrId) ?? null;

export const findLiveMarketplaceStore = async (slugOrId: string): Promise<StoreSummary | null> => {
  const store = await prisma.store.findFirst({
    where: {
      OR: [{ slug: slugOrId }, { id: slugOrId }],
      storefrontStatus: "LIVE",
    },
    include: {
      storeHours: {
        orderBy: { dayOfWeek: "asc" },
      },
    },
  });

  if (!store) {
    return null;
  }

  const mapped = mapStoreRow(store, mapStoreOpeningHoursFromRows(store.storeHours));
  return mapped.isOpen ? mapped : null;
};

export const resolveMarketplaceStore = async (slugOrId: string): Promise<StoreSummary> => {
  const live = await findLiveMarketplaceStore(slugOrId);
  if (live) {
    return live;
  }

  const demo = findDemoStore(slugOrId);
  if (demo) {
    return demo;
  }

  throw new NotFoundException(`Store ${slugOrId} was not found.`);
};

export const listLiveMarketplaceStores = async (): Promise<StoreSummary[]> => {
  const stores = await prisma.store.findMany({
    where: {
      storefrontStatus: "LIVE",
    },
    include: {
      storeHours: {
        orderBy: { dayOfWeek: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  if (stores.length === 0) {
    return demoStores;
  }

  return stores
    .map((store) => mapStoreRow(store, mapStoreOpeningHoursFromRows(store.storeHours)))
    .filter((store) => store.isOpen);
};

export const findLiveMarketplaceMenu = async (slugOrId: string): Promise<MarketplaceMenu | null> => {
  const store = await prisma.store.findFirst({
    where: {
      OR: [{ slug: slugOrId }, { id: slugOrId }],
      storefrontStatus: "LIVE",
    },
    include: {
      storeHours: {
        orderBy: { dayOfWeek: "asc" },
      },
      menuCategories: {
        orderBy: { sortOrder: "asc" },
        include: {
          menuItems: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      promotions: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!store) {
    return null;
  }

  const mappedStore = mapStoreRow(store, mapStoreOpeningHoursFromRows(store.storeHours));
  if (!mappedStore.isOpen) {
    return null;
  }

  const categories = store.menuCategories
    .map((section) => {
      const decoded = decodeHubMenuCategoryDescription(section.description);
      return { section, decoded };
    })
    .filter(
      ({ decoded }) =>
        decoded.presetKey !== "extras-library" &&
        decoded.presetKey !== "meal-upgrades-library" &&
        decoded.presetKey !== "burger-kebab-parts-library" &&
        decoded.presetKey !== "burger-parts-library" &&
        decoded.presetKey !== "kebab-parts-library" &&
        decoded.presetKey !== "menu-boards-config",
    )
    .map(({ section, decoded }) => {
      const subGroupDefs = readMenuSubGroupsFromSection({
        description: section.description,
        presetKey: decoded.presetKey,
      });
      return {
        id: section.id,
        name: section.name,
        description:
          getCategoryCustomerDescription({ description: section.description, presetKey: decoded.presetKey }) || undefined,
        subGroups: subGroupDefs.map((group) => group.label),
        items: section.menuItems.map((item) => mapMenuItem(item)),
      };
    })
    .filter((category) => category.items.length > 0);

  const hubPromotions = store.promotions.map((row) => mapStorePromotionRow(row));
  const { categories: categoriesWithOffers, activePromotions } = applyStorefrontPromotionsToMenu(
    categories,
    hubPromotions,
  );

  return {
    storeId: store.id,
    storeSlug: store.slug,
    menuSetupComplete: store.menuSetupComplete,
    onboardingMessage: store.onboardingMessage ?? undefined,
    categories: categoriesWithOffers,
    activePromotions,
  };
};

export const resolveMarketplaceMenu = async (slugOrId: string): Promise<MarketplaceMenu> => {
  const live = await findLiveMarketplaceMenu(slugOrId);
  if (live && live.categories.length > 0) {
    return live;
  }

  const store = await resolveMarketplaceStore(slugOrId);
  const sections = demoMenuSectionsByStore[store.slug] ?? [];
  const items = demoMenuByStore[store.slug] ?? [];

  return {
    storeId: store.id,
    storeSlug: store.slug,
    menuSetupComplete: store.menuSetupComplete,
    onboardingMessage: store.onboardingMessage,
    categories:
      sections.length > 0
        ? sections.map((section) => ({
            id: section.id,
            name: section.name,
            description: section.description,
            subGroups: [],
            items: section.items,
          }))
        : items.length > 0
          ? [
              {
                id: "cat-primary",
                name: "Available now",
                subGroups: [],
                items,
              },
            ]
          : [],
    activePromotions: [],
  };
};

export const resolveMarketplaceMenuItems = async (slugOrId: string): Promise<MenuItem[]> => {
  const menu = await resolveMarketplaceMenu(slugOrId);
  return menu.categories.flatMap((category) => category.items);
};
