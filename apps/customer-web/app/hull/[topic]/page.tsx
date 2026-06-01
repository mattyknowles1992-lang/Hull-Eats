import Link from "next/link";
import { notFound } from "next/navigation";

import { deliveryFeeFromForStorefront } from "@hull-eats/types";

import { JsonLd } from "../../../src/components/json-ld";
import { AppSwitcher } from "../../app-switcher";
import { fetchMarketplaceStores } from "../../../src/lib/marketplace";
import {
  filterStoresForLandingPage,
  getSeoLandingPage,
  marketplaceCategoryLinks,
  relatedCategoriesForLanding,
  relatedLandingPagesFor,
  seoLandingPages,
} from "../../../src/lib/seo-landing-pages";
import { buildSeoLandingMetadata } from "../../../src/lib/seo";
import { buildBreadcrumbJsonLd, buildLandingPageJsonLd } from "../../../src/lib/seo-json-ld";

export function generateStaticParams() {
  return seoLandingPages.map((page) => ({ topic: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const page = getSeoLandingPage(topic);

  if (!page) {
    return {};
  }

  return buildSeoLandingMetadata({
    title: page.title,
    description: page.description,
    path: `/hull/${page.slug}`,
    keywords: page.keywords,
  });
}

export default async function SeoLandingPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const page = getSeoLandingPage(topic);

  if (!page) {
    notFound();
  }

  const allStores = (await fetchMarketplaceStores({ revalidateSeconds: 600 })) ?? [];
  const stores = filterStoresForLandingPage(allStores, page);
  const relatedCategories = relatedCategoriesForLanding(page);
  const relatedLandings = relatedLandingPagesFor(page);

  return (
    <main className="shell customer-marketplace seo-landing-page">
      <JsonLd
        data={[
          buildBreadcrumbJsonLd([
            { name: "Hull Eats", path: "/" },
            { name: page.headline, path: `/hull/${page.slug}` },
          ]),
          ...buildLandingPageJsonLd(page, stores),
        ]}
      />

      <header className="topbar">
        <div className="brand-pill">
          <Link href="/" className="icon-button">
            Back
          </Link>
          <AppSwitcher />
          <div>
            <p className="eyebrow">Hull food guide</p>
            <p className="brand-title">{page.headline}</p>
          </div>
        </div>
      </header>

      <section className="feature-panel seo-landing-hero">
        <p className="eyebrow">Kingston upon Hull</p>
        <h1>{page.headline}</h1>
        <p className="seo-landing-lead">{page.intro}</p>
        <p className="muted-copy">{page.description}</p>
      </section>

      {relatedCategories.length > 0 ? (
        <section className="seo-crawl-index-inner">
          <h2>Browse related categories</h2>
          <ul className="seo-crawl-link-list seo-crawl-link-list-inline">
            {relatedCategories.map((category) => (
              <li key={category.slug}>
                <Link href={`/categories/${category.slug}`}>{category.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="content-grid">
        <div className="content-stack">
          <div className="section-heading">
            <div>
              <h2>
                {stores.length > 0
                  ? `${stores.length} businesses delivering in Hull`
                  : "Hull businesses on Hull Eats"}
              </h2>
              <p>Order online with live menus, clear delivery fees, and no hidden service charges.</p>
            </div>
          </div>

          <div className="store-grid">
            {stores.map((store) => (
              <Link key={store.id} href={`/stores/${store.slug}`} className="store-card">
                <div
                  className="store-card-media"
                  style={{
                    backgroundImage: store.heroImageUrl
                      ? `linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0) 42%, rgba(8, 14, 24, 0.28)), url(${store.heroImageUrl})`
                      : undefined,
                  }}
                >
                  <div className="store-card-overlay">
                    <span className={`status-chip ${store.isOpen ? "accepted" : "rejected"}`}>
                      {store.isOpen ? "Open now" : "Closed"}
                    </span>
                  </div>
                </div>
                <div className="store-card-body">
                  <h3>{store.name}</h3>
                  <p className="store-meta">{store.cuisineLabel}</p>
                  <div className="store-tags">
                    {store.etaMinutes ? <span className="store-tag">{store.etaMinutes} min</span> : null}
                    {store.minimumOrderAmount !== undefined ? (
                      <span className="store-tag">Min £{store.minimumOrderAmount.toFixed(2)}</span>
                    ) : null}
                    <span className="store-tag">
                      Delivery from £
                      {deliveryFeeFromForStorefront({
                        legacyDeliveryFee: store.deliveryFee,
                        pricing: store.deliveryPricing,
                      }).toFixed(2)}
                    </span>
                  </div>
                  <span className="card-cta">{store.menuSetupComplete ? "Order now" : "View menu"}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="seo-crawl-index shell">
        <div className="seo-crawl-index-inner">
          <h2>More ways to order in Hull</h2>
          <ul className="seo-crawl-link-list seo-crawl-link-list-inline">
            {relatedLandings.map((related) => (
              <li key={related.slug}>
                <Link href={`/hull/${related.slug}`}>{related.title}</Link>
              </li>
            ))}
          </ul>
          <h3>All food categories</h3>
          <ul className="seo-crawl-link-list">
            {marketplaceCategoryLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
