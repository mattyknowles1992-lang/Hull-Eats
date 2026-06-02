import Link from "next/link";

import { LegalDocument } from "../../../src/components/legal-document";
import { buildStaticPageMetadata } from "../../../src/lib/seo";

export const metadata = buildStaticPageMetadata({
  title: "Terms — Hull Eats ordering & account",
  description:
    "Terms of use for browsing menus, placing orders, and managing your Hull Eats customer account in the United Kingdom.",
  path: "/legal/terms-hull-eats",
  keywords: ["Hull Eats terms", "ordering terms Hull", "customer account terms"],
});

export default function TermsHullEatsPage() {
  return (
    <LegalDocument
      title="Terms — Hull Eats ordering & account"
      updated="13 May 2026"
      summary="These terms govern customer accounts, browsing participating businesses on Hull Eats, checkout, payment authorisation, delivery or collection, and support. They do not replace your direct relationship with the restaurant or shop that prepares your food."
    >
      <h2>1. Who these terms cover</h2>
      <p>
        By creating an account, browsing menus, or placing an order through Hull Eats websites or apps, you agree to these
        terms with Hull Eats alongside any separate terms shown at checkout or imposed by your payment provider. If you do
        not agree, do not use the service.
      </p>

      <h2>2. Our role</h2>
      <p>
        Hull Eats provides technology: storefronts, baskets, payments orchestration, notifications, and tracking tools.
        Each participating business is responsible for food safety, allergen accuracy, item descriptions, pricing mistakes
        they publish, and complying with licensing law (including alcohol sales rules). Where Hull Eats operates courier
        assignment, delivery timing estimates depend on road conditions and store readiness; they are targets, not
        guarantees.
      </p>

      <h2>3. Account eligibility and security</h2>
      <p>
        You must give accurate contact details and keep your password confidential. Tell us immediately if you suspect
        unauthorised access. One person should not maintain multiple accounts to abuse promotions or circumvent bans.
      </p>

      <h2>4. Orders form a contract with the business</h2>
      <p>
        When you submit an order and payment authorisation succeeds, your purchase contract is primarily with the store you
        ordered from for the goods described on their menu at that moment. Hull Eats facilitates communication of that
        order and payment settlement according to our arrangements with the business. If the store rejects or cannot
        fulfil the order, we or they will explain next steps (such as refund or substitution) consistent with consumer
        protection law.
      </p>

      <h2>5. Pricing and charges</h2>
      <p>
        Item prices, minimum spends, bag fees, service charges (if any), and delivery fees shown at checkout are set by
        the business or by Hull Eats where clearly labelled (for example a flat courier contribution). Taxes appear as
        applicable. Mistaken pricing that is obviously incorrect may be corrected before acceptance; if your card was
        charged incorrectly we will refund the difference.
      </p>

      <h2 id="alcohol-and-age-restricted-items">6. Alcohol and age-restricted items</h2>
      <p>
        This section applies where your order includes <strong>alcohol</strong> or any other product for which UK law or
        the store requires <strong>age verification</strong> before supply (including, for example, nicotine vapes or other
        age-gated goods offered on a menu).
      </p>
      <h3>6.1 Proof of age at delivery or collection</h3>
      <p>
        <strong>Everyone</strong> receiving the order — regardless of how old they appear — must be able to produce
        valid photo ID <strong>before</strong> age-restricted goods are handed over. Accepted documents are a current{" "}
        <strong>UK driving licence</strong> or <strong>passport</strong> (or any additional document types the store
        specifies at checkout or on the product page). The courier or store representative may refuse to release
        age-restricted items if ID is not shown, is expired, or does not match the person taking delivery.
      </p>
      <h3>6.2 If you cannot provide valid ID</h3>
      <p>
        If valid ID cannot be produced at the door or collection point, the age-restricted goods will <strong>not</strong>{" "}
        be supplied and will be <strong>returned</strong> in line with the store’s process. In that situation:{" "}
        <strong>any delivery fee</strong> you paid for that order attempt <strong>is not refunded</strong> (the delivery
        attempt has still been made); the <strong>purchase price of the age-restricted items</strong> themselves will be{" "}
        <strong>refunded</strong> to your original payment method (or as store policy and consumer law require), subject
        to normal payment-processor timings. Other items in the same order, if any, are fulfilled or refunded according to
        the store’s policy and applicable law.
      </p>
      <p>
        By placing an order that includes alcohol or other age-restricted products, you confirm that the person who will
        receive the delivery or collection is prepared to show acceptable ID on request.
      </p>

      <h2>7. Cancellations and refunds</h2>
      <p>
        Because food is prepared quickly, cancellation windows may be short once preparation starts. If you cancel within
        any permitted window shown at checkout, your payment will be voided or refunded according to the payment
        provider’s timing. If the business cancels (for example stock unavailable), you should receive a full refund unless
        you agree otherwise. Persistent disputes should be raised via <Link href="/contact">Contact us</Link> with your order
        number. Refunds for failed age-restricted delivery are as set out in section 6.
      </p>

      <h2>8. Membership or subscriptions</h2>
      <p>
        If Hull Eats launches subscription offerings (for example delivery memberships), those programmes will have their
        own renewal rules and cooling-off rights compliant with UK consumer rules. Until launched, nothing on this site
        binds you to a recurring fee unless you expressly subscribe when offered.
      </p>

      <h2>9. Acceptable behaviour</h2>
      <p>
        You must follow our <Link href="/legal/acceptable-use">acceptable use policy</Link>. Abuse toward drivers, staff, or
        support agents may lead to account suspension or police referral where threats occur.
      </p>

      <h2>10. Liability</h2>
      <p>
        Nothing in these terms excludes liability that cannot be excluded under English law, including death or personal
        injury caused by negligence or fraud. Otherwise Hull Eats is not liable for indirect loss (lost profits,
        reputation damage, missed meetings). Our aggregate liability for platform faults unrelated to personal injury is
        capped at the total platform fees we retained from your disputed orders in the twelve months before the claim,
        except where higher sums are mandated by law.
      </p>

      <h2>11. Changes</h2>
      <p>
        We may update these terms to reflect new laws or product changes. Material updates appear here with a fresh date.
        Continued ordering after changes constitutes acceptance unless mandatory cooling-off rights apply to a new paid
        feature.
      </p>

      <h2>12. Governing law</h2>
      <p>
        English law applies and courts in England and Wales have jurisdiction, without prejudice to mandatory consumer
        protections if you live elsewhere in the UK.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions about these terms: <Link href="/contact">Contact us</Link> or email{" "}
        <a href="mailto:hello@hulleats.co.uk">hello@hulleats.co.uk</a>.
      </p>
    </LegalDocument>
  );
}
