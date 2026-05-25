import type { MenuItem, StoreSummary, StorefrontPromotionBanner } from "@hull-eats/types";

const defaultApiBaseUrl = process.env.NODE_ENV === "production" ? "https://hull-eats-api.onrender.com" : "http://localhost:4000";
export const marketplaceApiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? defaultApiBaseUrl).replace(/\/$/, "");

export type MarketplaceMenuCategory = {
  id: string;
  name: string;
  description?: string;
  subGroups?: string[];
  items: MenuItem[];
};

export type MarketplaceMenu = {
  storeId: string;
  menuSetupComplete: boolean;
  onboardingMessage?: string;
  categories: MarketplaceMenuCategory[];
  activePromotions?: StorefrontPromotionBanner[];
};

async function readJson<T>(response: Response): Promise<T | null> {
  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

export async function fetchMarketplaceStores(): Promise<StoreSummary[] | null> {
  try {
    const response = await fetch(`${marketplaceApiBaseUrl}/v1/public/stores`, {
      cache: "no-store",
    });
    return readJson<StoreSummary[]>(response);
  } catch {
    return null;
  }
}

export async function fetchMarketplaceStore(slugOrId: string): Promise<StoreSummary | null> {
  try {
    const response = await fetch(`${marketplaceApiBaseUrl}/v1/public/stores/${encodeURIComponent(slugOrId)}`, {
      cache: "no-store",
    });
    return readJson<StoreSummary>(response);
  } catch {
    return null;
  }
}

export async function fetchMarketplaceMenu(slugOrId: string): Promise<MarketplaceMenu | null> {
  try {
    const response = await fetch(`${marketplaceApiBaseUrl}/v1/public/stores/${encodeURIComponent(slugOrId)}/menu`, {
      cache: "no-store",
    });
    return readJson<MarketplaceMenu>(response);
  } catch {
    return null;
  }
}
