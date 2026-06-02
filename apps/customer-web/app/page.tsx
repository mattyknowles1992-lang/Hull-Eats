import { Suspense } from "react";

import { fetchMarketplaceStores } from "../src/lib/marketplace";
import { buildHomeMetadata } from "../src/lib/seo";
import { buildHomepageBusinessIndexJsonLd } from "../src/lib/seo-json-ld";
import { JsonLd } from "../src/components/json-ld";
import { HomePageClient } from "./home-page-client";
import { HomePageCrawlIndex } from "./home-page-crawl-index";

export const metadata = buildHomeMetadata();

type HomePageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function CustomerHomePage({ searchParams }: HomePageProps) {
  const { q } = await searchParams;
  const initialSearchQuery = typeof q === "string" ? q.trim() : "";
  const stores = (await fetchMarketplaceStores({ revalidateSeconds: 300 })) ?? [];

  return (
    <>
      <JsonLd data={buildHomepageBusinessIndexJsonLd(stores)} />
      <Suspense fallback={null}>
        <HomePageClient initialStores={stores} initialSearchQuery={initialSearchQuery} />
      </Suspense>
      <HomePageCrawlIndex stores={stores} />
    </>
  );
}
