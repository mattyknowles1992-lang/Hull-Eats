import Link from "next/link";

import { serviceBusinesses, serviceCategories } from "../../src/lib/service-marketplace";

export default function ServicesPage() {
  return (
    <main className="shell customer-marketplace services-marketplace">
      <header className="topbar services-topbar">
        <div className="services-logo-lockup">
          <img src="/brand/hull-services-logo.png" alt="Hull Services" className="services-page-logo" />
        </div>

        <div className="topbar-actions">
          <Link href="/" className="primary-button service-back-button">
            Back to Hull Eats Marketplace
          </Link>
        </div>
      </header>

      <section className="services-hero marketplace-scene">
        <div className="services-hero-copy">
          <p className="hero-badge">Hull Services</p>
          <h1>Explore local services.</h1>
          <p>Discover service providers in Hull across home, garden, vehicles, grooming, repairs, and local support.</p>

          <div className="marketplace-search">
            <input
              className="search-input"
              aria-label="Search local services"
              placeholder="Search gardening, plumbing, cleaning, car detailing..."
            />
            <button type="button" className="primary-button">
              Browse services
            </button>
          </div>
        </div>
      </section>

      <section className="marketplace-panel service-category-panel marketplace-scene">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Browse service categories</p>
            <h2>Find local businesses offering services</h2>
            <p>Services sit separately from takeaway menus so providers can manage listings, prices, availability, and coverage areas.</p>
          </div>
        </div>

        <div className="service-category-grid">
          {serviceCategories.map((category) => (
            <a
              key={category.slug}
              href={`#${category.slug}`}
              className="service-category-card"
              style={{ backgroundImage: `linear-gradient(180deg, rgba(3, 9, 22, 0.02), rgba(3, 9, 22, 0.68)), url(${category.imageUrl})` }}
            >
              <strong>{category.label}</strong>
              <span>{category.description}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="content-grid marketplace-scene services-content-grid">
        <div className="content-stack">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Recommended in Hull</p>
              <h2>Service provider examples</h2>
              <p>These cards show how service businesses can appear once provider registration and listings are live.</p>
            </div>
          </div>

          <div className="store-grid service-listing-grid">
            {serviceBusinesses.map((business) => (
              <article className="store-card service-provider-card" key={business.id} id={business.categorySlug}>
                <div
                  className="store-card-media"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(3, 9, 22, 0.04), rgba(3, 9, 22, 0.82)), url(${business.imageUrl})`,
                  }}
                >
                  <div className="store-card-overlay">
                    <span className="status-chip pending">{business.availability}</span>
                  </div>
                </div>

                <div className="store-card-body">
                  <div className="store-card-top">
                    <div>
                      <h3>{business.businessName}</h3>
                      <p className="store-meta">{business.coverageArea}</p>
                    </div>
                  </div>

                  <div className="store-tags">
                    <span className="store-tag">From £{business.priceFrom}</span>
                    <span className="store-tag">{business.rating.toFixed(1)} rating</span>
                    <span className="store-tag">{business.reviewCount} reviews</span>
                  </div>

                  <p className="store-copy">{business.description}</p>

                  <div className="store-card-footer">
                    <span className="card-cta">View listing</span>
                    <span className="ghost-link">Service marketplace</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="sidebar-stack">
          <section className="feature-panel feature-panel-dark">
            <div className="section-heading compact">
              <div>
                <h2>Location-based recommendations</h2>
                <p>Services can use coverage areas and provider locations separately from food delivery zones.</p>
              </div>
            </div>

            <div className="membership-card">
              <p>
                Providers will be able to register, create service listings, set active categories, and manage availability
                without touching food menus or takeaway ordering.
              </p>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
