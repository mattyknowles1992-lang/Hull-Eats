import Link from "next/link";

import { AppSwitcher } from "../../app-switcher";
import {
  RESALE_RESOLUTION_CATEGORIES,
  type ResaleResolutionCategory,
} from "@hull-eats/types";

const categoryLabels: Record<ResaleResolutionCategory, string> = {
  ITEM_NOT_AS_DESCRIBED: "Item not as described",
  PAYMENT_OR_PICKUP: "Payment or pickup issue",
  HARASSMENT_OR_SAFETY: "Harassment or safety concern",
  OTHER: "Something else",
};

export default function MarketplaceResolutionPage() {
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
          <p className="eyebrow">Resolution centre</p>
          <h1>Help with a Hull Marketplace sale.</h1>
          <p>
            Open a case if something went wrong after you bought, sold, or messaged someone. We store each case against
            your account and the listing or purchase so support can follow a clear trail.
          </p>
          <p className="listing-note" style={{ marginTop: 12 }}>
            Sign in is required to open a case. Case submission from this page will connect to the API in a later
            release.
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

        <section className="feature-panel feature-panel-dark">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Categories</p>
              <h2>What we can help with</h2>
              <p>Pick the closest match when you file — you can add detail in your own words.</p>
            </div>
          </div>
          <ul className="marketplace-resolution-list">
            {RESALE_RESOLUTION_CATEGORIES.map((key) => (
              <li key={key}>
                <strong>{categoryLabels[key]}</strong>
                <span className="muted-copy"> — reference your purchase or listing ID if you have it.</span>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
