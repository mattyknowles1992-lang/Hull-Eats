import { NotFoundException } from "@nestjs/common";

import { prisma } from "@hull-eats/db";
import type { MenuItem, StoreSummary, StorefrontPromotionBanner } from "@hull-eats/types";
import {
  applyStorefrontPromotionsToMenu,
  buildStorefrontEnrichmentContext,
  decodeHubMenuCategoryDescription,
  enrichStorefrontMenuItem,
  getCategoryCustomerDescription,
  isMenuItemPriceListable,
  isStoreTakingOrdersNow,
  normaliseDeliveryPricingForServe,
  normalizeOpeningHours,
  readCategoryExtrasConfigItemDescription,
  readMenuSubGroupsFromSection,
  type StoreOpeningHours,
} from "@hull-eats/types";

import { mapStorePromotionRow } from "./store-promotion-mapper";

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

const UUID_LIKE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const buildStoreLookupWhere = (slugOrId: string) =>
  UUID_LIKE_PATTERN.test(slugOrId)
    ? {
        OR: [{ slug: slugOrId }, { id: slugOrId }],
      }
    : {
        slug: slugOrId,
      };

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
    optionGroups: Array.isArray(customisationConfig.optionGroups)
      ? (customisationConfig.optionGroups as MenuItem["optionGroups"])
      : [],
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
    homepageFeatured: boolean;
    homepageFeatureOrder: number | null;
    isActive: boolean;
  },
  openingHours?: StoreOpeningHours,
): StoreSummary => {
  const takingOrdersNow = isStoreTakingOrdersNow(openingHours, store.storefrontStatus === "LIVE", store.isActive);
  const homepageFeatured = Boolean(store.homepageFeatured && store.storefrontStatus === "LIVE" && store.isActive);

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
    isOpen: takingOrdersNow,
    cuisineLabel: store.cuisineLabel ?? undefined,
    heroImageUrl: store.heroImageUrl ?? undefined,
    etaMinutes: store.etaMinutes ?? undefined,
    deliveryFee: Number(store.deliveryFee ?? 0),
    minimumOrderAmount: Number(store.minimumOrderAmount ?? 0),
    deliveryPricing: normaliseDeliveryPricingForServe(store.deliveryConfig ?? {}),
    homepageFeatured,
    homepageFeatureOrder: homepageFeatured ? store.homepageFeatureOrder ?? null : null,
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

const selectPrimaryMarketplaceStore = <T extends { slug: string; merchant: { slug: string } }>(stores: T[]): T | null =>
  stores.find((store) => store.slug === store.merchant.slug) ?? stores[0] ?? null;

export const findLiveMarketplaceStore = async (slugOrId: string): Promise<StoreSummary | null> => {
  let store = await prisma.store.findFirst({
    where: {
      ...buildStoreLookupWhere(slugOrId),
      storefrontStatus: "LIVE",
    },
    include: {
      merchant: {
        select: { slug: true },
      },
      storeHours: {
        orderBy: { dayOfWeek: "asc" },
      },
    },
  });

  if (!store) {
    return null;
  }

  if (store.slug !== store.merchant.slug) {
    const primaryStore = await prisma.store.findFirst({
      where: {
        merchantId: store.merchantId,
        storefrontStatus: "LIVE",
        slug: store.merchant.slug,
      },
      include: {
        merchant: {
          select: { slug: true },
        },
        storeHours: {
          orderBy: { dayOfWeek: "asc" },
        },
      },
    });
    if (primaryStore) {
      store = primaryStore;
    }
  }

  const mapped = mapStoreRow(store, mapStoreOpeningHoursFromRows(store.storeHours));
  return mapped;
};

export const resolveMarketplaceStore = async (slugOrId: string): Promise<StoreSummary> => {
  const live = await findLiveMarketplaceStore(slugOrId);
  if (live) {
    return live;
  }

  throw new NotFoundException(`Store ${slugOrId} was not found.`);
};

export const listLiveMarketplaceStores = async (): Promise<StoreSummary[]> => {
  const stores = await prisma.store.findMany({
    where: {
      storefrontStatus: "LIVE",
    },
    include: {
      merchant: {
        select: { slug: true },
      },
      storeHours: {
        orderBy: { dayOfWeek: "asc" },
      },
    },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
  });

  const storesByMerchant = new Map<string, typeof stores>();
  for (const store of stores) {
    const merchantStores = storesByMerchant.get(store.merchantId);
    if (merchantStores) {
      merchantStores.push(store);
      continue;
    }
    storesByMerchant.set(store.merchantId, [store]);
  }

  return Array.from(storesByMerchant.values())
    .map((merchantStores) => selectPrimaryMarketplaceStore(merchantStores))
    .filter((store): store is (typeof stores)[number] => Boolean(store))
    .map((store) => mapStoreRow(store, mapStoreOpeningHoursFromRows(store.storeHours)))
    .sort((firstStore, secondStore) => firstStore.name.localeCompare(secondStore.name, "en-GB"));
};

export const findLiveMarketplaceMenu = async (slugOrId: string): Promise<MarketplaceMenu | null> => {
  let store = await prisma.store.findFirst({
    where: {
      ...buildStoreLookupWhere(slugOrId),
      storefrontStatus: "LIVE",
    },
    include: {
      merchant: {
        select: { slug: true },
      },
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

  if (store.slug !== store.merchant.slug) {
    const primaryStore = await prisma.store.findFirst({
      where: {
        merchantId: store.merchantId,
        storefrontStatus: "LIVE",
        slug: store.merchant.slug,
      },
      include: {
        merchant: {
          select: { slug: true },
        },
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
    if (primaryStore) {
      store = primaryStore;
    }
  }

  const extrasLibrarySection = store.menuCategories.find((section) => {
    const decoded = decodeHubMenuCategoryDescription(section.description ?? "");
    return decoded.presetKey === "extras-library";
  });

  const extrasConfigDescription = readCategoryExtrasConfigItemDescription(
    (extrasLibrarySection?.menuItems ?? []).map((item) => ({
      id: item.id,
      description: item.description ?? "",
    })),
  );

  const extraToppings = (extrasLibrarySection?.menuItems ?? [])
    .filter((item) => item.id !== "hull-category-extras-config" && item.isActive)
    .map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price ?? 0),
    }));

  const categories = store.menuCategories
    .map((section) => {
      const decoded = decodeHubMenuCategoryDescription(section.description);
      return { section, decoded };
    })
    .filter(
      ({ decoded }) =>
        decoded.presetKey !== "extras-library" &&
        decoded.presetKey !== "sauces-library" &&
        decoded.presetKey !== "salad-library" &&
        decoded.presetKey !== "side-seasonings-library" &&
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
      const enrichmentContext = buildStorefrontEnrichmentContext({
        sectionId: section.id,
        sectionDescription: section.description ?? "",
        sectionPresetKey: decoded.presetKey,
        extrasConfigDescription,
        extraToppings,
      });

      return {
        id: section.id,
        name: section.name,
        presetKey: decoded.presetKey,
        description:
          getCategoryCustomerDescription({ description: section.description, presetKey: decoded.presetKey }) || undefined,
        subGroups: subGroupDefs.map((group) => group.label),
        items: section.menuItems
          .map((item) => enrichStorefrontMenuItem(mapMenuItem(item), enrichmentContext))
          .filter((item) => isMenuItemPriceListable(item)),
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
  if (live) {
    return live;
  }

  const store = await resolveMarketplaceStore(slugOrId);

  return {
    storeId: store.id,
    storeSlug: store.slug,
    menuSetupComplete: store.menuSetupComplete,
    onboardingMessage: store.onboardingMessage,
    categories: [],
    activePromotions: [],
  };
};

export const resolveMarketplaceMenuItems = async (slugOrId: string): Promise<MenuItem[]> => {
  const menu = await resolveMarketplaceMenu(slugOrId);
  return menu.categories.flatMap((category) => category.items);
};
