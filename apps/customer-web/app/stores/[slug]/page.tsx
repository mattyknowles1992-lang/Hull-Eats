import Link from "next/link";

import { featuredStores, storeMenus } from "../../../src/lib/demo";

const fallbackStore = featuredStores[0]!;
const fallbackMenu = storeMenus["harbour-kitchen-hull"]!;

function getStoreStatus(storefrontStatus: string, isOpen: boolean) {
  if (storefrontStatus === "onboarding") {
    return "Onboarding";
  }

  return isOpen ? "Live now" : "Opening soon";
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const store = featuredStores.find((entry) => entry.slug === resolvedParams.slug) ?? fallbackStore;
  const menu = storeMenus[store.slug] ?? fallbackMenu;

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand-pill">
          <Link href="/" className="icon-button">
            Back
          </Link>
          <img src="/brand/hull-eats-logo.png" alt="Hull Eats" className="brand-logo brand-logo-small" />
          <div>
            <p className="eyebrow">Store preview</p>
            <p className="brand-title">{store.name}</p>
          </div>
        </div>

        <div className="topbar-actions">
          <button type="button" className="glass-button">
            Save store
          </button>
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
          <div className="hero-badge">{getStoreStatus(store.storefrontStatus, store.isOpen)}</div>
          <h1>{store.name}</h1>
          <p>{menu.headline}</p>
          <div className="hero-meta">
            <span className="meta-pill">{store.cuisineLabel}</span>
            <span className="meta-pill">{store.etaMinutes} min delivery</span>
            <span className="meta-pill">Delivery GBP {store.deliveryFee?.toFixed(2)}</span>
          </div>
        </div>

        <aside className="hero-sidecard compact">
          <p className="eyebrow">Marketplace state</p>
          <h2>Storefront is live</h2>
          <p>Customers can discover this business now while the owner adds categories, prices, stock, and images later.</p>
          <div className="hero-sidecard-grid">
            <div className="stat-card">
              <span>Items</span>
              <strong>0</strong>
            </div>
            <div className="stat-card">
              <span>Visibility</span>
              <strong>High</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="detail-grid">
        <div className="content-stack">
          <section className="feature-panel">
            <div className="section-heading">
              <div>
                <h2>Business onboarding status</h2>
                <p>This empty-state flow should still feel polished and trustworthy to customers.</p>
              </div>
            </div>

            <div className="store-tags">
              <span className="store-tag">Storefront {store.storefrontStatus}</span>
              <span className="store-tag">{store.isOpen ? "Visible to customers" : "Opening soon"}</span>
              <span className="store-tag">Menu not entered yet</span>
            </div>

            <p className="store-copy">{store.onboardingMessage}</p>

            <div className="button-row">
              <button type="button" className="primary-button">
                Notify me when ordering opens
              </button>
              <button type="button" className="glass-button">
                Follow this business
              </button>
            </div>
          </section>

          <section className="feature-panel">
            <div className="section-heading">
              <div>
                <h2>Catalog placeholder</h2>
                <p>For now this page sells the brand and the store, not the products.</p>
              </div>
            </div>

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
          </section>
        </div>

        <aside className="sidebar-stack">
          <section className="feature-panel">
            <div className="section-heading compact">
              <div>
                <h2>Order readiness</h2>
                <p>The customer flow is ready to connect when the first items arrive.</p>
              </div>
            </div>

            <div className="readiness-list">
              <div className="readiness-item">
                <span className="readiness-dot is-ready" />
                <div>
                  <strong>Customer account</strong>
                  <p>Supabase auth, profile, and saved addresses.</p>
                </div>
              </div>
              <div className="readiness-item">
                <span className="readiness-dot is-ready" />
                <div>
                  <strong>Subscription upsell</strong>
                  <p>Monthly free-delivery plan through Stripe.</p>
                </div>
              </div>
              <div className="readiness-item">
                <span className="readiness-dot is-pending" />
                <div>
                  <strong>Menu entry</strong>
                  <p>Waiting for business owner to add categories and stock.</p>
                </div>
              </div>
            </div>
          </section>

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
              <strong>GBP {store.minimumOrderAmount?.toFixed(2)}</strong>
            </div>
          </section>
        </aside>
      </section>

      <nav className="mobile-dock" aria-label="Primary">
        <span className="nav-icon">Home</span>
        <span className="nav-icon is-active">Browse</span>
        <span className="nav-icon">Orders</span>
        <span className="nav-icon">Account</span>
      </nav>
    </main>
  );
}
