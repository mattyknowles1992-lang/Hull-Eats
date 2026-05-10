import Link from "next/link";

import { AppSwitcher } from "../../app-switcher";
import { formatMarketplacePrice, marketplaceListings } from "../../../src/lib/hull-marketplace";

const sampleListing = marketplaceListings[0]!;

export default function MarketplaceMessagesPage() {
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

      <section className="marketplace-sell-grid marketplace-scene">
        <aside className="marketplace-gate-card">
          <p className="eyebrow">Messages</p>
          <h1>Sign in to message sellers.</h1>
          <p>
            Marketplace conversations keep offers, pickup notes, delivery requirements, and address details attached to
            the listing until the seller marks it sold.
          </p>
          <div className="marketplace-action-stack">
            <button type="button" className="primary-button">
              Sign in
            </button>
            <button type="button" className="secondary-button">
              Create account
            </button>
          </div>
        </aside>

        <section className="marketplace-message-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Conversation preview</p>
              <h2>{sampleListing.title}</h2>
              <p>Messages and offers become available after sign-in.</p>
            </div>
          </div>

          <div className="marketplace-message-thread">
            <div className="marketplace-message-bubble">
              <strong>Buyer offer</strong>
              <p>{formatMarketplacePrice(160)} for the sofa if collection can be arranged tonight?</p>
            </div>
            <div className="marketplace-message-bubble seller">
              <strong>Seller</strong>
              <p>That works. It needs a van. I can share the exact address once the item is reserved.</p>
            </div>
          </div>

          <div className="marketplace-action-stack">
            <button type="button" className="primary-button" disabled>
              Reserve item
            </button>
            <button type="button" className="secondary-button" disabled>
              Mark as sold
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}
