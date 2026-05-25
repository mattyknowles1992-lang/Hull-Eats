import type { Metadata } from "next";
import Link from "next/link";

import { AppSwitcher } from "../app-switcher";
import { ContactForm } from "./contact-form";
import { isHullMarketplaceResaleEnabled, isHullServicesEnabled } from "../../src/lib/customer-product-flags";

export const metadata: Metadata = {
  title: "Contact us | Hull Eats",
  description: isHullMarketplaceResaleEnabled() || isHullServicesEnabled()
    ? "Reach Hull Eats for customer support, business onboarding, marketplace queries, and Hull Services."
    : "Reach Hull Eats for customer support, business onboarding, and ordering help.",
};

export default function ContactPage() {
  const showMarketplace = isHullMarketplaceResaleEnabled();
  const showServices = isHullServicesEnabled();

  return (
    <main className="shell legal-document-page">
      <header className="topbar legal-document-topbar">
        <AppSwitcher />
        <div className="topbar-actions">
          <Link href="/legal" className="glass-button">
            Legal & policies
          </Link>
          <Link href="/" className="secondary-button">
            Home
          </Link>
        </div>
      </header>

      <section className="legal-document-shell">
        <header className="legal-document-header">
          <h1 className="legal-document-title">Contact us</h1>
          <p className="legal-document-summary">
            We route enquiries so the right team can respond. Customer issues about a specific order should include your order
            number so we can trace it quickly.
          </p>
        </header>

        <div className="contact-page-grid">
          <article className="contact-card">
            <h2>General & customer support</h2>
            <p>Questions about your account, deliveries, payments, or using the Hull Eats website and app.</p>
          </article>

          <article className="contact-card">
            <h2>{showServices ? "Restaurants, shops & Hull Services providers" : "Restaurants, shops & business partners"}</h2>
            <p>Onboarding, hub login, menu publishing, delivery settings, and software support for businesses using Hull Eats.</p>
          </article>

          {showMarketplace ? (
            <article className="contact-card">
              <h2>Marketplace listings</h2>
              <p>Report concerning listings, disputes where our acceptable use policy may apply, or local marketplace safety issues.</p>
            </article>
          ) : null}

          <article className="contact-card">
            <h2>Privacy & data protection</h2>
            <p>Subject access requests, correction or deletion of personal data, and questions about how we process information.</p>
          </article>
        </div>

        <ContactForm />

        <p className="form-helper" style={{ marginTop: 28, maxWidth: "72ch" }}>
          Registered office and telephone contact points will be listed here once published for the Hull Eats operating entity.
          Until then, the support form above gives us a written audit trail inside the admin inbox.
        </p>
      </section>
    </main>
  );
}
