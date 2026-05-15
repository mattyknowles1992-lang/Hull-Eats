import { NotFoundException } from "@nestjs/common";

import { prisma } from "@hull-eats/db";
import type { MenuItem, StoreSummary } from "@hull-eats/types";
import { decodeHubMenuCategoryDescription, normaliseDeliveryPricing } from "@hull-eats/types";

import { demoMenuByStore, demoMenuSectionsByStore, demoStores } from "./demo-data";

export type MarketplaceMenuCategory = {
  id: string;
  name: string;
  description?: string;
  items: MenuItem[];
};

export type MarketplaceMenu = {
  storeId: string;
  storeSlug: string;
  menuSetupComplete: boolean;
  onboardingMessage?: string;
  categories: MarketplaceMenuCategory[];
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
      ? (item.customisationConfig as { components?: unknown; optionGroups?: unknown })
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
    optionGroups: Array.isArray(customisationConfig.optionGroups) ? customisationConfig.optionGroups : [],
  };
};

const mapStoreRow = (store: {
  id: string;
  merchantId: string;
  slug: string;
  name: string;
  type: string;
  storefrontStatus: string;
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
}): StoreSummary => ({
  id: store.id,
  merchantId: store.merchantId,
  slug: store.slug,
  name: store.name,
  type: mapStoreType(store.type),
  storefrontStatus: mapStorefrontStatus(store.storefrontStatus),
  city: store.city,
  postcode: store.postcode,
  isOpen: store.isActive && store.storefrontStatus === "LIVE",
  cuisineLabel: store.cuisineLabel ?? undefined,
  heroImageUrl: store.heroImageUrl ?? undefined,
  etaMinutes: store.etaMinutes ?? undefined,
  deliveryFee: Number(store.deliveryFee ?? 0),
  minimumOrderAmount: Number(store.minimumOrderAmount ?? 0),
  deliveryPricing: normaliseDeliveryPricing(store.deliveryConfig ?? {}),
  menuSetupComplete: store.menuSetupComplete,
  onboardingMessage: store.onboardingMessage ?? undefined,
});

const findDemoStore = (slugOrId: string) =>
  demoStores.find((entry) => entry.id === slugOrId || entry.slug === slugOrId) ?? null;

export const findLiveMarketplaceStore = async (slugOrId: string): Promise<StoreSummary | null> => {
  const store = await prisma.store.findFirst({
    where: {
      OR: [{ slug: slugOrId }, { id: slugOrId }],
      storefrontStatus: "LIVE",
      isActive: true,
    },
  });

  return store ? mapStoreRow(store) : null;
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
      isActive: true,
    },
    orderBy: { name: "asc" },
  });

  if (stores.length === 0) {
    return demoStores;
  }

  return stores.map((store) => mapStoreRow(store));
};

export const findLiveMarketplaceMenu = async (slugOrId: string): Promise<MarketplaceMenu | null> => {
  const store = await prisma.store.findFirst({
    where: {
      OR: [{ slug: slugOrId }, { id: slugOrId }],
      storefrontStatus: "LIVE",
      isActive: true,
    },
    include: {
      menuCategories: {
        orderBy: { sortOrder: "asc" },
        include: {
          menuItems: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!store) {
    return null;
  }

  const categories = store.menuCategories
    .map((section) => {
      const decoded = decodeHubMenuCategoryDescription(section.description);
      return {
        id: section.id,
        name: section.name,
        description: decoded.description || undefined,
        items: section.menuItems.map((item) => mapMenuItem(item)),
      };
    })
    .filter((category) => category.items.length > 0);

  return {
    storeId: store.id,
    storeSlug: store.slug,
    menuSetupComplete: store.menuSetupComplete,
    onboardingMessage: store.onboardingMessage ?? undefined,
    categories,
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
            items: section.items,
          }))
        : items.length > 0
          ? [
              {
                id: "cat-primary",
                name: "Available now",
                items,
              },
            ]
          : [],
  };
};

export const resolveMarketplaceMenuItems = async (slugOrId: string): Promise<MenuItem[]> => {
  const menu = await resolveMarketplaceMenu(slugOrId);
  return menu.categories.flatMap((category) => category.items);
};
