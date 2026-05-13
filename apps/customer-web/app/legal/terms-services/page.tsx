import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument } from "../../../src/components/legal-document";

export const metadata: Metadata = {
  title: "Terms — Hull Services | Hull Eats",
  description: "Terms for discovering and booking local services listed under Hull Services.",
};

export default function TermsServicesPage() {
  return (
    <LegalDocument
      title="Terms — Hull Services"
      updated="11 May 2026"
      summary="Hull Services showcases tradespeople and professionals in Hull. Unless stated otherwise, the service contract is between you and the provider; Hull Eats helps you discover them and may provide scheduling or payment rails where enabled."
    >
      <h2>1. Scope</h2>
      <p>
        Hull Services pages highlight gardeners, cleaners, vehicle technicians, groomers, tutors, and similar categories
        as they join the platform. Features evolve — browse surfaces today may expand into integrated bookings tomorrow.
        These terms apply whenever you use Hull Services branded discovery or checkout journeys we operate.
      </p>

      <h2>2. Relationship with providers</h2>
      <p>
        Providers remain responsible for workmanship, insurance, qualifications (Gas Safe, electrical Part P, etc. where
        relevant), and keeping appointments. Verify licences independently before high-risk work. Hull Eats does not
        guarantee outcomes unless we sell you a Hull-managed bundled service expressly labelled as such.
      </p>

      <h2>3. Quotes and payments</h2>
      <p>
        Prices shown may be indicative (“from £…”). Final quotes occur after the provider assesses the job. Where payment
        runs through Hull Eats, refunds follow the refund route of the underlying payment provider unless mandatory UK law
        grants stronger rights.
      </p>

      <h2>4. Cancellations</h2>
      <p>
        Each provider may publish cancellation windows or restocking fees for parts ordered on your behalf. Read those
        terms before confirming a booking. Hull Eats may charge an administrative fee only where disclosed upfront.
      </p>

      <h2>5. Complaints</h2>
      <p>
        Attempt resolution with the provider first. If safety or repeated poor behaviour concerns you, email{" "}
        <a href="mailto:hello@hulleats.co.uk">hello@hulleats.co.uk</a> with job references and photographs.
      </p>

      <h2>6. Liability</h2>
      <p>
        Nothing here excludes liability that cannot be excluded for death or personal injury caused by negligence.
        Otherwise Hull Eats’ liability for intermediation faults is limited to rebooking assistance or refund of platform
        fees we charged for that job — except where consumer protection law demands full reimbursement from us directly.
      </p>

      <h2>7. Other policies</h2>
      <p>
        Our general <Link href="/legal/acceptable-use">acceptable use policy</Link> and{" "}
        <Link href="/legal/privacy">privacy notice</Link> also apply.
      </p>
    </LegalDocument>
  );
}
