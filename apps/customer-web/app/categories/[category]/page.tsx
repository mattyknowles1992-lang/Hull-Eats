import Link from "next/link";
import { notFound } from "next/navigation";

import { featuredStores, storeMenus } from "../../../src/lib/demo";
import {
  getMarketplaceCategory,
  marketplaceCategories,
  type MarketplaceSubcategory,
  storeMatchesMarketplaceCategory,
  textMatchesMarketplaceSubcategory,
} from "../../../src/lib/marketplace-categories";

export function generateStaticParams() {
  return marketplaceCategories.map((category) => ({ category: category.slug }));
}

function getSearchableStoreText(storeSlug: string) {
  const store = featuredStores.find((entry) => entry.slug === storeSlug);
  const menu = storeMenus[storeSlug];

  return [
    store?.name,
    store?.type,
    store?.city,
    store?.cuisineLabel,
    store?.onboardingMessage,
    menu?.headline,
    ...(menu?.categories.map((category) => `${category.name} ${category.description ?? ""}`) ?? []),
    ...(menu?.items.map((item) => `${item.name} ${item.description ?? ""}`) ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getSubcategoryMatchCount(categorySlug: string, subcategory: MarketplaceSubcategory) {
  const menu = storeMenus[categorySlug];

  if (!menu) {
    return 0;
  }

  return menu.items.filter((item) => textMatchesMarketplaceSubcategory(`${item.name} ${item.description}`.toLowerCase(), subcategory)).length;
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const resolvedParams = await params;
  const category = getMarketplaceCategory(resolvedParams.category);

  if (!category) {
    notFound();
  }

  const matchingStores = featuredStores.filter((store) =>
    storeMatchesMarketplaceCategory(store, category, getSearchableStoreText(store.slug)),
  );

  return (
    <main className="shell customer-marketplace">
      <header className="topbar">
        <div className="brand-pill">
          <Link href="/" className="icon-button">
            Back
          </Link>
          <img src="/brand/hull-eats-logo.jpeg" alt="Hull Eats" className="brand-logo brand-logo-small" />
          <div>
            <p className="eyebrow">Marketplace category</p>
            <p className="brand-title">{category.label}</p>
          </div>
        </div>

        <div className="topbar-actions">
          <Link href="/register" className="icon-button">
            Account
          </Link>
        </div>
      </header>

      <nav className="marketplace-category-rail" aria-label="Marketplace categories">
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
              Search marketplace
            </Link>
          </div>
        </div>

        <div className="category-carousel" aria-label={`${category.label} category carousel`}>
          {category.subcategories.map((subcategory) => (
            <Link
              key={subcategory.slug}
              href={`#${subcategory.slug}`}
              className="category-carousel-card"
              style={{ backgroundImage: `url(${subcategory.imageUrl})` }}
            >
              {subcategory.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="marketplace-panel category-selector-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Select what you want</p>
            <h2>{category.label} categories</h2>
            <p>These are the shopfront lanes this page will use as more Hull businesses join.</p>
          </div>
        </div>
        <div className="category-subcategory-grid">
          {category.subcategories.map((subcategory) => (
            <a
              key={subcategory.slug}
              id={subcategory.slug}
              href={`#${subcategory.slug}`}
              className="category-subcategory-card"
              style={{ backgroundImage: `url(${subcategory.imageUrl})` }}
            >
              <strong>{subcategory.label}</strong>
              <span>{matchingStores.reduce((sum, store) => sum + getSubcategoryMatchCount(store.slug, subcategory), 0)} live matches</span>
            </a>
          ))}
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
                    backgroundImage: `linear-gradient(180deg, rgba(3, 9, 22, 0.04), rgba(3, 9, 22, 0.88)), url(${store.heroImageUrl ?? category.imageUrl})`,
                  }}
                >
                  <div className="store-card-overlay">
                    <span className="status-chip pending">{store.isOpen ? "Open" : "Opening soon"}</span>
                    <span className="glass-tag">{store.type}</span>
                  </div>
                </div>
                <div className="store-card-body">
                  <h3>{store.name}</h3>
                  <p className="store-meta">
                    {store.cuisineLabel} / {store.city}
                  </p>
                  <div className="store-tags">
                    <span className="store-tag">{store.etaMinutes} min</span>
                    <span className="store-tag">Min £{store.minimumOrderAmount?.toFixed(2)}</span>
                    <span className="store-tag">Delivery £{store.deliveryFee?.toFixed(2)}</span>
                  </div>
                  <p className="store-copy">{store.onboardingMessage}</p>
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
                    backgroundImage: `linear-gradient(180deg, rgba(3, 9, 22, 0.04), rgba(3, 9, 22, 0.78)), url(${category.imageUrl})`,
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
