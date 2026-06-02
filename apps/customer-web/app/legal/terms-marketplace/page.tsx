import Link from "next/link";

import { LegalDocument } from "../../../src/components/legal-document";
import { buildStaticPageMetadata } from "../../../src/lib/seo";
import { isHullMarketplaceResaleEnabled } from "../../../src/lib/customer-product-flags";

export const metadata = buildStaticPageMetadata({
  title: "Terms — Hull Marketplace",
  description: "Terms for listing, buying, and communicating through Hull Marketplace classified-style listings.",
  path: "/legal/terms-marketplace",
  noIndex: !isHullMarketplaceResaleEnabled(),
});

export default function TermsMarketplacePage() {
  return (
    <LegalDocument
      title="Terms — Hull Marketplace"
      updated="11 May 2026"
      summary="Hull Marketplace connects local buyers and sellers. Hull Eats hosts listings and messaging tools but does not take title to goods unless we expressly launch managed fulfilment in future."
    >
      <h2>1. Nature of the marketplace</h2>
      <p>
        Hull Marketplace lists second-hand goods, local creations, and occasional commercial inventory published by
        independent sellers. Unless we clearly badge an item as “sold by Hull Eats”, you contract directly with the seller
        for the item, inspection, and payment arrangement described in their listing.
      </p>

      <h2>2. Seller obligations</h2>
      <p>Sellers must:</p>
      <ul>
        <li>Own the item or have permission to sell it.</li>
        <li>Describe condition honestly including faults.</li>
        <li>Not list prohibited items (weapons, recalled goods, stolen property, counterfeit brands, illegal substances).</li>
        <li>Meet buyers safely and legally — preferably public daytime locations if collecting in person.</li>
        <li>Refund where Consumer Contracts Regulations apply to distance selling of qualifying goods.</li>
      </ul>

      <h2>3. Buyer obligations</h2>
      <p>
        Inspect items before handing over cash where practical. Use secure payment methods supported by the listing flow.
        Report scams or harassment immediately via <Link href="/contact">Contact us</Link>. Do not use Hull Marketplace to
        launder money or evade tax.
      </p>

      <h2>4. Fees</h2>
      <p>
        Listing fees, success fees, or promotional boosts will appear before you publish when charging goes live. Until
        then, experimental listings may be free during pilot phases — check on-screen notices.
      </p>

      <h2>5. Disputes between users</h2>
      <p>
        Start by messaging the other party courteously. If unresolved, gather evidence (photos, chat logs, receipts) and
        email <a href="mailto:hello@hulleats.co.uk">hello@hulleats.co.uk</a>. We may suspend accounts that repeatedly harm
        others but we are not obliged to act as a court. Small claims court remains available for monetary disputes within
        its limits.
      </p>

      <h2>6. Content licence</h2>
      <p>
        By uploading photos or descriptions you grant Hull Eats a worldwide, royalty-free licence to display them on our
        properties for the listing duration plus reasonable archival for dispute investigation.
      </p>

      <h2>7. Moderation</h2>
      <p>
        We may remove listings or accounts breaching our <Link href="/legal/acceptable-use">acceptable use policy</Link> or
        applicable law without prior warning where safety demands it.
      </p>

      <h2>8. Liability</h2>
      <p>
        Hull Eats does not warrant each listing’s accuracy. To the extent permitted by law we disclaim indirect losses
        arising from user-to-user trades while still honouring mandatory consumer rights where Hull Eats itself sells to
        you.
      </p>

      <h2>9. Law</h2>
      <p>English law governs these marketplace-specific terms unless mandatory protections for UK consumers say otherwise.</p>
    </LegalDocument>
  );
}
