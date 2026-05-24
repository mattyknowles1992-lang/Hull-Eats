"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { deliveryFeeFromForStorefront } from "@hull-eats/types";

import { HullMicrocopy } from "../src/components/hull-microcopy";
import { YouAreHereWidget } from "../src/components/you-are-here-widget";
import { playOrderSuccessDelight } from "../src/lib/customer-experience";
import { AppSwitcher } from "./app-switcher";
import { MarketplaceAuthButtons } from "./marketplace-auth-buttons";
import { featuredStores, storeMenus } from "../src/lib/demo";
import { marketplaceCategories } from "../src/lib/marketplace-categories";

const filters = ["All", "Restaurants", "Takeaways", "Groceries", "Desserts", "Late night"] as const;
type FilterLabel = (typeof filters)[number];

type Coordinates = {
  latitude: number;
  longitude: number;
};

type LocationStatus = "idle" | "locating" | "ready" | "denied" | "unsupported";

const storeCoordinates: Record<string, Coordinates> = {
  "loaded-munch-hull": {
    latitude: 53.753013,
    longitude: -0.402771,
  },
};

function getStoreStatus(storefrontStatus: string, isOpen: boolean) {
  if (storefrontStatus === "onboarding") {
    return "Onboarding";
  }

  return isOpen ? "Open now" : "Opening soon";
}

function getDistanceKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const startLatitude = toRadians(from.latitude);
  const endLatitude = toRadians(to.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function formatDistance(distanceKm: number) {
  const miles = distanceKm * 0.621371;
  return miles < 0.1 ? "under 0.1 miles" : `${miles.toFixed(miles < 10 ? 1 : 0)} miles`;
}

export default function CustomerHomePage() {
  const [activeFilter, setActiveFilter] = useState<FilterLabel>("All");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerCoordinates, setCustomerCoordinates] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
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

  function handleUseLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }

    setLocationStatus("locating");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCustomerCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus("ready");
        playOrderSuccessDelight();
        focusResults();
      },
      (geoError) => {
        if (geoError.code === 1) {
          setLocationStatus("denied");
          return;
        }
        setLocationStatus("unsupported");
      },
      {
        enableHighAccuracy: false,
        maximumAge: 300000,
        timeout: 15000,
      },
    );
  }

  const storeDistances = useMemo(() => {
    if (!customerCoordinates) {
      return new Map<string, number>();
    }

    return new Map(
      featuredStores
        .map((store) => {
          const storeLocation = storeCoordinates[store.slug];
          return storeLocation ? ([store.slug, getDistanceKm(customerCoordinates, storeLocation)] as const) : null;
        })
        .filter((entry): entry is readonly [string, number] => Boolean(entry)),
    );
  }, [customerCoordinates]);

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
    }).sort((firstStore, secondStore) => {
      if (!customerCoordinates) {
        return 0;
      }

      const firstDistance = storeDistances.get(firstStore.slug) ?? Number.POSITIVE_INFINITY;
      const secondDistance = storeDistances.get(secondStore.slug) ?? Number.POSITIVE_INFINITY;

      return firstDistance - secondDistance;
    });
  }, [activeFilter, customerCoordinates, searchQuery, storeDistances]);

  const locationStatusCopy = (() => {
    if (locationStatus === "locating") {
      return "Finding your location...";
    }

    if (locationStatus === "ready") {
      return "Showing closest options first";
    }

    if (locationStatus === "denied") {
      return "Location blocked — allow location for this site in browser settings, then tap Use location again";
    }

    if (locationStatus === "unsupported") {
      return "Location unavailable — check signal or try again";
    }

    return "";
  })();

  const portraitHeroCycleSeconds = marketplaceCategories.length * 5;

  return (
    <main className="shell customer-marketplace">
      <header className="topbar customer-home-topbar">
        <AppSwitcher />
        <section className="location-strip topbar-location" aria-label="Location recommendations">
          <span className="location-pin" aria-hidden="true" />
          <div>
            <p className="eyebrow">Recommended in your area</p>
            {locationStatusCopy ? <p>{locationStatusCopy}</p> : null}
          </div>
          <button type="button" className="primary-button location-button" onClick={handleUseLocation} disabled={locationStatus === "locating"}>
            {locationStatus === "ready" ? "Update" : locationStatus === "locating" ? "Finding..." : "Use location"}
          </button>
        </section>
        <div className="topbar-trailing-actions">
          <details className="membership-popover topbar-membership">
            <summary className="glass-button membership-nav-button">
              <span>Coming soon</span>
              <strong className="membership-nav-title">
                Hull Eats<span className="membership-brand-plus">+</span>
              </strong>
            </summary>
            <div className="membership-popover-card">
              <span className="search-highlight-label">Coming soon</span>
              <strong className="membership-nav-title">
                Hull Eats<span className="membership-brand-plus">+</span>
              </strong>
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
          <MarketplaceAuthButtons />
        </div>
      </header>

      <nav className="marketplace-category-rail" aria-label="Food categories">
        {marketplaceCategories.map((category) => (
          <Link key={category.slug} href={`/categories/${category.slug}`} className="marketplace-category-chip">
            <span className="marketplace-category-chip-image" style={{ backgroundImage: `url(${category.imageUrl})` }} />
            <span>{category.shortLabel}</span>
          </Link>
        ))}
      </nav>

      <section className="marketplace-hero marketplace-scene">
        <div className="hero-slideshow hero-slideshow-landscape" aria-hidden="true">
          <span className="hero-slide hero-slide-one" />
          <span className="hero-slide hero-slide-two" />
          <span className="hero-slide hero-slide-three" />
        </div>
        <div className="hero-slideshow hero-slideshow-portrait" aria-hidden="true">
          {marketplaceCategories.map((category, index) => (
              <span
                key={category.slug}
                className="hero-slide hero-slide-portrait-cycle"
                style={{
                  backgroundImage: `url(${category.imageUrl})`,
                  animationDuration: `${portraitHeroCycleSeconds}s`,
                  animationDelay: `${(index * portraitHeroCycleSeconds) / marketplaceCategories.length}s`,
                }}
              />
            ))}
        </div>
        <div className="marketplace-hero-copy">
          <p className="hero-badge">Hull's Delivery Hub</p>
          <h1>From local businesses to your door.</h1>

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

          <div className="marketplace-hero-delights">
            <HullMicrocopy />
          </div>

          {customerCoordinates ? (
            <YouAreHereWidget latitude={customerCoordinates.latitude} longitude={customerCoordinates.longitude} />
          ) : null}
        </div>

      </section>

      <section className="search-panel marketplace-panel marketplace-scene">
        <div className="search-heading">
          <div>
            <p className="eyebrow">Browse by category</p>
            <h2 className="search-title">Choose the category first.</h2>
            <p className="search-copy">
              Start with takeaways, groceries, bakery, butcher, alcohol, vapes, convenience, desserts, and local
              essentials. Every category grows as more Hull businesses go live on Hull Eats.
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
        </div>

        <div className="filter-row" aria-label="Category filters">
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
              <h2>{customerCoordinates ? "Recommended near you" : "Order from Hull's local food scene"}</h2>
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
                    backgroundImage: `linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0) 42%, rgba(8, 14, 24, 0.28)), url(${store.heroImageUrl})`,
                  }}
                >
                  <div className="store-card-overlay">
                    <span className="status-chip pending">{getStoreStatus(store.storefrontStatus, store.isOpen)}</span>
                  </div>
                </div>

                <div className="store-card-body">
                  <div className="store-card-top">
                    <div>
                      <h3>{store.name}</h3>
                      <p className="store-meta">{store.cuisineLabel}</p>
                    </div>
                  </div>

                  <div className="store-tags">
                    <span className="store-tag">{store.etaMinutes} min</span>
                    <span className="store-tag">Min £{store.minimumOrderAmount?.toFixed(2)}</span>
                    <span className="store-tag">
                      Delivery from £{deliveryFeeFromForStorefront({ legacyDeliveryFee: store.deliveryFee, pricing: store.deliveryPricing }).toFixed(2)}
                    </span>
                    {storeDistances.has(store.slug) ? <span className="store-tag">{formatDistance(storeDistances.get(store.slug)!)} away</span> : null}
                  </div>

                  {store.onboardingMessage?.trim() ? <p className="store-copy">{store.onboardingMessage}</p> : null}

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
      </section>

    </main>
  );
}


