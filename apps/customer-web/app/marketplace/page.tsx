import Link from "next/link";

import { AppSwitcher } from "../app-switcher";
import {
  formatMarketplacePrice,
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
            Anyone can browse and buy. Hull Eats+ members can list items, message local buyers, accept offers, and mark
            items as sold once the sale is arranged.
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
            Buyers stay open to everyone. Sellers need an account and an active Hull Eats+ membership before an item can
            go live.
          </p>
          <Link href="/marketplace/sell" className="primary-button">
            Start selling
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
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(3, 9, 22, 0.04), rgba(3, 9, 22, 0.72)), url(${category.imageUrl})`,
              }}
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
              <p>Open an item to buy, send an offer, or message the seller before arranging collection or delivery.</p>
            </div>
          </div>

          <div className="resale-listing-grid">
            {marketplaceListings.map((listing) => (
              <Link className="resale-listing-card" key={listing.id} id={listing.categorySlug} href={`/marketplace/${listing.id}`}>
                <div className="resale-listing-media" style={{ backgroundImage: `url(${listing.imageUrl})` }}>
                  <span>{getDeliveryModeLabel(listing.deliveryMode)}</span>
                </div>
                <div className="resale-listing-body">
                  <div className="resale-listing-top">
                    <div>
                      <h3>{listing.title}</h3>
                      <p>{listing.location}</p>
                    </div>
                    <strong>{formatMarketplacePrice(listing.price)}</strong>
                  </div>
                  <p>{listing.description}</p>
                  <div className="store-tags">
                    <span className="store-tag">{listing.condition}</span>
                    <span className="store-tag">{listing.sellerLabel}</span>
                    <span className="store-tag">{listing.status}</span>
                    <span className="store-tag">{listing.listedAtLabel}</span>
                  </div>
                  <div className="store-card-footer">
                    <span className="card-cta">View item</span>
                    <span className="ghost-link">Offers and messages</span>
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
                <p className="eyebrow">Account required</p>
                <h2>Sell through Hull Marketplace</h2>
                <p>Only active Hull Eats+ members can publish listings. Buyers can browse, buy, message, and send offers.</p>
              </div>
            </div>

            <div className="marketplace-action-stack">
              <Link href="/marketplace/sell" className="primary-button">
                Seller account
              </Link>
              <Link href="/marketplace/messages" className="secondary-button">
                Messages and offers
              </Link>
              <p className="listing-note">
                Listing, offer, purchase status, delivery requirement, and sold state are saved against the marketplace
                item.
              </p>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
