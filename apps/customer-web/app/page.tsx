import Link from "next/link";

import { featuredStores, trackedOrder } from "../src/lib/demo";

const filters = ["All", "Restaurants", "Takeaways", "Deli & Cafe", "Shops", "Opening soon"];
const quickPicks = [
  { title: "Burgers", detail: "Smash stacks and loaded trays" },
  { title: "Chicken", detail: "Buttermilk burgers and strips" },
  { title: "Desserts", detail: "Cookie dough, shakes, refreshers" },
  { title: "Shops", detail: "Groceries and convenience" },
];

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
          <Link href="/register" className="glass-button">
            Hull Eats+
          </Link>
          <Link href="/register" className="icon-button">
            Account
          </Link>
        </div>
      </header>

      <section className="search-panel">
        <div className="search-heading">
          <div>
            <p className="eyebrow">Start your order</p>
            <h1 className="search-title">Search for a business or pick what you feel like eating.</h1>
            <p className="search-copy">
              The fastest path to conversion should be obvious: search, tap a food type, then open a live menu.
            </p>
          </div>
          <div className="search-highlight-card">
            <span className="search-highlight-label">Featured live now</span>
            <strong>Loaded Munch</strong>
            <p>Seeded menu, real pricing, and the first checkout flow on Hull Eats.</p>
            <Link href="/stores/loaded-munch-hull" className="primary-button" style={{ width: "100%" }}>
              Open Loaded Munch
            </Link>
          </div>
        </div>

        <div className="search-row">
          <input className="search-input" aria-label="Search businesses" defaultValue="Search takeaways, cafes, shops..." />
          <button type="button" className="primary-button">
            Explore Hull
          </button>
        </div>

        <div className="quick-pick-grid" aria-label="Quick food choices">
          {quickPicks.map((pick) => (
            <button key={pick.title} type="button" className="quick-pick-card">
              <strong>{pick.title}</strong>
              <span>{pick.detail}</span>
            </button>
          ))}
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
              <p>Open a live menu fast, compare delivery details quickly, and move straight into checkout.</p>
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
                    <span className="card-cta">{store.menuSetupComplete ? "Order now" : "Preview storefront"}</span>
                    <span className="ghost-link">Save business</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <aside className="sidebar-stack">
          <section className="feature-panel feature-panel-dark">
            <div className="section-heading compact">
              <div>
                <h2>Hull Eats+</h2>
                <p>Monthly free-delivery pass handled by Stripe subscription billing.</p>
              </div>
            </div>

            <div className="membership-card">
              <div className="membership-price">GBP 9.99/mo</div>
              <p>Unlimited free delivery on eligible orders, account perks, and priority launch access for new stores.</p>
              <Link href="/register" className="primary-button" style={{ width: "100%" }}>
                Join membership
              </Link>
            </div>
          </section>

          <section className="feature-panel feature-panel-contrast">
            <div className="section-heading compact">
              <div>
                <h2>Popular right now</h2>
                <p>Fast routes into the parts of the marketplace most likely to convert.</p>
              </div>
            </div>

            <div className="glance-row">
              <span className="muted-copy">Featured live menu</span>
              <strong>Loaded Munch</strong>
            </div>
            <div className="glance-row">
              <span className="muted-copy">Best for</span>
              <strong>Burgers and loaded fries</strong>
            </div>
            <div className="glance-row">
              <span className="muted-copy">Fastest action</span>
              <strong>Search or tap a quick pick</strong>
            </div>
            <div className="glance-row">
              <span className="muted-copy">Current order status demo</span>
              <span className="status-chip assigned">{trackedOrder.status.replaceAll("_", " ")}</span>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
