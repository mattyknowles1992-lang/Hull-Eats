import Link from "next/link";

import { LegalDocument } from "../../../src/components/legal-document";
import { buildStaticPageMetadata } from "../../../src/lib/seo";
import {
  isAnyExtraHullProductEnabled,
  isHullMarketplaceResaleEnabled,
  isHullServicesEnabled,
} from "../../../src/lib/customer-product-flags";

export const metadata = buildStaticPageMetadata({
  title: "Acceptable use policy",
  description: isAnyExtraHullProductEnabled()
    ? "Fair use rules for Hull Eats ordering, Hull Marketplace, Hull Services, and related communications."
    : "Fair use rules for Hull Eats ordering, customer accounts, and related communications.",
  path: "/legal/acceptable-use",
  keywords: ["Hull Eats acceptable use", "platform rules Hull Eats"],
});

export default function AcceptableUsePage() {
  const showMarketplace = isHullMarketplaceResaleEnabled();
  const showServices = isHullServicesEnabled();

  return (
    <LegalDocument
      title="Acceptable use policy"
      updated="11 May 2026"
      summary={
        showMarketplace
          ? "Everyone using Hull Eats products — customers, businesses, couriers, marketplace buyers and sellers — agrees to behave lawfully and respectfully. This policy lists behaviours we prohibit or may investigate."
          : "Everyone using Hull Eats — customers, businesses, and couriers where applicable — agrees to behave lawfully and respectfully. This policy lists behaviours we prohibit or may investigate."
      }
    >
      <h2>1. Safety and legality</h2>
      <p>You must not use Hull Eats to:</p>
      <ul>
        <li>Sell or solicit illegal goods or services.</li>
        <li>Harass, threaten, discriminate against, or stalk anyone.</li>
        <li>
          Circumvent age restrictions on alcohol, nicotine, or adult-only categories — including arranging delivery to
          someone who will not complete mandatory ID checks at the door when required by our{" "}
          <Link href="/legal/terms-hull-eats#alcohol-and-age-restricted-items">ordering terms</Link>.
        </li>
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

      {showMarketplace ? (
        <>
          <h2>4. Marketplace-specific conduct</h2>
          <p>
            Sellers must not relist recalled goods or counterfeit fashion. Buyers must not lure sellers off-platform solely to
            avoid legitimate fees once fees apply.
          </p>
        </>
      ) : null}

      <h2>{showMarketplace ? "5" : "4"}. Enforcement</h2>
      <p>
        We may warn, suspend, or permanently remove accounts, withhold payouts pending investigation, co-operate with law
        enforcement, or pursue civil remedies where proportionate.
      </p>

      <h2>{showMarketplace ? "6" : "5"}. Reporting</h2>
      <p>
        See something unsafe? Email{" "}
        <a href="mailto:hello@hulleats.co.uk?subject=Hull%20Eats%20acceptable%20use%20report">hello@hulleats.co.uk</a> with
        screenshots and order{showMarketplace ? " or listing" : ""} IDs.
      </p>

      <h2>{showMarketplace ? "7" : "6"}. Related documents</h2>
      <p>
        <Link href="/legal/terms-hull-eats">Hull Eats ordering terms</Link>
        {showMarketplace || showServices ? (
          <>
            {showMarketplace ? (
              <>
                , <Link href="/legal/terms-marketplace">Hull Marketplace terms</Link>
              </>
            ) : null}
            {showServices ? (
              <>
                , <Link href="/legal/terms-services">Hull Services terms</Link>
              </>
            ) : null}{" "}
            contain additional product-specific rules.
          </>
        ) : (
          "."
        )}
      </p>
    </LegalDocument>
  );
}
