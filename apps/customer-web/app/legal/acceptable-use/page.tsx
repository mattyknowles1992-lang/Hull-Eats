import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument } from "../../../src/components/legal-document";

export const metadata: Metadata = {
  title: "Acceptable use policy | Hull Eats",
  description: "Fair use rules for Hull Eats ordering, Hull Marketplace, Hull Services, and related communications.",
};

export default function AcceptableUsePage() {
  return (
    <LegalDocument
      title="Acceptable use policy"
      updated="11 May 2026"
      summary="Everyone using Hull Eats products — customers, businesses, couriers, marketplace buyers and sellers — agrees to behave lawfully and respectfully. This policy lists behaviours we prohibit or may investigate."
    >
      <h2>1. Safety and legality</h2>
      <p>You must not use Hull Eats to:</p>
      <ul>
        <li>Sell or solicit illegal goods or services.</li>
        <li>Harass, threaten, discriminate against, or stalk anyone.</li>
        <li>Circumvent age restrictions on alcohol, nicotine, or adult-only categories.</li>
        <li>Distribute malware, scrape our systems beyond permitted indexing, or attack infrastructure.</li>
        <li>Create fake reviews or manipulate ratings.</li>
      </ul>

      <h2>2. Accounts</h2>
      <p>
        One natural person or organisation should not operate sock-puppet accounts to abuse vouchers or evade suspensions.
        Business hub credentials belong to the licensed premises — share internally using roles we provide instead of
        sharing passwords broadly.
      </p>

      <h2>3. Payments</h2>
      <p>
        Do not use stolen cards or initiate chargebacks solely to obtain free food. Financial crime referrals may follow.
      </p>

      <h2>4. Marketplace-specific conduct</h2>
      <p>
        Sellers must not relist recalled goods or counterfeit fashion. Buyers must not lure sellers off-platform solely to
        avoid legitimate fees once fees apply.
      </p>

      <h2>5. Enforcement</h2>
      <p>
        We may warn, suspend, or permanently remove accounts, withhold payouts pending investigation, co-operate with law
        enforcement, or pursue civil remedies where proportionate.
      </p>

      <h2>6. Reporting</h2>
      <p>
        See something unsafe? Email{" "}
        <a href="mailto:hello@hulleats.co.uk?subject=Hull%20Eats%20acceptable%20use%20report">hello@hulleats.co.uk</a> with
        screenshots and order or listing IDs.
      </p>

      <h2>7. Related documents</h2>
      <p>
        <Link href="/legal/terms-hull-eats">Hull Eats ordering terms</Link>,{" "}
        <Link href="/legal/terms-marketplace">Hull Marketplace terms</Link>, and{" "}
        <Link href="/legal/terms-services">Hull Services terms</Link> contain additional product-specific rules.
      </p>
    </LegalDocument>
  );
}
