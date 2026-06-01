import { fetchMarketplaceStores } from "../src/lib/marketplace";
import { buildHomeMetadata } from "../src/lib/seo";
import { buildHomepageBusinessIndexJsonLd } from "../src/lib/seo-json-ld";
import { JsonLd } from "../src/components/json-ld";
import { HomePageClient } from "./home-page-client";
import { HomePageCrawlIndex } from "./home-page-crawl-index";

export const metadata = buildHomeMetadata();

export default async function CustomerHomePage() {
  const stores = (await fetchMarketplaceStores({ revalidateSeconds: 300 })) ?? [];

  return (
    <>
      <JsonLd data={buildHomepageBusinessIndexJsonLd(stores)} />
      <HomePageClient initialStores={stores} />
      <HomePageCrawlIndex stores={stores} />
    </>
  );
}
