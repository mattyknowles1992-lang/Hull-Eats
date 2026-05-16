import Link from "next/link";

import { deliveryFeeFromForStorefront } from "@hull-eats/types";

import { AppSwitcher } from "../../app-switcher";
import { featuredStores, storeMenus } from "../../../src/lib/demo";
import { fetchMarketplaceMenu, fetchMarketplaceStore } from "../../../src/lib/marketplace";
import { formatStoreAddress } from "../../../src/lib/store-address";
import { BasketButton } from "./basket-button";
import { StoreMenuClient } from "./store-menu-client";

const fallbackStore = featuredStores[0]!;
const fallbackMenu = storeMenus["loaded-munch-hull"]!;

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const demoStore = featuredStores.find((entry) => entry.slug === resolvedParams.slug) ?? fallbackStore;
  const liveStore = await fetchMarketplaceStore(resolvedParams.slug);
  const store = liveStore ?? demoStore;

  const liveMenu = await fetchMarketplaceMenu(resolvedParams.slug);
  const demoMenu = storeMenus[store.slug] ?? fallbackMenu;
  const menu = liveMenu
    ? {
        headline: liveMenu.onboardingMessage || demoMenu.headline,
        categories: liveMenu.categories,
        items: liveMenu.categories.flatMap((category) => category.items),
      }
    : demoMenu;
  const hasLiveMenu = menu.categories.length > 0 && menu.items.length > 0;
  const storeAddress = formatStoreAddress(store);

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
          <BasketButton store={store} />
          <button type="button" className="icon-button">
            Share
          </button>
        </div>
      </header>

      <section
        className="store-hero"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0) 42%, rgba(8, 14, 24, 0.28)), url(${store.heroImageUrl})`,
        }}
      >
        <div className="store-hero-content">
          <h1>{store.name}</h1>
          <p>{menu.headline}</p>
          <div className="hero-meta">
            <span className="meta-pill">{store.cuisineLabel}</span>
            <span className="meta-pill">{store.etaMinutes} min delivery</span>
            <span className="meta-pill">
              Delivery from £{deliveryFeeFromForStorefront({ legacyDeliveryFee: store.deliveryFee, pricing: store.deliveryPricing }).toFixed(2)}
            </span>
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
                storePostcode={store.postcode}
                storeAddress={storeAddress}
                storeDeliveryFee={store.deliveryFee}
                storeDeliveryPricing={store.deliveryPricing}
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
              <span className="muted-copy">Address</span>
              <strong>{storeAddress || store.postcode}</strong>
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
