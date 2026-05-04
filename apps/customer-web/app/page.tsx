import Link from "next/link";

import { featuredStores, trackedOrder } from "../src/lib/demo";

const filters = ["All", "Restaurants", "Takeaways", "Groceries", "Desserts", "Late night"];
const quickPicks = [
  { title: "Dinner now", detail: "Restaurants, takeaways, and local kitchens ready to cook" },
  { title: "Quick essentials", detail: "Corner-shop staples, snacks, drinks, and convenience runs" },
  { title: "Late-night cravings", detail: "Hot food, sweet fixes, and comfort orders after dark" },
  { title: "Family favourites", detail: "Pizza, burgers, curries, chicken, noodles, wraps, and more" },
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
            Discover Hull's independent restaurants, takeaways, dessert spots, corner shops, and everyday favourites,
            all moving from local counters to your doorstep.
          </p>

          <div className="marketplace-search">
            <input className="search-input" aria-label="Search businesses" placeholder="Search restaurants, takeaways, shops, desserts..." />
            <Link href="/stores/loaded-munch-hull" className="primary-button">
              Browse live menus
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
            <span className="status-chip pending">Featured launch kitchen</span>
            <strong>Loaded Munch</strong>
            <p>One of the first live menus on Hull Eats, with more local kitchens and shops joining the marketplace.</p>
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
            <p>A live example of how every local business can show its menu, options, delivery, and checkout.</p>
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
              <p>Food, drinks, essentials, sweet treats, and local favourites with clear delivery details.</p>
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
                <p>What customers can jump into while new local businesses come online.</p>
              </div>
            </div>

            <div className="glance-row">
              <span className="muted-copy">Live example</span>
              <strong>Loaded Munch</strong>
            </div>
            <div className="glance-row">
              <span className="muted-copy">Marketplace mix</span>
              <strong>Food, shops, desserts</strong>
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


