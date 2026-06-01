import Link from "next/link";

import type { StoreSummary } from "@hull-eats/types";

import {
  marketplaceCategoryLinks,
  seoLandingHubLinks,
} from "../src/lib/seo-landing-pages";

type HomePageCrawlIndexProps = {
  stores: StoreSummary[];
};

export function HomePageCrawlIndex({ stores }: HomePageCrawlIndexProps) {
  if (stores.length === 0) {
    return null;
  }

  const sortedStores = [...stores].sort((first, second) => first.name.localeCompare(second.name, "en-GB"));

  return (
    <section className="seo-crawl-index shell" aria-labelledby="seo-crawl-index-title">
      <div className="seo-crawl-index-inner">
        <div className="seo-crawl-index-intro">
          <p className="eyebrow">Hull food delivery</p>
          <h2 id="seo-crawl-index-title">Order from {sortedStores.length} local businesses in Hull</h2>
          <p>
            Hull Eats lists takeaways, restaurants, grocers, bakeries, butchers, convenience stores, and speciality
            shops across Kingston upon Hull. Browse by category or discover popular searches below.
          </p>
        </div>

        <div className="seo-crawl-index-columns">
          <div>
            <h3>Popular in Hull</h3>
            <ul className="seo-crawl-link-list">
              {seoLandingHubLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3>Food categories</h3>
            <ul className="seo-crawl-link-list">
              {marketplaceCategoryLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="seo-crawl-store-grid" aria-label="All Hull Eats businesses">
          {sortedStores.map((store) => (
            <Link key={store.id} href={`/stores/${store.slug}`} className="seo-crawl-store-link">
              <strong>{store.name}</strong>
              {store.cuisineLabel ? <span>{store.cuisineLabel}</span> : null}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
