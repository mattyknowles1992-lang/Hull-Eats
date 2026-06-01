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

type MarketplaceFetchOptions = {
  /** ISR revalidate interval in seconds (sitemaps, SEO pages). Omit for live client refresh. */
  revalidateSeconds?: number;
};

function marketplaceFetchInit(options?: MarketplaceFetchOptions): RequestInit {
  if (options?.revalidateSeconds !== undefined) {
    return { next: { revalidate: options.revalidateSeconds } };
  }

  return { cache: "no-store" };
}

export async function fetchMarketplaceStores(options?: MarketplaceFetchOptions): Promise<StoreSummary[] | null> {
  try {
    const response = await fetch(`${marketplaceApiBaseUrl}/v1/public/stores`, marketplaceFetchInit(options));
    return readJson<StoreSummary[]>(response);
  } catch {
    return null;
  }
}

export async function fetchMarketplaceStore(
  slugOrId: string,
  options?: MarketplaceFetchOptions,
): Promise<StoreSummary | null> {
  try {
    const response = await fetch(
      `${marketplaceApiBaseUrl}/v1/public/stores/${encodeURIComponent(slugOrId)}`,
      marketplaceFetchInit(options),
    );
    return readJson<StoreSummary>(response);
  } catch {
    return null;
  }
}

export async function fetchMarketplaceMenu(
  slugOrId: string,
  options?: MarketplaceFetchOptions,
): Promise<MarketplaceMenu | null> {
  try {
    const response = await fetch(
      `${marketplaceApiBaseUrl}/v1/public/stores/${encodeURIComponent(slugOrId)}/menu`,
      marketplaceFetchInit(options),
    );
    return readJson<MarketplaceMenu>(response);
  } catch {
    return null;
  }
}
