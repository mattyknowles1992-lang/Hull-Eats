import type { Metadata } from "next";
import Link from "next/link";

import { AppSwitcher } from "../app-switcher";

export const metadata: Metadata = {
  title: "Legal & policies | Hull Eats",
  description:
    "Privacy, cookies, terms, and account policies for Hull Eats ordering, Hull Marketplace, and Hull Services.",
};

const policies = [
  {
    href: "/legal/privacy",
    title: "Privacy notice",
    description: "What we collect, why we use it, how long we keep it, and your rights under UK GDPR.",
  },
  {
    href: "/legal/cookies",
    title: "Cookie notice",
    description: "Cookies and similar technologies on our websites and customer journeys.",
  },
  {
    href: "/legal/terms-hull-eats",
    title: "Terms — Hull Eats ordering & account",
    description: "Using your account, browsing menus, placing orders, payments, and delivery or collection.",
  },
  {
    href: "/legal/terms-marketplace",
    title: "Terms — Hull Marketplace",
    description: "Buying and selling within our classified-style marketplace channels.",
  },
  {
    href: "/legal/terms-services",
    title: "Terms — Hull Services",
    description: "Finding and engaging local service providers listed through Hull Services.",
  },
  {
    href: "/legal/acceptable-use",
    title: "Acceptable use policy",
    description: "Fair use of our platforms, prohibited behaviour, and keeping the Hull community safe.",
  },
  {
    href: "/legal/close-account",
    title: "Close your account",
    description: "How to request closure or deletion of your Hull Eats customer account and related data.",
  },
];

export default function LegalHubPage() {
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
          <h1 className="legal-document-title">Legal & policies</h1>
          <p className="legal-document-summary">
            Hull Eats brings together ordering, marketplace listings, and services discovery. Each product has its own terms
            where the risks and responsibilities differ (for example, a takeaway order versus selling a second-hand item).
            Start with the Privacy notice, then open the terms that match how you use Hull Eats.
          </p>
        </header>

        <div className="legal-hub-grid">
          {policies.map((policy) => (
            <Link key={policy.href} href={policy.href} className="legal-hub-card">
              <strong>{policy.title}</strong>
              <span>{policy.description}</span>
            </Link>
          ))}
        </div>

        <p className="form-helper" style={{ marginTop: 28, maxWidth: "72ch" }}>
          Nothing here is legal advice. If you need advice about your specific situation, speak to a qualified solicitor.
          When our operating company details are published on Companies House, we will add the registered name and number
          here for completeness.
        </p>
      </section>
    </main>
  );
}
