import Link from "next/link";

import { AppSwitcher } from "../../app-switcher";
import { featuredStores, storeMenus } from "../../../src/lib/demo";
import { BasketButton } from "./basket-button";
import { StoreMenuClient } from "./store-menu-client";

const fallbackStore = featuredStores[0]!;
const fallbackMenu = storeMenus["loaded-munch-hull"]!;

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const store = featuredStores.find((entry) => entry.slug === resolvedParams.slug) ?? fallbackStore;
  const menu = storeMenus[store.slug] ?? fallbackMenu;
  const hasLiveMenu = menu.items.length > 0;

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand-pill">
          <Link href="/" className="icon-button">
            Back
          </Link>
          <AppSwitcher />
          <div>
            <p className="eyebrow">Store preview</p>
            <p className="brand-title">{store.name}</p>
          </div>
        </div>

        <div className="topbar-actions">
          <BasketButton storeSlug={store.slug} />
          <button type="button" className="icon-button">
            Share
          </button>
        </div>
      </header>

      <section
        className="store-hero"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(5, 12, 28, 0.1), rgba(5, 12, 28, 0.82)), url(${store.heroImageUrl})`,
        }}
      >
        <div className="store-hero-content">
          <h1>{store.name}</h1>
          <p>{menu.headline}</p>
          <div className="hero-meta">
            <span className="meta-pill">{store.cuisineLabel}</span>
            <span className="meta-pill">{store.etaMinutes} min delivery</span>
            <span className="meta-pill">Delivery £{store.deliveryFee?.toFixed(2)}</span>
          </div>
        </div>

      </section>

      <section className="detail-grid">
        <div className="content-stack">
          <section className="feature-panel feature-panel-menu">
            <div className="section-heading">
              <div>
                <h2>{hasLiveMenu ? "Menu" : "Catalog placeholder"}</h2>
                <p>{hasLiveMenu ? "Seeded categories and prices for the launch takeaway hub." : "For now this page sells the brand and the store, not the products."}</p>
              </div>
            </div>

            {hasLiveMenu ? (
              <StoreMenuClient
                storeId={store.id}
                storeSlug={store.slug}
                storeName={store.name}
                categories={menu.categories}
              />
            ) : (
              <article className="empty-catalog-card">
                <div className="empty-catalog-icon">HE</div>
                <div>
                  <h3>No items added yet</h3>
                  <p>
                    Once the business finishes setup in the back office, this page can instantly switch into full browse,
                    basket, checkout, and order tracking mode without redesigning the storefront.
                  </p>
                </div>
              </article>
            )}
          </section>
        </div>

        <aside className="sidebar-stack">
          <section className="feature-panel">
            <div className="section-heading compact">
              <div>
                <h2>Store details</h2>
                <p>Useful context even before products go live.</p>
              </div>
            </div>

            <div className="glance-row">
              <span className="muted-copy">Type</span>
              <strong>{store.type}</strong>
            </div>
            <div className="glance-row">
              <span className="muted-copy">Area</span>
              <strong>{store.city}</strong>
            </div>
            <div className="glance-row">
              <span className="muted-copy">Postcode</span>
              <strong>{store.postcode}</strong>
            </div>
            <div className="glance-row">
              <span className="muted-copy">Minimum order</span>
              <strong>£{store.minimumOrderAmount?.toFixed(2)}</strong>
            </div>
            {store.logoImageUrl ? (
              <div className="store-logo-panel">
                <img src={store.logoImageUrl} alt={`${store.name} logo`} className="store-logo-preview" />
              </div>
            ) : null}
          </section>
        </aside>
      </section>
    </main>
  );
}
