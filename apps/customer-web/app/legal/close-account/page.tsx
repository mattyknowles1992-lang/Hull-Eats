import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument } from "../../../src/components/legal-document";

export const metadata: Metadata = {
  title: "Close your account | Hull Eats",
  description: "How to close your Hull Eats customer account and what happens to your data and order history.",
};

export default function CloseAccountPage() {
  return (
    <LegalDocument
      title="Close your account"
      updated="11 May 2026"
      summary="You can leave Hull Eats at any time. Because orders involve restaurants, payment processors, and sometimes legal record-keeping, some information must be retained even after closure."
    >
      <h2>1. Closing through the website or app</h2>
      <ol>
        <li>
          Sign in at <Link href="/account">My account</Link> on the Hull Eats website (the mobile app mirrors the same
          journey once signed in).
        </li>
        <li>
          Use <strong>Sign out</strong> after confirming you have saved any receipts you need — we recommend exporting or
          screenshotting recent orders first.
        </li>
        <li>
          Email <a href="mailto:hello@hulleats.co.uk?subject=Close%20my%20Hull%20Eats%20account">hello@hulleats.co.uk</a>{" "}
          from the email address on your account with the subject line “Close my Hull Eats account”. This proves ownership
          and starts our deletion checklist.
        </li>
      </ol>
      <p>
        Automated self-service deletion inside the app settings may arrive in a future release; until then the email
        route above is the authoritative closure method that creates an audit trail.
      </p>

      <h2>2. What we delete</h2>
      <p>
        After verifying your request we delete or anonymise profile fields such as name, phone, and saved addresses within
        thirty days unless a shorter ICO-aligned timeline applies. Marketing preferences are removed immediately.
      </p>

      <h2>3. What we must keep</h2>
      <p>
        Order histories tied to tax, anti-fraud, or accounting duties may remain in aggregated or pseudonymous form for up
        to seven years. Payment processors retain card transaction metadata under their own policies — we do not store full
        card numbers on Hull Eats servers when checkout uses tokenisation.
      </p>

      <h2>4. Marketplace listings</h2>
      <p>
        If you sell on Hull Marketplace, close outstanding listings before deleting your account or tell us to remove
        them — buyers may still need proof of purchase for returns during statutory periods.
      </p>

      <h2>5. Business hub accounts</h2>
      <p>
        Merchant portal users cannot close through the customer account flow. Hub closure is arranged with Hull Eats
        operations so staff logins, printers, and financial reconciliation shut down cleanly.
      </p>

      <h2>6. Questions</h2>
      <p>
        Read the <Link href="/legal/privacy">Privacy notice</Link> for wider data rights or email{" "}
        <a href="mailto:hello@hulleats.co.uk">hello@hulleats.co.uk</a> if something looks wrong after closure.
      </p>
    </LegalDocument>
  );
}
