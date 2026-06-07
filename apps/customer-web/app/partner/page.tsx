import Link from "next/link";
import { Suspense } from "react";

import { buildStaticPageMetadata } from "../../src/lib/seo";
import { AppSwitcher } from "../app-switcher";
import { PartnerForm } from "./partner-form";

export const metadata = buildStaticPageMetadata({
  title: "Partner with us",
  description:
    "Join Hull Eats as a Hull restaurant, takeaway, café, or shop — menus, delivery, and business software built for local operators.",
  path: "/partner",
  keywords: ["restaurant partner Hull", "takeaway software Hull", "join Hull Eats"],
});

export default function PartnerPage() {
  return (
    <main className="marketing-page">
      <header className="marketing-nav">
        <div className="brand-pill">
          <AppSwitcher />
          <div>
            <p className="eyebrow">Hull Eats for businesses</p>
            <p className="brand-title">Partner with Hull Eats</p>
          </div>
        </div>

        <nav className="marketing-nav-actions" aria-label="Partner page actions">
          <Link href="/contact" className="glass-button">
            Customer support
          </Link>
          <Link href="/" className="secondary-button">
            Home
          </Link>
        </nav>
      </header>

      <section className="marketing-hero">
        <div className="marketing-hero-copy">
          <p className="eyebrow">Hull businesses only</p>
          <h1>Bring your takeaway, café, or shop onto Hull Eats.</h1>
          <p>
            We can only onboard businesses in Hull at the moment. Share a few details below and we will review your enquiry,
            then get back to you using your preferred contact method.
          </p>
          <p>
            You stay in control of menus, pricing, allergens, availability, and delivery settings through your business hub
            once onboarding begins.
          </p>
        </div>
      </section>

      <section className="marketing-partner-section">
        <div className="marketing-partner-intro">
          <p className="eyebrow">Get started</p>
          <h2>Send a partner enquiry</h2>
          <p>
            Tell us where your business is based and how you would like us to reply. Name, email, and phone are optional,
            but please add the contact detail that matches your preferred method so we can reach you quickly.
          </p>
        </div>

        <Suspense fallback={<p className="form-helper">Loading partner form...</p>}>
          <PartnerForm />
        </Suspense>
      </section>

      <section className="contact-band">
        <div>
          <p className="eyebrow">Already trading with us?</p>
          <h2>Need help with your hub or an existing store?</h2>
          <p>Use customer support for order issues, or contact us if your business is already live and needs operational help.</p>
        </div>

        <div className="contact-actions">
          <Link className="primary-button" href="/contact">
            Contact Hull Eats
          </Link>
          <Link className="glass-button" href="/about">
            About Hull Eats
          </Link>
        </div>
      </section>
    </main>
  );
}
