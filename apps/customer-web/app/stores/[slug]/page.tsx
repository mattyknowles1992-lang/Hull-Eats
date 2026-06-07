import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deliveryFeeFromForStorefront, formatClosesInLabel, storefrontHeroMediaStyle } from "@hull-eats/types";

import { JsonLd } from "../../../src/components/json-ld";
import { AppSwitcher } from "../../app-switcher";
import { fetchMarketplaceMenu, fetchMarketplaceStore } from "../../../src/lib/marketplace";
import { buildStoreMetadata } from "../../../src/lib/seo";
import { buildStorePageJsonLd } from "../../../src/lib/seo-json-ld";
import { formatStoreAddress } from "../../../src/lib/store-address";
import { BasketButton } from "./basket-button";
import { StoreMenuClient } from "./store-menu-client";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await fetchMarketplaceStore(slug, { revalidateSeconds: 600 });

  if (!store) {
    return {};
  }

  const menu = await fetchMarketplaceMenu(slug, { revalidateSeconds: 600 });
  const menuItemCount = menu?.categories.flatMap((category) => category.items).length ?? 0;

  return buildStoreMetadata(store, menuItemCount);
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const liveStore = await fetchMarketplaceStore(resolvedParams.slug, { revalidateSeconds: 300 });
  const store = liveStore;
  if (!store) {
    notFound();
  }

  const liveMenu = await fetchMarketplaceMenu(resolvedParams.slug);
  const activePromotions = liveMenu?.activePromotions ?? [];
  const menu = {
    headline: liveMenu?.onboardingMessage || store.onboardingMessage || "",
    categories: liveMenu?.categories ?? [],
    items: liveMenu?.categories.flatMap((category) => category.items) ?? [],
  };
  const hasLiveMenu = menu.categories.length > 0 && menu.items.length > 0;
  const storeAddress = formatStoreAddress(store);
  const storeAcceptsOrders = store.isOpen;
  const closesInLabel = storeAcceptsOrders ? formatClosesInLabel(store.closesInMinutes) : null;

  return (
    <main className="shell">
      <JsonLd data={buildStorePageJsonLd(store, menu.categories, menu.items)} />
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
        style={storefrontHeroMediaStyle(store.heroImageUrl, store.heroImageCrop)}
      >
        <div className="store-hero-content">
          <h1>{store.name}</h1>
          <p>{menu.headline}</p>
          <div className="hero-meta">
            <span className="meta-pill">{store.cuisineLabel}</span>
            <span className="meta-pill">{store.etaMinutes} min delivery</span>
            {closesInLabel ? <span className="meta-pill">{closesInLabel}</span> : null}
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
                <p>{hasLiveMenu ? "Live categories and prices from this business hub." : "This storefront is live, but no menu items have been published yet."}</p>
              </div>
            </div>

            {!storeAcceptsOrders ? (
              <article className="store-closed-banner" role="status">
                <h3>Closed right now</h3>
                <p>This business is outside its opening hours. You can browse the menu, but ordering is paused until they open.</p>
              </article>
            ) : null}

            {hasLiveMenu ? (
              <StoreMenuClient
                storeId={store.id}
                storeSlug={store.slug}
                storeName={store.name}
                storePostcode={store.postcode}
                storeAddress={storeAddress}
                storeDeliveryFee={store.deliveryFee}
                storeMinimumOrderAmount={store.minimumOrderAmount}
                storeDeliveryPricing={store.deliveryPricing}
                storeAcceptsOrders={storeAcceptsOrders}
                storeClosesInMinutes={store.closesInMinutes}
                categories={menu.categories}
                activePromotions={activePromotions}
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
