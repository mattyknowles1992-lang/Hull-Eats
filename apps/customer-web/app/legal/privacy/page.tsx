import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument } from "../../../src/components/legal-document";

export const metadata: Metadata = {
  title: "Privacy notice | Hull Eats",
  description: "How Hull Eats, Hull Marketplace, and Hull Services process personal data in the United Kingdom.",
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy notice"
      updated="11 May 2026"
      summary="This notice explains how we handle personal data when you use our websites, mobile apps, and related services. It applies to customers, business users, and visitors unless a separate contract says otherwise."
    >
      <h2>1. Who is responsible for your data</h2>
      <p>
        Hull Eats (“we”, “us”) controls the data described in this notice for the platforms and brands we operate,
        including Hull Eats ordering, Hull Marketplace, and Hull Services. When we name a legal entity on our{" "}
        <Link href="/contact">Contact us</Link> page, that entity is the data controller for general customer data. Partner
        businesses remain controllers for their own staff, kitchen CCTV, and information they type into their hub portal.
      </p>

      <h2>2. What we collect and why</h2>
      <h3>Account and profile</h3>
      <p>
        If you create a customer account we collect identifiers such as name, email, phone number, and delivery addresses.
        We use this data to run authentication, prefill checkout, show order history, and help support staff verify you
        when you contact us. The lawful basis is performance of a contract and, for optional marketing, consent where you
        tick a marketing box.
      </p>
      <h3>Orders and payments</h3>
      <p>
        We process order details (items, fulfilment type, delivery address, special instructions) and share what is
        necessary with the store preparing your food and, where applicable, couriers. Payment card data is handled by our
        payment partners (for example Stripe or other providers we enable at checkout) under their own privacy terms. We
        keep transaction references, amounts, and charge status to resolve disputes, prevent fraud, and meet accounting
        rules. Lawful bases: contract, legal obligation, and legitimate interests in fraud prevention.
      </p>
      <h3>Device and technical data</h3>
      <p>
        We collect IP address, browser or app version, and diagnostic logs to secure the service, understand crashes, and
        improve performance. Lawful basis: legitimate interests, and consent where the law requires it for non-essential
        cookies (see our <Link href="/legal/cookies">Cookie notice</Link>).
      </p>
      <h3>Location</h3>
      <p>
        If you allow device location, we use it to sort nearby businesses and show realistic delivery estimates. You can
        turn this off in your device settings. Lawful basis: consent.
      </p>
      <h3>Support and safety</h3>
      <p>
        Emails, chat logs, and call notes may be kept to resolve complaints, enforce our <Link href="/legal/acceptable-use">acceptable use policy</Link>, and co-operate with police or local authorities when the law requires it.
      </p>

      <h2>3. Marketing</h2>
      <p>
        We only send promotional email or SMS if you opt in, except for service messages about your order (for example
        “driver on the way”). You can unsubscribe using the link in any marketing email or by emailing{" "}
        <a href="mailto:hello@hulleats.co.uk">hello@hulleats.co.uk</a>.
      </p>

      <h2>4. Sharing data</h2>
      <p>We share personal data with:</p>
      <ul>
        <li>
          <strong>Stores and couriers</strong> — enough detail to prepare and deliver your order.
        </li>
        <li>
          <strong>Payment processors</strong> — card tokens and fraud signals handled under PCI standards by those
          providers.
        </li>
        <li>
          <strong>Infrastructure providers</strong> — hosting, databases, authentication (including Supabase where used),
          monitoring tools, and email delivery services operating under contract and strict confidentiality.
        </li>
        <li>
          <strong>Authorities</strong> — when required by court order, lawful requests from regulators, or to protect life.
        </li>
      </ul>
      <p>
        We do not sell your personal information as that phrase is commonly understood in UK privacy guidance. Any future
        analytics partnership will be described before it goes live.
      </p>

      <h2>5. International transfers</h2>
      <p>
        Some suppliers host data in the United States or other countries outside the UK. Where that happens we rely on the
        UK International Data Transfer Agreement, EU standard contractual clauses approved for UK use, or adequacy
        regulations. You can ask us which mechanism applies to your data by emailing{" "}
        <a href="mailto:hello@hulleats.co.uk">hello@hulleats.co.uk</a>.
      </p>

      <h2>6. Retention</h2>
      <p>
        Account data stays while your account is active. Order records are normally kept for seven years for tax and
        consumer-law reasons unless a shorter period is justified. Marketing suppression lists are kept permanently so we do
        not contact people who opted out. Logs may roll off automatically after a defined security window.
      </p>

      <h2>7. Your rights</h2>
      <p>Under UK GDPR you may:</p>
      <ul>
        <li>Ask what we hold about you (access).</li>
        <li>Correct inaccurate data.</li>
        <li>Request deletion where no overriding obligation applies.</li>
        <li>Object to processing based on legitimate interests.</li>
        <li>Withdraw consent for optional processing.</li>
        <li>Lodge a complaint with the Information Commissioner’s Office (ICO) at{" "}
          <a href="https://ico.org.uk" rel="noopener noreferrer">
            ico.org.uk
          </a>
          .
        </li>
      </ul>
      <p>
        To exercise a right, email{" "}
        <a href="mailto:hello@hulleats.co.uk?subject=Privacy%20request">hello@hulleats.co.uk</a> with “Privacy request” in
        the subject line. We respond within one calendar month unless the request is unusually complex.
      </p>

      <h2>8. Children</h2>
      <p>
        Our ordering products are not aimed at children under 13. Accounts should be created by adults who pay for the
        household. If you believe we collected a child’s data without appropriate consent, tell us and we will delete it.
      </p>

      <h2>9. Updates</h2>
      <p>
        We revise this notice when features or the law changes. Significant updates appear on this page with a new “Last
        updated” date. Continued use after changes means you acknowledge the revised notice where consent is not required.
      </p>
    </LegalDocument>
  );
}
