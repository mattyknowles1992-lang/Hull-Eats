import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import type { StoreSummary } from "@hull-eats/types";
import { deliveryFeeFromForStorefront } from "@hull-eats/types";

import { JsonLd } from "../../../src/components/json-ld";
import { AppSwitcher } from "../../app-switcher";
import { fetchMarketplaceStores } from "../../../src/lib/marketplace";
import {
  getMarketplaceCategory,
  marketplaceCategories,
  type MarketplaceSubcategory,
  storeMatchesMarketplaceCategory,
  textMatchesMarketplaceSubcategory,
} from "../../../src/lib/marketplace-categories";
import { buildCategoryMetadata } from "../../../src/lib/seo";
import { buildCategoryPageJsonLd } from "../../../src/lib/seo-json-ld";

export function generateStaticParams() {
  return marketplaceCategories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const category = getMarketplaceCategory(categorySlug);

  if (!category) {
    return {};
  }

  const stores = (await fetchMarketplaceStores({ revalidateSeconds: 600 })) ?? [];
  const matchingCount = stores.filter((store) =>
    storeMatchesMarketplaceCategory(
      store,
      category,
      [store.name, store.type, store.city, store.cuisineLabel, store.onboardingMessage]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    ),
  ).length;

  return buildCategoryMetadata(category, matchingCount);
}

function getSearchableStoreText(store: StoreSummary) {
  return [
    store.name,
    store.type,
    store.city,
    store.cuisineLabel,
    store.onboardingMessage,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getSubcategoryMatchCount(stores: StoreSummary[], subcategory: MarketplaceSubcategory) {
  return stores.filter((store) => textMatchesMarketplaceSubcategory(getSearchableStoreText(store), subcategory)).length;
}

function getStoreStatus(storefrontStatus: string, isOpen: boolean) {
  if (storefrontStatus === "onboarding") {
    return "Onboarding";
  }

  return isOpen ? "Open now" : "Closed";
}

function getStoreStatusTone(storefrontStatus: string, isOpen: boolean) {
  if (storefrontStatus === "onboarding") {
    return "pending";
  }

  return isOpen ? "accepted" : "rejected";
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const resolvedParams = await params;
  const category = getMarketplaceCategory(resolvedParams.category);

  if (!category) {
    notFound();
  }

  const liveStores = (await fetchMarketplaceStores({ revalidateSeconds: 300 })) ?? [];
  const matchingStores = liveStores.filter((store) => storeMatchesMarketplaceCategory(store, category, getSearchableStoreText(store)));
  const visibleSubcategories = category.subcategories.slice(0, 4);
  const extraSubcategories = category.subcategories.slice(4);
  const categoryHeading = category.slug === "takeaways" ? "Takeaway categories" : `${category.label} categories`;

  return (
    <main className="shell customer-marketplace">
      <JsonLd
        data={buildCategoryPageJsonLd({
          categoryName: category.label,
          categoryDescription: category.description,
          path: `/categories/${category.slug}`,
          stores: matchingStores,
        })}
      />
      <header className="topbar">
        <div className="brand-pill">
          <Link href="/" className="icon-button">
            Back
          </Link>
          <AppSwitcher />
          <div>
            <p className="eyebrow">Food category</p>
            <p className="brand-title">{category.label}</p>
          </div>
        </div>

        <div className="topbar-actions">
          <Link href="/register" className="icon-button">
            Account
          </Link>
        </div>
      </header>

      <nav className="marketplace-category-rail" aria-label="Food categories">
        {marketplaceCategories.map((entry) => (
          <Link
            key={entry.slug}
            href={`/categories/${entry.slug}`}
            className={`marketplace-category-chip${entry.slug === category.slug ? " is-active" : ""}`}
          >
            <span className="marketplace-category-chip-image" style={{ backgroundImage: `url(${entry.imageUrl})` }} />
            <span>{entry.shortLabel}</span>
          </Link>
        ))}
      </nav>

      <section className="category-hero marketplace-scene">
        <div className="hero-slideshow" aria-hidden="true">
          {category.heroImages.map((imageUrl, index) => (
            <span
              key={imageUrl}
              className="hero-slide category-hero-slide"
              style={{
                backgroundImage: `url(${imageUrl})`,
                animationDelay: `${index * 6}s`,
              }}
            />
          ))}
        </div>
        <div className="category-hero-copy">
          <p className="hero-badge">Hull Eats {category.label}</p>
          <h1>{category.label}</h1>
          <p>{category.description}</p>
          <div className="marketplace-search category-search-display" aria-label={`${category.label} search`}>
            <input className="search-input" placeholder={category.searchPlaceholder} aria-label={category.searchPlaceholder} readOnly />
            <Link href="/" className="primary-button gold-button">
              Search businesses
            </Link>
          </div>
        </div>
      </section>

      <section className="marketplace-panel category-selector-panel">
        <div className="section-heading">
          <div>
            <h2>{categoryHeading}</h2>
          </div>
        </div>
        <div className="category-subcategory-grid">
          {visibleSubcategories.map((subcategory) => (
            <a
              key={subcategory.slug}
              id={subcategory.slug}
              href={`#${subcategory.slug}`}
              className="category-subcategory-card"
              style={{ backgroundImage: `url(${subcategory.imageUrl})` }}
            >
              <strong>{subcategory.label}</strong>
              <span>{getSubcategoryMatchCount(matchingStores, subcategory)} live matches</span>
            </a>
          ))}
          {extraSubcategories.length > 0 ? (
            <details className="category-more-details">
              <div className="category-extra-grid">
                {extraSubcategories.map((subcategory) => (
                  <a
                    key={subcategory.slug}
                    id={subcategory.slug}
                    href={`#${subcategory.slug}`}
                    className="category-subcategory-card"
                    style={{ backgroundImage: `url(${subcategory.imageUrl})` }}
                  >
                    <strong>{subcategory.label}</strong>
                    <span>
                      {getSubcategoryMatchCount(matchingStores, subcategory)} live matches
                    </span>
                  </a>
                ))}
              </div>
              <summary className="category-show-more-card">
                <span className="category-show-more-label">Show more</span>
                <span className="category-show-less-label">Show less</span>
              </summary>
            </details>
          ) : null}
        </div>
      </section>

      <section className="content-grid marketplace-scene">
        <div className="content-stack">
          <div className="section-heading">
            <div>
              <h2>{matchingStores.length > 0 ? `${category.label} near you` : `${category.label} coming soon`}</h2>
              <p>
                {matchingStores.length > 0
                  ? "Open a live store, choose your items, and checkout with clear pricing."
                  : "This category is ready for live businesses. New stores will appear here as they are added in the hub."}
              </p>
            </div>
          </div>

          <div className="store-grid">
            {matchingStores.map((store) => (
              <Link href={`/stores/${store.slug}`} className="store-card" key={store.id}>
                <div
                  className="store-card-media"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0) 42%, rgba(8, 14, 24, 0.28)), url(${store.heroImageUrl ?? category.imageUrl})`,
                  }}
                >
                  <div className="store-card-overlay">
                    <span className={`status-chip ${getStoreStatusTone(store.storefrontStatus, store.isOpen)}`}>
                      {getStoreStatus(store.storefrontStatus, store.isOpen)}
                    </span>
                  </div>
                </div>
                <div className="store-card-body">
                  <h3>{store.name}</h3>
                  <p className="store-meta">{store.cuisineLabel}</p>
                  <div className="store-tags">
                    <span className="store-tag">{store.etaMinutes} min</span>
                    <span className="store-tag">Min £{store.minimumOrderAmount?.toFixed(2)}</span>
                    <span className="store-tag">
                      Delivery from £{deliveryFeeFromForStorefront({ legacyDeliveryFee: store.deliveryFee, pricing: store.deliveryPricing }).toFixed(2)}
                    </span>
                  </div>
                  {store.onboardingMessage?.trim() ? <p className="store-copy">{store.onboardingMessage}</p> : null}
                  <div className="store-card-footer">
                    <span className="card-cta">View menu</span>
                    <span className="ghost-link">Clear checkout</span>
                  </div>
                </div>
              </Link>
            ))}

            {matchingStores.length === 0 ? (
              <article className="store-card empty-filter-card">
                <div
                  className="store-card-media"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0) 42%, rgba(8, 14, 24, 0.28)), url(${category.imageUrl})`,
                  }}
                />
                <div className="store-card-body">
                  <h3>{category.label} stores coming soon</h3>
                  <p className="store-copy">
                    This page is ready for real businesses, category images, menus, basket, checkout, and delivery
                    tracking as soon as a hub goes live.
                  </p>
                </div>
              </article>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
