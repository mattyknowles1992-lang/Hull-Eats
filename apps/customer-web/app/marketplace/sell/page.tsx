import Link from "next/link";

import { AppSwitcher } from "../../app-switcher";
import { marketplaceItemCategories } from "../../../src/lib/hull-marketplace";

export default function MarketplaceSellPage() {
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
          <p>
            Hull Marketplace listings are only available to active Hull Eats+ members. Buyers can browse without listing
            access, but sellers must have an account so offers, messages, collection details, and sold status are tracked.
          </p>

          <div className="marketplace-action-stack">
            <button type="button" className="primary-button">
              Create account
            </button>
            <button type="button" className="secondary-button">
              Sign in
            </button>
            <button type="button" className="secondary-button">
              Check Hull Eats+ membership
            </button>
          </div>
        </aside>

        <section className="feature-panel feature-panel-dark">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Listing builder</p>
              <h2>Ready once membership is verified</h2>
              <p>Capture enough detail for local buyers without making a sofa or fridge listing painful to create.</p>
            </div>
          </div>

          <form className="marketplace-listing-form">
            <fieldset disabled>
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
            <p className="listing-note">Publishing unlocks after sign-in and Hull Eats+ membership verification.</p>
          </form>
        </section>
      </section>
    </main>
  );
}
