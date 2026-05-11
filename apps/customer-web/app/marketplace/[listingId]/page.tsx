import Link from "next/link";
import { notFound } from "next/navigation";

import { AppSwitcher } from "../../app-switcher";
import {
  formatMarketplacePrice,
  getDeliveryModeLabel,
  getMarketplaceListing,
  marketplaceListings,
} from "../../../src/lib/hull-marketplace";

type ListingPageProps = {
  params: Promise<{
    listingId: string;
  }>;
};

export function generateStaticParams() {
  return marketplaceListings.map((listing) => ({ listingId: listing.id }));
}

export default async function MarketplaceListingPage({ params }: ListingPageProps) {
  const { listingId } = await params;
  const listing = getMarketplaceListing(listingId);

  if (!listing) {
    notFound();
  }

  const isSold = listing.status === "sold";

  return (
    <main className="shell customer-marketplace hull-marketplace-page">
      <header className="topbar">
        <AppSwitcher />

        <div className="topbar-actions">
          <Link href="/marketplace" className="primary-button service-back-button">
            Back to marketplace
          </Link>
        </div>
      </header>

      <section className="marketplace-detail-grid marketplace-scene">
        <div className="listing-gallery">
          <div className="listing-gallery-main" style={{ backgroundImage: `url(${listing.imageUrl})` }}>
            <span>{getDeliveryModeLabel(listing.deliveryMode)}</span>
          </div>
        </div>

        <article className="marketplace-detail-main">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">{listing.location}</p>
              <h1>{listing.title}</h1>
              <p>{listing.description}</p>
            </div>
          </div>

          <div className="marketplace-price-row">
            <strong>{formatMarketplacePrice(listing.price)}</strong>
            <span className={`marketplace-status-pill marketplace-status-${listing.status}`}>{listing.status}</span>
          </div>

          <div className="store-tags">
            <span className="store-tag">{listing.condition}</span>
            <span className="store-tag">{listing.listedAtLabel}</span>
            <span className="store-tag">{listing.sellerLabel}</span>
            {listing.sellerTrustVerified ? (
              <span className="store-tag store-tag-trust">Trust verified</span>
            ) : null}
          </div>

          <section className="marketplace-panel">
            <h2>Item details</h2>
            <ul className="marketplace-check-list">
              {listing.itemFacts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </section>

          <section className="marketplace-panel">
            <h2>Collection and delivery</h2>
            <p>{listing.deliveryNotes}</p>
          </section>
        </article>

        <aside className="seller-action-panel">
          <p className="eyebrow">Seller</p>
          <h2>{listing.sellerName}</h2>
          <p>{listing.sellerMemberSince}</p>

          <div className="marketplace-action-stack">
            <button type="button" className="primary-button" disabled={isSold}>
              Buy item
            </button>
            <form className="marketplace-listing-form marketplace-offer-form">
              <label>
                Send offer
                <input placeholder={formatMarketplacePrice(Math.max(1, listing.price - 20))} inputMode="decimal" />
              </label>
              <button type="button" className="secondary-button" disabled={!listing.acceptsOffers || isSold}>
                Send offer
              </button>
            </form>
            <Link href="/marketplace/messages" className="secondary-button">
              Message seller
            </Link>
          </div>

          <p className="listing-note">
            Address and handoff details stay in the thread. Buy now or an accepted offer sets the sale to pending
            payment; the seller marks paid (listing sold) or not sold (listing available again). Cash or bank transfer is
            between buyer and seller — Hull Eats records status for trust and support. After paid, your next visit to
            Hull Marketplace asks for a required star rating (0.1 steps) and optional comment.{" "}
            <Link href="/marketplace/resolution">Resolution centre</Link> is for disputes.
          </p>
        </aside>
      </section>
    </main>
  );
}
