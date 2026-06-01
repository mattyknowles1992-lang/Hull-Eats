import type { MetadataRoute } from "next";

import { fetchMarketplaceStores } from "../src/lib/marketplace";
import { marketplaceCategories } from "../src/lib/marketplace-categories";
import { seoLandingPages } from "../src/lib/seo-landing-pages";
import { absoluteUrl } from "../src/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const stores = (await fetchMarketplaceStores({ revalidateSeconds: 3600 })) ?? [];

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: absoluteUrl("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/contact"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/partner"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = marketplaceCategories.map((category) => ({
    url: absoluteUrl(`/categories/${category.slug}`),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.85,
  }));

  const landingRoutes: MetadataRoute.Sitemap = seoLandingPages.map((page) => ({
    url: absoluteUrl(`/hull/${page.slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const storeRoutes: MetadataRoute.Sitemap = stores.map((store) => ({
    url: absoluteUrl(`/stores/${store.slug}`),
    lastModified: now,
    changeFrequency: "daily",
    priority: store.menuSetupComplete ? 0.9 : 0.7,
  }));

  return [...staticRoutes, ...landingRoutes, ...categoryRoutes, ...storeRoutes];
}
