import Link from "next/link";

import { AppSwitcher } from "../../app-switcher";
import { formatMarketplacePrice, marketplaceListings } from "../../../src/lib/hull-marketplace";
import { marketplaceListingGateBody } from "../../../src/lib/marketplace-policy";

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
            Each chat thread is tied to a listing and buyer. You can send text, send a cash offer in pounds, buy now
            (listing moves to pending payment), and the seller marks paid or not sold so the listing reopens or closes.
          </p>
          <p className="listing-note" style={{ marginTop: 12 }}>
            {marketplaceListingGateBody()}
          </p>
          <div className="marketplace-action-stack">
            <Link href="/account" className="primary-button">
              Sign in
            </Link>
            <Link href="/register" className="secondary-button">
              Create account
            </Link>
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
