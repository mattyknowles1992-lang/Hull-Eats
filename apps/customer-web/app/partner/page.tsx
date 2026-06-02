import Link from "next/link";

import { buildStaticPageMetadata } from "../../src/lib/seo";
import { AppSwitcher } from "../app-switcher";
import {
  isHullMarketplaceResaleEnabled,
  isHullServicesEnabled,
} from "../../src/lib/customer-product-flags";

export const metadata = buildStaticPageMetadata({
  title: "Partner with us",
  description:
    isHullMarketplaceResaleEnabled() || isHullServicesEnabled()
      ? "Join Hull Eats as a restaurant or shop, list on Hull Marketplace, or promote your services through Hull Services."
      : "Join Hull Eats as a restaurant, takeaway, café, or shop — live menus, delivery, and business software.",
  path: "/partner",
  keywords: ["restaurant partner Hull", "takeaway software Hull", "join Hull Eats"],
});

export default function PartnerPage() {
  const showMarketplace = isHullMarketplaceResaleEnabled();
  const showServices = isHullServicesEnabled();

  return (
    <main className="shell legal-document-page">
      <header className="topbar legal-document-topbar">
        <AppSwitcher />
        <div className="topbar-actions">
          <Link href="/contact" className="glass-button">
            Contact us
          </Link>
          <Link href="/" className="secondary-button">
            Home
          </Link>
        </div>
      </header>

      <section className="legal-document-shell">
        <header className="legal-document-header">
          <h1 className="legal-document-title">Partner with us</h1>
          <p className="legal-document-summary">
            {showMarketplace || showServices
              ? "Hull Eats is built so businesses can adopt one pillar at a time — marketplace ordering, software-only hub tools, courier-supported delivery, Hull Marketplace listings, or Hull Services visibility — and expand when it suits them."
              : "Hull Eats helps Hull restaurants, takeaways, cafés, and shops run live menus, delivery rules, and checkout — with optional courier support and hub software as you grow."}
          </p>
        </header>

        <section className="partner-page-section">
          <h2>Restaurants, takeaways, cafés, and shops</h2>
          <p>
            We onboard venues onto live menus, delivery rules, and checkout. You keep control of pricing, descriptions,
            allergen information, item availability, and preparation times through your hub portal. Marketplace exposure is
            optional where we operate commission-based ordering.
          </p>
          <a className="primary-button" href="mailto:hello@hulleats.co.uk?subject=Hull%20Eats%20partner%20-%20ordering%20%26%20hub">
            Email partnerships — ordering
          </a>
        </section>

        {showMarketplace ? (
          <section className="partner-page-section">
            <h2>Hull Marketplace — sellers</h2>
            <p>
              Local classified-style listings for goods you want buyers to discover in Hull. Commercial terms, seller fees,
              and dispute handling evolve as the marketplace matures; our{" "}
              <Link href="/legal/terms-marketplace">Marketplace terms</Link> and{" "}
              <Link href="/legal/acceptable-use">acceptable use policy</Link> set the baseline expectations today.
            </p>
            <a className="primary-button" href="mailto:hello@hulleats.co.uk?subject=Hull%20Marketplace%20seller%20interest">
              Email partnerships — marketplace
            </a>
          </section>
        ) : null}

        {showServices ? (
          <section className="partner-page-section">
            <h2>Hull Services — trades & professionals</h2>
            <p>
              Home maintenance, vehicles, cleaning, grooming, and other local services can appear in dedicated browse
              experiences separate from takeaway menus. Tell us your trade, coverage area, and whether you already take card
              payments online.
            </p>
            <a className="primary-button" href="mailto:hello@hulleats.co.uk?subject=Hull%20Services%20provider%20interest">
              Email partnerships — services
            </a>
          </section>
        ) : null}

        <section className="partner-page-section">
          <h2>Delivery & logistics</h2>
          <p>
            Hull Eats courier coverage rolls out where operational capacity exists. Courier organisations interested in
            structured assignment workflows should email with fleet size, insurance summary, and Hull coverage areas.
          </p>
          <a className="primary-button" href="mailto:hello@hulleats.co.uk?subject=Hull%20Eats%20courier%20operations">
            Email courier operations
          </a>
        </section>

        <p className="form-helper" style={{ marginTop: 24, maxWidth: "72ch" }}>
          Commission percentages, launch incentives, and package pricing are agreed during onboarding and confirmed in
          writing before your storefront goes live.
        </p>
      </section>
    </main>
  );
}
