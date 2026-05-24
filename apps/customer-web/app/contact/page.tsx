import type { Metadata } from "next";
import Link from "next/link";

import { AppSwitcher } from "../app-switcher";
import {
  isHullMarketplaceResaleEnabled,
  isHullServicesEnabled,
} from "../../src/lib/customer-product-flags";

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
            We route enquiries so the right team can respond. Customer issues about a specific order should always include
            your order number when you contact us so we can trace it quickly.
          </p>
        </header>

        <div className="contact-page-grid">
          <article className="contact-card">
            <h2>General & customer support</h2>
            <p>
              Questions about your account, deliveries, payments shown on Hull Eats, or technical problems using the site
              or app.
            </p>
            <a className="primary-button" href="mailto:hello@hulleats.co.uk?subject=Hull%20Eats%20customer%20support">
              hello@hulleats.co.uk
            </a>
          </article>

          <article className="contact-card">
            <h2>
              {showServices ? "Restaurants, shops & Hull Services providers" : "Restaurants, shops & business partners"}
            </h2>
            <p>
              Onboarding, hub login, menu publishing, delivery settings, and operational changes for businesses using Hull
              Eats software.
            </p>
            <a className="primary-button" href="mailto:hello@hulleats.co.uk?subject=Hull%20Eats%20business%20enquiry">
              Business enquiries
            </a>
          </article>

          {showMarketplace ? (
            <article className="contact-card">
              <h2>Marketplace listings</h2>
              <p>
                Reporting a concerning listing, disputes between buyers and sellers where our acceptable use policy may
                apply, or safety issues.
              </p>
              <a className="primary-button" href="mailto:hello@hulleats.co.uk?subject=Hull%20Marketplace%20report">
                Marketplace safety
              </a>
            </article>
          ) : null}

          <article className="contact-card">
            <h2>Privacy & data protection</h2>
            <p>
              Subject access requests, correction or deletion of personal data, and questions about how we process
              information.
            </p>
            <a className="primary-button" href="mailto:hello@hulleats.co.uk?subject=Hull%20Eats%20privacy%20request">
              Privacy requests
            </a>
            <p className="form-helper" style={{ marginTop: 14 }}>
              Read our <Link href="/legal/privacy">Privacy notice</Link> before writing so we can handle your request under
              UK GDPR timescales.
            </p>
          </article>
        </div>

        <p className="form-helper" style={{ marginTop: 28, maxWidth: "72ch" }}>
          Registered office and telephone contact points will be listed here once published for the Hull Eats operating
          entity. Until then, email is our primary channel for written records and audit trails.
        </p>
      </section>
    </main>
  );
}
