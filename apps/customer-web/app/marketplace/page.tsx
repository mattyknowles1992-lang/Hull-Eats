import Link from "next/link";

import { AppSwitcher } from "../app-switcher";
import {
  getDeliveryModeLabel,
  marketplaceItemCategories,
  marketplaceListings,
} from "../../src/lib/hull-marketplace";

export default function HullMarketplacePage() {
  return (
    <main className="shell customer-marketplace hull-marketplace-page">
      <header className="topbar">
        <AppSwitcher />

        <div className="topbar-actions">
          <Link href="/" className="primary-button service-back-button">
            Back to Hull Eats Marketplace
          </Link>
        </div>
      </header>

      <section className="marketplace-resale-hero marketplace-scene">
        <div className="marketplace-resale-copy">
          <p className="hero-badge">Hull Marketplace</p>
          <h1>Buy and sell locally in Hull.</h1>
          <p>
            Anyone can browse and buy. Hull Eats+ members can list items for sale and reach local people nearby.
          </p>

          <div className="marketplace-search resale-search" aria-label="Search Hull Marketplace">
            <input className="search-input" placeholder="Search sofas, fridges, phones, prams..." />
            <button type="button" className="primary-button">
              Search listings
            </button>
          </div>
        </div>

        <aside className="marketplace-member-card">
          <p className="eyebrow">Listing access</p>
          <h2>Hull Eats+ members can sell.</h2>
          <p>
            Buyers stay open to everyone. Listing is a member benefit so local sellers can get attention without the page
            becoming messy or spammy.
          </p>
          <Link href="#list-item" className="primary-button">
            Create listing
          </Link>
        </aside>
      </section>

      <section className="marketplace-panel resale-category-panel marketplace-scene">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Browse local resale categories</p>
            <h2>Find second-hand items nearby</h2>
            <p>Built for local buyers first: collection, small local delivery, and van delivery for large items.</p>
          </div>
        </div>

        <div className="resale-category-grid">
          {marketplaceItemCategories.map((category) => (
            <a
              key={category.slug}
              href={`#${category.slug}`}
              className="resale-category-card"
              style={{ backgroundImage: `linear-gradient(180deg, rgba(3, 9, 22, 0.04), rgba(3, 9, 22, 0.72)), url(${category.imageUrl})` }}
            >
              <strong>{category.label}</strong>
            </a>
          ))}
        </div>
      </section>

      <section className="content-grid marketplace-scene resale-content-grid">
        <div className="content-stack">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Local listings</p>
              <h2>Available around Hull</h2>
              <p>These are example listing cards for the marketplace flow before live sellers are switched on.</p>
            </div>
          </div>

          <div className="resale-listing-grid">
            {marketplaceListings.map((listing) => (
              <article className="resale-listing-card" key={listing.id} id={listing.categorySlug}>
                <div className="resale-listing-media" style={{ backgroundImage: `url(${listing.imageUrl})` }}>
                  <span>{getDeliveryModeLabel(listing.deliveryMode)}</span>
                </div>
                <div className="resale-listing-body">
                  <div className="resale-listing-top">
                    <div>
                      <h3>{listing.title}</h3>
                      <p>{listing.location}</p>
                    </div>
                    <strong>£{listing.price}</strong>
                  </div>
                  <p>{listing.description}</p>
                  <div className="store-tags">
                    <span className="store-tag">{listing.condition}</span>
                    <span className="store-tag">{listing.sellerLabel}</span>
                    <span className="store-tag">{listing.listedAtLabel}</span>
                  </div>
                  <div className="store-card-footer">
                    <span className="card-cta">View item</span>
                    <span className="ghost-link">Message seller</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="sidebar-stack">
          <section className="feature-panel feature-panel-dark" id="list-item">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Hull Eats+ seller tools</p>
                <h2>List an item</h2>
                <p>Membership check will happen before a seller can publish. This form is the listing shape we will save.</p>
              </div>
            </div>

            <form className="marketplace-listing-form">
              <label>
                Item title
                <input placeholder="Grey corner sofa" />
              </label>
              <label>
                Price
                <input placeholder="180" inputMode="decimal" />
              </label>
              <label>
                Category
                <select defaultValue="">
                  <option value="" disabled>
                    Choose category
                  </option>
                  {marketplaceItemCategories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Condition
                <select defaultValue="good">
                  <option value="new">New</option>
                  <option value="like-new">Like new</option>
                  <option value="good">Good</option>
                  <option value="used">Used</option>
                  <option value="parts">For parts or repair</option>
                </select>
              </label>
              <label>
                Description
                <textarea placeholder="Size, condition, collection notes, measurements, what is included..." rows={5} />
              </label>

              <div className="listing-delivery-options" aria-label="Delivery options">
                <label>
                  <input type="radio" name="deliveryMode" defaultChecked />
                  Collection only
                </label>
                <label>
                  <input type="radio" name="deliveryMode" />
                  Small item local delivery
                </label>
                <label>
                  <input type="radio" name="deliveryMode" />
                  Large item / van required
                </label>
              </div>

              <button type="button" className="primary-button">
                Preview listing
              </button>
              <p className="listing-note">Publishing will be available to active Hull Eats+ members.</p>
            </form>
          </section>
        </aside>
      </section>
    </main>
  );
}
