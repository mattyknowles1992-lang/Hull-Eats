import Link from "next/link";

import { featuredStores, trackedOrder } from "../src/lib/demo";

const filters = ["All", "Restaurants", "Takeaways", "Deli & Cafe", "Shops", "Opening soon"];

function getStoreStatus(storefrontStatus: string, isOpen: boolean) {
  if (storefrontStatus === "onboarding") {
    return "Onboarding";
  }

  return isOpen ? "Live now" : "Opening soon";
}

export default function CustomerHomePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand-pill">
          <img src="/brand/hull-eats-logo.png" alt="Hull Eats" className="brand-logo" />
          <div>
            <p className="eyebrow">Hull Eats</p>
            <p className="brand-title">Anything you want. Delivered.</p>
          </div>
        </div>

        <div className="topbar-actions">
          <button type="button" className="glass-button">
            Hull Eats+
          </button>
          <button type="button" className="icon-button">
            Account
          </button>
        </div>
      </header>

      <section className="search-panel">
        <div className="search-row">
          <input className="search-input" aria-label="Search businesses" defaultValue="Search takeaways, cafes, shops..." />
          <button type="button" className="primary-button">
            Explore Hull
          </button>
        </div>

        <div className="search-meta-row">
          <div className="delivery-pill">Delivering to Hull city centre</div>
          <div className="delivery-pill is-highlighted">Free delivery with Hull Eats+ from GBP 9.99/month</div>
        </div>

        <div className="filter-row" aria-label="Marketplace filters">
          {filters.map((filter, index) => (
            <span key={filter} className={`filter-pill${index === 0 ? " is-active" : ""}`}>
              {filter}
            </span>
          ))}
        </div>
      </section>

      <section className="content-grid">
        <div className="content-stack">
          <div className="section-heading">
            <div>
              <h2>Businesses on Hull Eats</h2>
              <p>Every storefront looks launch-ready even before the merchant enters a single item.</p>
            </div>
          </div>

          <div className="store-grid">
            {featuredStores.map((store) => (
              <Link href={`/stores/${store.slug}`} className="store-card" key={store.id}>
                <div
                  className="store-card-media"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(3, 9, 22, 0.04), rgba(3, 9, 22, 0.88)), url(${store.heroImageUrl})`,
                  }}
                >
                  <div className="store-card-overlay">
                    <span className="status-chip pending">{getStoreStatus(store.storefrontStatus, store.isOpen)}</span>
                    <span className="glass-tag">{store.type}</span>
                  </div>
                </div>

                <div className="store-card-body">
                  <div className="store-card-top">
                    <div>
                      <h3>{store.name}</h3>
                      <p className="store-meta">
                        {store.cuisineLabel} / {store.city}
                      </p>
                    </div>
                  </div>

                  <div className="store-tags">
                    <span className="store-tag">{store.etaMinutes} min</span>
                    <span className="store-tag">Min GBP {store.minimumOrderAmount?.toFixed(2)}</span>
                    <span className="store-tag">Delivery GBP {store.deliveryFee?.toFixed(2)}</span>
                  </div>

                  <p className="store-copy">{store.onboardingMessage}</p>

                  <div className="store-card-footer">
                    <span className="ghost-link">Preview storefront</span>
                    <span className="ghost-link">Save business</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <aside className="sidebar-stack">
          <section className="feature-panel">
            <div className="section-heading compact">
              <div>
                <h2>Hull Eats+</h2>
                <p>Monthly free-delivery pass handled by Stripe subscription billing.</p>
              </div>
            </div>

            <div className="membership-card">
              <div className="membership-price">GBP 9.99/mo</div>
              <p>Unlimited free delivery on eligible orders, account perks, and priority launch access for new stores.</p>
              <button type="button" className="primary-button" style={{ width: "100%" }}>
                Join membership
              </button>
            </div>
          </section>

          <section className="feature-panel">
            <div className="section-heading compact">
              <div>
                <h2>Account snapshot</h2>
              </div>
            </div>

            <div className="glance-row">
              <span className="muted-copy">Latest order</span>
              <strong>{trackedOrder.orderNumber}</strong>
            </div>
            <div className="glance-row">
              <span className="muted-copy">Status</span>
              <span className="status-chip assigned">{trackedOrder.status.replaceAll("_", " ")}</span>
            </div>
            <div className="glance-row">
              <span className="muted-copy">Channel</span>
              <strong>{trackedOrder.source.replaceAll("_", " ")}</strong>
            </div>
            <div className="glance-row">
              <span className="muted-copy">Total</span>
              <strong>
                {trackedOrder.currency} {trackedOrder.totalAmount.toFixed(2)}
              </strong>
            </div>
          </section>
        </aside>
      </section>

      <nav className="mobile-dock" aria-label="Primary">
        <span className="nav-icon is-active">Home</span>
        <span className="nav-icon">Browse</span>
        <span className="nav-icon">Orders</span>
        <span className="nav-icon">Account</span>
      </nav>
    </main>
  );
}
