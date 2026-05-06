"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { featuredStores, storeMenus } from "../src/lib/demo";

const filters = ["All", "Restaurants", "Takeaways", "Groceries", "Desserts", "Late night"] as const;
type FilterLabel = (typeof filters)[number];
type QuickPick = {
  title: string;
  detail: string;
  filter: FilterLabel;
  query: string;
};

const quickPicks: QuickPick[] = [
  {
    title: "Dinner now",
    detail: "Restaurants, takeaways, and local kitchens ready to cook",
    filter: "All",
    query: "restaurant takeaway kitchen",
  },
  {
    title: "Quick essentials",
    detail: "Corner-shop staples, snacks, drinks, and convenience runs",
    filter: "Groceries",
    query: "shop grocery essentials snacks drinks convenience",
  },
  {
    title: "Late-night cravings",
    detail: "Hot food, sweet fixes, and comfort orders after dark",
    filter: "Late night",
    query: "late night dessert sweet hot food chicken burger fries",
  },
  {
    title: "Family favourites",
    detail: "Pizza, burgers, curries, chicken, noodles, wraps, and more",
    filter: "All",
    query: "pizza burgers curries chicken noodles wraps family",
  },
];

function getStoreStatus(storefrontStatus: string, isOpen: boolean) {
  if (storefrontStatus === "onboarding") {
    return "Onboarding";
  }

  return isOpen ? "Live now" : "Opening soon";
}

export default function CustomerHomePage() {
  const [activeFilter, setActiveFilter] = useState<FilterLabel>("All");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const resultsRef = useRef<HTMLElement | null>(null);

  function focusResults() {
    window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function handleSearch() {
    setSearchQuery(searchInput.trim());
    focusResults();
  }

  function handleQuickPick(pick: QuickPick) {
    setActiveFilter(pick.filter);
    setSearchInput(pick.query);
    setSearchQuery(pick.query);
    focusResults();
  }

  const visibleStores = useMemo(() => {
    const queryWords = searchQuery
      .toLowerCase()
      .split(/\s+/)
      .map((word) => word.trim())
      .filter(Boolean);

    return featuredStores.filter((store) => {
      const categoryMatch = (() => {
        if (activeFilter === "All" || activeFilter === "Late night") {
          return true;
        }

        if (activeFilter === "Restaurants") {
          return store.type === "restaurant";
        }

        if (activeFilter === "Takeaways") {
          return store.type === "takeaway";
        }

        if (activeFilter === "Groceries") {
          return store.type === "shop";
        }

        if (activeFilter === "Desserts") {
          return (store.cuisineLabel ?? "").toLowerCase().includes("dessert");
        }

        return true;
      })();

      if (!categoryMatch) {
        return false;
      }

      if (queryWords.length === 0) {
        return true;
      }

      const menu = storeMenus[store.slug];
      const searchableText = [
        store.name,
        store.type,
        store.city,
        store.cuisineLabel,
        store.onboardingMessage,
        menu?.headline,
        ...(menu?.categories.map((category) => `${category.name} ${category.description ?? ""}`) ?? []),
        ...(menu?.items.map((item) => `${item.name} ${item.description ?? ""}`) ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return queryWords.some((word) => searchableText.includes(word));
    });
  }, [activeFilter, searchQuery]);

  return (
    <main className="shell customer-marketplace">
      <header className="topbar">
        <div className="brand-pill brand-pill-logo-only">
          <img src="/brand/hull-eats-logo.jpeg" alt="Hull Eats" className="brand-logo" />
        </div>

        <div className="topbar-actions">
          <details className="membership-popover">
            <summary className="glass-button membership-nav-button">
              <span>Coming soon</span>
              <strong>Hull Eats+</strong>
            </summary>
            <div className="membership-popover-card">
              <span className="search-highlight-label">Coming soon</span>
              <strong>Hull Eats+</strong>
              <p>
                A £9.99/month delivery subscription for regular customers. Members will get free delivery on orders
                across eligible Hull Eats stores, plus early launch perks and faster access to favourite kitchens.
              </p>
              <div className="membership-benefit-list">
                <span>Free delivery on eligible orders</span>
                <span>One simple monthly price</span>
                <span>Built for frequent local ordering</span>
              </div>
            </div>
          </details>
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
            <input
              className="search-input"
              aria-label="Search businesses"
              placeholder="Search restaurants, takeaways, shops, desserts..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
            />
            <button type="button" className="primary-button gold-button" onClick={handleSearch}>
              Browse live menus
            </button>
          </div>

          <div className="appetite-signal-row clear-checkout-grid" aria-label="Clear checkout promise">
            <span>No service charge</span>
            <span>No bag fee</span>
            <span>No hidden extras</span>
            <span>Clear delivery price</span>
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
          <button key={pick.title} type="button" className="craving-card" onClick={() => handleQuickPick(pick)}>
            <strong>{pick.title}</strong>
            <span>{pick.detail}</span>
          </button>
        ))}
      </section>

      <section className="search-panel marketplace-panel marketplace-scene">
        <div className="search-heading">
          <div>
            <p className="eyebrow">Tonight in Hull</p>
            <h2 className="search-title">Find the food you actually want.</h2>
            <p className="search-copy">
              Browse local menus, choose a category, track the order as it moves, and keep your favourites close for
              the next craving.
            </p>
          </div>
          <div className="search-highlight-card live-menu-card">
            <span className="search-highlight-label">Featured kitchen</span>
            <strong>Loaded Munch</strong>
            <p>A live example of how every local business can show its menu, options, delivery, and checkout.</p>
            <Link href="/stores/loaded-munch-hull" className="primary-button gold-button" style={{ width: "100%" }}>
              View the menu
            </Link>
          </div>
        </div>

        <div className="search-meta-row">
          <div className="delivery-pill">Serving Hull and surrounding areas</div>
          <div className="delivery-pill is-highlighted">Hull Eats+ free delivery subscription coming soon</div>
        </div>

        <div className="filter-row" aria-label="Marketplace filters">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`filter-pill${activeFilter === filter ? " is-active" : ""}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

      </section>

      <section className="content-grid marketplace-scene" ref={resultsRef}>
        <div className="content-stack">
          <div className="section-heading">
            <div>
              <h2>Order from Hull's local food scene</h2>
              <p>Food, drinks, essentials, sweet treats, and local favourites with clear delivery details.</p>
              {searchQuery ? <p className="search-result-note">Showing matches for “{searchQuery}”.</p> : null}
            </div>
          </div>

          <div className="store-grid">
            {visibleStores.map((store) => (
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
            {visibleStores.length === 0 ? (
              <article className="store-card empty-filter-card">
                <div className="store-card-body">
                  <h3>{activeFilter} coming soon</h3>
                  <p className="store-copy">
                    This category is part of the Hull Eats plan. New local businesses will appear here as they go live.
                  </p>
                </div>
              </article>
            ) : null}
          </div>
        </div>

        <aside className="sidebar-stack">
          <section className="feature-panel feature-panel-dark">
            <div className="section-heading compact">
              <div>
                <h2>Hull Eats+ coming soon</h2>
                <p>A simple free-delivery subscription for customers who order locally often.</p>
              </div>
            </div>

            <div className="membership-card">
              <div className="membership-price">£9.99/mo</div>
              <p>Free delivery on eligible orders, launch perks, and quick access to your usual favourites when membership opens.</p>
              <span className="coming-soon-pill">Coming soon</span>
            </div>
          </section>

        </aside>
      </section>
    </main>
  );
}


