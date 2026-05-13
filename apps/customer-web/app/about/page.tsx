import type { Metadata } from "next";
import Link from "next/link";

import { AppSwitcher } from "../app-switcher";

export const metadata: Metadata = {
  title: "About Hull Eats | For customers",
  description:
    "Hull Eats helps you discover Hull takeaways, cafés, shops, and more — order online, pay at checkout, and track your food in one place.",
};

const customerBasics = [
  "Browse live menus from local kitchens and shops, with clear prices before you add anything to your basket.",
  "Check out in a few steps. Delivery fees and minimum spends are set by each business and shown up front on the order screen.",
  "Create an account to save your details and addresses, then sign in on the website or the Hull Eats app with the same login.",
  "Track your order when tracking is available for that store, so you spend less time guessing when dinner will arrive.",
];

const alsoOnHullEats = [
  {
    eyebrow: "Hull Marketplace",
    lead: "Local listings",
    copy:
      "A separate corner of Hull Eats for local buying and selling — think second-hand finds, homeware, and neighbourhood listings. It uses the same account and the same care for trust and safety.",
    href: "/marketplace",
    cta: "Browse marketplace",
  },
  {
    eyebrow: "Hull Services",
    lead: "Local trades",
    copy:
      "Discover local trades and professionals — cleaners, gardeners, repairs, and more — as listings grow. Again, one Hull Eats account across food, marketplace, and services where we turn those areas on.",
    href: "/services",
    cta: "Explore Hull Services",
  },
];

export default function AboutHullEatsPage() {
  return (
    <main className="marketing-page">
      <header className="marketing-nav">
        <div className="brand-pill">
          <AppSwitcher />
          <div>
            <p className="eyebrow">Hull Eats</p>
            <p className="brand-title">Local food and local favourites, ordered your way.</p>
          </div>
        </div>

        <nav className="marketing-nav-actions" aria-label="About page sections">
          <a href="#for-you" className="glass-button">
            For you
          </a>
          <a href="#more-hull-eats" className="glass-button">
            Marketplace &amp; services
          </a>
          <Link href="/contact" className="primary-button">
            Help &amp; contact
          </Link>
        </nav>
      </header>

      <section className="marketing-hero">
        <div className="marketing-hero-copy">
          <p className="eyebrow">Built for Hull</p>
          <h1>Order from Hull businesses you already love — and find new ones along the way.</h1>
          <p>
            Hull Eats is your home for takeaway and shop orders in Hull: one place to search menus, customise dishes when
            a store offers options, pay securely, and follow your order. We keep the experience simple on purpose; the
            kitchen still cooks your meal, and each store sets its own menu, prices, and delivery rules.
          </p>
          <div className="button-row">
            <Link href="/" className="primary-button">
              Browse &amp; order
            </Link>
            <Link href="/account" className="secondary-button">
              My account
            </Link>
          </div>
        </div>

        <div className="marketing-snapshot">
          <span className="snapshot-label">For customers</span>
          <strong>Discover. Order. Track.</strong>
          <p>
            Use Hull Eats on the web or in the app. Your basket, addresses, and order history stay with your account so
            repeat orders feel quicker.
          </p>
        </div>
      </section>

      <section id="for-you" className="marketing-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">What you get</p>
            <h2>Everything we build on the customer side is for diners, families, and late-night snack runs</h2>
            <p>
              You do not need to know how restaurants run their back office. You only need a clear menu, honest totals at
              checkout, and a fair way to get help if something goes wrong.
            </p>
          </div>
        </div>

        <div className="pillar-grid">
          <article className="pillar-card">
            <span className="pillar-index">01</span>
            <h3>Ordering</h3>
            <ul>
              {customerBasics.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </article>

          <article className="pillar-card">
            <span className="pillar-index">02</span>
            <h3>Trust &amp; privacy</h3>
            <ul>
              <li>
                We handle sign-in and personal details so checkout and support work properly. Read the full picture in our{" "}
                <Link href="/legal/privacy">privacy notice</Link>.
              </li>
              <li>
                Terms for ordering and your account are written for shoppers — see{" "}
                <Link href="/legal/terms-hull-eats">terms for Hull Eats ordering</Link>.
              </li>
              <li>
                Want to leave? You can request account closure — see{" "}
                <Link href="/legal/close-account">close your account</Link>.
              </li>
            </ul>
          </article>

          <article className="pillar-card">
            <span className="pillar-index">03</span>
            <h3>Help</h3>
            <ul>
              <li>
                Questions about a charge, a missing item, or a late order? Start with the store where you ordered, then
                reach our team through <Link href="/contact">contact us</Link> if you still need support.
              </li>
              <li>
                Run a takeaway or shop and want to join Hull Eats? That is a separate conversation — see{" "}
                <Link href="/partner">partner with us</Link> (we will point you to the right team).
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section id="more-hull-eats" className="savings-band">
        <div>
          <p className="eyebrow">Beyond takeaway</p>
          <h2>Marketplace and services use the same Hull Eats account</h2>
          <p>
            Food is where most people start, but Hull Eats also hosts other local experiences. Each area has its own terms
            so you always know what you are agreeing to.
          </p>
        </div>

        <div className="savings-metrics" aria-label="Other Hull Eats areas">
          {alsoOnHullEats.map((block) => (
            <article key={block.eyebrow} className="saving-metric-card">
              <span>{block.eyebrow}</span>
              <strong>{block.lead}</strong>
              <p>{block.copy}</p>
              <div className="about-band-cta">
                <Link href={block.href} className="secondary-button">
                  {block.cta}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="contact-band">
        <div>
          <p className="eyebrow">We are here</p>
          <h2>Help with an order, your account, or a listing</h2>
          <p>
            Pick the channel that fits: customer support, privacy requests, marketplace safety, or business onboarding —
            all routed from one contact page.
          </p>
        </div>

        <div className="contact-actions">
          <Link className="primary-button" href="/contact">
            Contact Hull Eats
          </Link>
          <Link className="secondary-button" href="/legal">
            Legal &amp; policies
          </Link>
          <Link href="/" className="glass-button">
            Back to marketplace
          </Link>
        </div>
      </section>
    </main>
  );
}
