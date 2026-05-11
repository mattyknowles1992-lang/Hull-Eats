import Link from "next/link";

import { AppSwitcher } from "../../app-switcher";
import { marketplaceItemCategories } from "../../../src/lib/hull-marketplace";
import {
  marketplaceListingGateBody,
  marketplaceListingGateHeadline,
  marketplaceListingRequiresHullEatsPlus,
} from "../../../src/lib/marketplace-policy";

export default function MarketplaceSellPage() {
  const requiresPlus = marketplaceListingRequiresHullEatsPlus();

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
          <p className="eyebrow">Seller account</p>
          <h1>Sign in before listing.</h1>
          <p>{marketplaceListingGateBody()}</p>

          <div className="marketplace-action-stack">
            <Link href="/register" className="primary-button">
              Create account
            </Link>
            <Link href="/account" className="secondary-button">
              Sign in
            </Link>
            {requiresPlus ? (
              <p className="listing-note" style={{ margin: 0 }}>
                Hull Eats+ must be active on your profile before publish is allowed (toggle via platform config).
              </p>
            ) : null}
          </div>
        </aside>

        <section className="feature-panel feature-panel-dark">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Listing builder</p>
              <h2>{marketplaceListingGateHeadline()}</h2>
              <p>
                Capture enough detail for local buyers. Offers, chat, buy now, pending payment, and seller paid / not
                sold actions map to the resale data model (same flow as Vinted, local handoff).
              </p>
            </div>
          </div>

          <form className="marketplace-listing-form">
            <fieldset disabled={requiresPlus}>
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
                <textarea placeholder="Measurements, condition, what is included, marks, pickup notes..." rows={5} />
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
            </fieldset>

            <button type="button" className="primary-button" disabled>
              Publish listing
            </button>
            <p className="listing-note">
              {requiresPlus
                ? "Publishing unlocks after Hull Eats+ is active on your account."
                : "Database tables for listings, threads, offers, and purchases are in place. The publish API is wired next so listings save securely to your hub."}
            </p>
          </form>
        </section>
      </section>
    </main>
  );
}
