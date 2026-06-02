import Link from "next/link";

import { LegalDocument } from "../../../src/components/legal-document";
import { buildStaticPageMetadata } from "../../../src/lib/seo";
import { isAnyExtraHullProductEnabled } from "../../../src/lib/customer-product-flags";

export const metadata = buildStaticPageMetadata({
  title: "Cookie notice",
  description: isAnyExtraHullProductEnabled()
    ? "Cookies and similar technologies used on Hull Eats, Hull Marketplace, and Hull Services websites and apps."
    : "Cookies and similar technologies used on Hull Eats websites and apps.",
  path: "/legal/cookies",
  keywords: ["Hull Eats cookies", "cookie policy UK"],
});

export default function CookiesPage() {
  return (
    <LegalDocument
      title="Cookie notice"
      updated="11 May 2026"
      summary="Cookies are small files stored on your device. We use them to keep you signed in, remember preferences, measure reliability, and — only where you agree — improve how we market Hull Eats."
    >
      <h2>1. Essential cookies</h2>
      <p>
        These are required for security, load balancing, basket continuity, and fraud checks. They cannot be disabled if
        you want the site to function normally. They do not exist to profile you for advertising.
      </p>

      <h2>2. Functional cookies</h2>
      <p>
        We may store UI preferences (such as reduced motion, category filters, or language) so pages feel consistent when
        you return. You can clear them through your browser; some preferences will reset.
      </p>

      <h2>3. Analytics</h2>
      <p>
        Where we enable analytics (for example product usage or performance measurement), we only turn those cookies on
        after you accept them through our banner or settings screen where required by law. Analytics helps us see which
        pages fail under load or where customers abandon checkout.
      </p>

      <h2>4. Marketing pixels</h2>
      <p>
        If we run paid social or search campaigns, partners may set cookies when you arrive from an advert. Those partners
        operate under their own privacy policies. You can opt out of many advertising cookies through industry tools such
        as{" "}
        <a href="https://www.youronlinechoices.com/uk/" rel="noopener noreferrer">
          Your Online Choices
        </a>{" "}
        or device-level “limit ad tracking”.
      </p>

      <h2>5. Mobile apps</h2>
      <p>
        Mobile apps use secure storage and tokens rather than browser cookies, but the same principles apply: essential
        tokens keep your session alive; optional diagnostics help us fix crashes. Refer to your operating system privacy
        controls for reset options.
      </p>

      <h2>6. Managing cookies</h2>
      <p>
        Most browsers let you block third-party cookies or delete all cookies. Blocking everything may break login or
        checkout. For questions about what we currently store, contact{" "}
        <a href="mailto:hello@hulleats.co.uk">hello@hulleats.co.uk</a> or read our{" "}
        <Link href="/legal/privacy">Privacy notice</Link>.
      </p>
    </LegalDocument>
  );
}
