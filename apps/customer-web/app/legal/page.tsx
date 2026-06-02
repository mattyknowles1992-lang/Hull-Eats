import Link from "next/link";

import { buildStaticPageMetadata } from "../../src/lib/seo";
import { AppSwitcher } from "../app-switcher";
import {
  isAnyExtraHullProductEnabled,
  isHullMarketplaceResaleEnabled,
  isHullServicesEnabled,
} from "../../src/lib/customer-product-flags";

export const metadata = buildStaticPageMetadata({
  title: "Legal & policies",
  description: isAnyExtraHullProductEnabled()
    ? "Privacy, cookies, terms, and account policies for Hull Eats ordering, Hull Marketplace, and Hull Services."
    : "Privacy, cookies, terms, and account policies for Hull Eats ordering and your customer account.",
  path: "/legal",
  keywords: ["Hull Eats legal", "privacy policy", "terms of service Hull"],
});

const policiesAll = [
  {
    href: "/legal/privacy",
    title: "Privacy notice",
    description: "What we collect, why we use it, how long we keep it, and your rights under UK GDPR.",
    show: () => true,
  },
  {
    href: "/legal/cookies",
    title: "Cookie notice",
    description: "Cookies and similar technologies on our websites and customer journeys.",
    show: () => true,
  },
  {
    href: "/legal/terms-hull-eats",
    title: "Terms — Hull Eats ordering & account",
    description: "Using your account, browsing menus, placing orders, payments, and delivery or collection.",
    show: () => true,
  },
  {
    href: "/legal/terms-marketplace",
    title: "Terms — Hull Marketplace",
    description: "Buying and selling within our classified-style marketplace channels.",
    show: () => isHullMarketplaceResaleEnabled(),
  },
  {
    href: "/legal/terms-services",
    title: "Terms — Hull Services",
    description: "Finding and engaging local service providers listed through Hull Services.",
    show: () => isHullServicesEnabled(),
  },
  {
    href: "/legal/acceptable-use",
    title: "Acceptable use policy",
    description: "Fair use of our platforms, prohibited behaviour, and keeping the Hull community safe.",
    show: () => true,
  },
  {
    href: "/legal/close-account",
    title: "Close your account",
    description: "How to request closure or deletion of your Hull Eats customer account and related data.",
    show: () => true,
  },
] as const;

export default function LegalHubPage() {
  const policies = policiesAll.filter((policy) => policy.show());

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
            {isAnyExtraHullProductEnabled()
              ? "Hull Eats brings together ordering, marketplace listings, and services discovery. Each product has its own terms where the risks and responsibilities differ (for example, a takeaway order versus selling a second-hand item). Start with the Privacy notice, then open the terms that match how you use Hull Eats."
              : "Hull Eats covers local food ordering and your customer account. Start with the Privacy notice, then read the ordering terms and acceptable use policy. Additional product terms will appear here when we launch new areas of the platform."}
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
