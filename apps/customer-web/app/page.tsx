import Link from "next/link";

import { featuredStores, trackedOrder } from "../src/lib/demo";

const filters = ["All", "Loaded fries", "Smash burgers", "Chicken", "Desserts", "Shops"];
const quickPicks = [
  { title: "Loaded fries", detail: "Hot trays, molten cheese, crispy toppings" },
  { title: "Smash burgers", detail: "Pressed patties, toasted buns, proper sauce" },
  { title: "Chicken", detail: "Buttermilk burgers, strips, wings, dips" },
  { title: "Sweet finish", detail: "Cookie dough, shakes, waffles, refreshers" },
];
const appetiteSignals = ["Live Hull menus", "Real-time order tracking", "Local courier delivery", "Hull Eats+ perks"];

function getStoreStatus(storefrontStatus: string, isOpen: boolean) {
  if (storefrontStatus === "onboarding") {
    return "Onboarding";
  }

  return isOpen ? "Live now" : "Opening soon";
}

export default function CustomerHomePage() {
  return (
    <main className="shell customer-marketplace">
      <header className="topbar">
        <div className="brand-pill">
          <img src="/brand/hull-eats-logo.png" alt="Hull Eats" className="brand-logo" />
          <div>
            <p className="eyebrow">Hull Eats</p>
            <p className="brand-title">Anything you want. Delivered.</p>
          </div>
        </div>

        <div className="topbar-actions">
          <Link href="/about" className="glass-button">
            For businesses
          </Link>
          <Link href="/register" className="glass-button">
            Hull Eats+
          </Link>
          <Link href="/register" className="icon-button">
            Account
          </Link>
        </div>
      </header>

      <section className="marketplace-hero marketplace-scene">
        <div className="hero-slideshow hero-slideshow-landscape" aria-hidden="true">
          <span className="hero-slide hero-slide-one" />
          <span className="hero-slide hero-slide-two" />
          <span className="hero-slide hero-slide-three" />
        </div>
        <div className="hero-slideshow hero-slideshow-portrait" aria-hidden="true">
          <span className="hero-slide hero-slide-portrait-one" />
          <span className="hero-slide hero-slide-portrait-two" />
        </div>
        <div className="marketplace-hero-copy">
          <p className="hero-badge">Hull's food marketplace</p>
          <h1>From local kitchens to your door.</h1>
          <p>
            Open the door to loaded fries, smash burgers, late-night trays, sweet fixes, and local favourites moving
            from kitchen to doorstep on Hull Eats.
          </p>

          <div className="marketplace-search">
            <input className="search-input" aria-label="Search businesses" placeholder="Search loaded fries, burgers, chicken, desserts..." />
            <Link href="/stores/loaded-munch-hull" className="primary-button">
              Order now
            </Link>
          </div>

          <div className="appetite-signal-row" aria-label="Marketplace highlights">
            {appetiteSignals.map((signal) => (
              <span key={signal}>{signal}</span>
            ))}
          </div>
        </div>

        <Link href="/stores/loaded-munch-hull" className="hero-food-stage" aria-label="Open Loaded Munch menu">
          <div className="hero-food-card">
            <span className="status-chip pending">Live now</span>
            <strong>Loaded Munch</strong>
            <p>Loaded fries, burgers, wraps, chicken, desserts, and drinks ready to order.</p>
            <div className="hero-food-meta">
              <span>25 min</span>
              <span>£2.50 delivery</span>
              <span>£10 min</span>
            </div>
          </div>
        </Link>
      </section>

      <section className="craving-strip marketplace-scene compact-scene" aria-label="Quick food choices">
        {quickPicks.map((pick) => (
          <Link key={pick.title} href="/stores/loaded-munch-hull" className="craving-card">
            <strong>{pick.title}</strong>
            <span>{pick.detail}</span>
          </Link>
        ))}
      </section>

      <section className="search-panel marketplace-panel marketplace-scene">
        <div className="search-heading">
          <div>
            <p className="eyebrow">Tonight in Hull</p>
            <h2 className="search-title">Pick the food that makes the night make sense.</h2>
            <p className="search-copy">
              Browse local menus, track the order as it moves, and keep your favourites close for the next craving.
            </p>
          </div>
          <div className="search-highlight-card live-menu-card">
            <span className="search-highlight-label">Featured kitchen</span>
            <strong>Loaded Munch</strong>
            <p>Hot, indulgent, built for sharing, and already wired into the Hull Eats checkout.</p>
            <Link href="/stores/loaded-munch-hull" className="primary-button" style={{ width: "100%" }}>
              View the menu
            </Link>
          </div>
        </div>

        <div className="search-meta-row">
          <div className="delivery-pill">Delivering to Hull city centre</div>
          <div className="delivery-pill is-highlighted">Free delivery with Hull Eats+ from £9.99/month</div>
        </div>

        <div className="filter-row" aria-label="Marketplace filters">
          {filters.map((filter, index) => (
            <span key={filter} className={`filter-pill${index === 0 ? " is-active" : ""}`}>
              {filter}
            </span>
          ))}
        </div>
      </section>

      <section className="content-grid marketplace-scene">
        <div className="content-stack">
          <div className="section-heading">
            <div>
              <h2>Order from Hull's local food scene</h2>
              <p>Bold menus, clear delivery details, and checkout that gets out of the way.</p>
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
                    <span className="store-tag">Min £{store.minimumOrderAmount?.toFixed(2)}</span>
                    <span className="store-tag">Delivery £{store.deliveryFee?.toFixed(2)}</span>
                  </div>

                  <p className="store-copy">{store.onboardingMessage}</p>

                  <div className="store-card-footer">
                    <span className="card-cta">{store.menuSetupComplete ? "Start order" : "Preview menu"}</span>
                    <span className="ghost-link">Track after checkout</span>
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
                <p>For the people who know one order is rarely the last order.</p>
              </div>
            </div>

            <div className="membership-card">
              <div className="membership-price">£9.99/mo</div>
              <p>Free delivery on eligible orders, launch perks, and quick access to your usual favourites.</p>
              <Link href="/register" className="primary-button" style={{ width: "100%" }}>
                Join membership
              </Link>
            </div>
          </section>

          <section className="feature-panel feature-panel-contrast">
            <div className="section-heading compact">
              <div>
                <h2>Popular right now</h2>
                <p>What customers can jump into first as the marketplace fills out.</p>
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
              <span className="muted-copy">Fastest route</span>
              <strong>Open menu, customise, checkout</strong>
            </div>
            <div className="glance-row">
              <span className="muted-copy">Order tracking</span>
              <span className="status-chip assigned">{trackedOrder.status.replaceAll("_", " ")}</span>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}


