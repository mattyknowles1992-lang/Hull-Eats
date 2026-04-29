import Link from "next/link";

const buyerOffers = [
  "Order from Hull restaurants, takeaways, cafes, dessert spots, and shops in one local marketplace.",
  "Track orders from checkout through preparation and delivery as the delivery operation comes online.",
  "Use Hull Eats+ for launch-period delivery perks and account benefits once subscriptions are enabled.",
];

const businessOffers = [
  "A secure hub portal for menus, pricing, descriptions, options, delivery settings, users, and live item control.",
  "Optional Hull Eats marketplace exposure, delivery support, order printing, paperless workflows, and future add-ons.",
  "One login for each business hub, with Hull Eats admin support for setup, onboarding, and operational changes.",
];

const courierOffers = [
  "A dedicated courier app for Hull Eats couriers as our own delivery operation grows.",
  "Delivery status updates for pickup, handoff, and completed orders.",
  "A modular delivery-only option for businesses that want Hull Eats courier support without needing every product.",
];

export default function AboutHullEatsPage() {
  return (
    <main className="marketing-page">
      <header className="marketing-nav">
        <Link href="/" className="brand-pill">
          <img src="/brand/hull-eats-logo.png" alt="Hull Eats" className="brand-logo-small" />
          <div>
            <p className="eyebrow">Hull Eats</p>
            <p className="brand-title">Local food, local software, local delivery.</p>
          </div>
        </Link>

        <nav className="marketing-nav-actions" aria-label="Hull Eats website navigation">
          <a href="#offers" className="glass-button">
            What we offer
          </a>
          <a href="#pricing" className="glass-button">
            Pricing
          </a>
          <a href="#contact" className="primary-button">
            Contact us
          </a>
        </nav>
      </header>

      <section className="marketing-hero">
        <div className="marketing-hero-copy">
          <p className="eyebrow">Built for Hull</p>
          <h1>Hull Eats is a local marketplace and operations platform for food businesses.</h1>
          <p>
            We connect buyers, businesses, and Hull Eats couriers through three systems that can work together or stand
            alone: the buyer marketplace, the business hub portal, and the courier app.
          </p>
          <div className="button-row">
            <a href="#contact" className="primary-button">
              Start a conversation
            </a>
            <Link href="/" className="secondary-button">
              View marketplace
            </Link>
          </div>
        </div>

        <div className="marketing-snapshot">
          <span className="snapshot-label">Three core pillars</span>
          <strong>Marketplace. Portal. Couriers.</strong>
          <p>
            Businesses can use the full Hull Eats stack, or start with the specific system they need first.
          </p>
        </div>
      </section>

      <section id="offers" className="marketing-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">What we offer</p>
            <h2>Separate systems that work together</h2>
            <p>
              Hull Eats is designed so each part can grow without trapping businesses into one fixed setup.
            </p>
          </div>
        </div>

        <div className="pillar-grid">
          <article className="pillar-card">
            <span className="pillar-index">01</span>
            <h3>Marketplace for buyers</h3>
            <ul>
              {buyerOffers.map((offer) => (
                <li key={offer}>{offer}</li>
              ))}
            </ul>
          </article>

          <article className="pillar-card">
            <span className="pillar-index">02</span>
            <h3>Portal for businesses</h3>
            <ul>
              {businessOffers.map((offer) => (
                <li key={offer}>{offer}</li>
              ))}
            </ul>
          </article>

          <article className="pillar-card">
            <span className="pillar-index">03</span>
            <h3>Courier app for our couriers</h3>
            <ul>
              {courierOffers.map((offer) => (
                <li key={offer}>{offer}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section id="pricing" className="marketing-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Pricing</p>
            <h2>Simple launch pricing while we onboard local partners</h2>
            <p>
              Exact add-on prices are confirmed business by business during setup, especially where delivery support,
              printing, kiosk software, or AI phone handling is required.
            </p>
          </div>
        </div>

        <div className="pricing-grid">
          <article className="pricing-card is-featured">
            <span className="pricing-label">Marketplace orders</span>
            <strong>20%</strong>
            <p>Commission on completed marketplace orders, based on the order value agreed during onboarding.</p>
          </article>

          <article className="pricing-card">
            <span className="pricing-label">Business hub portal</span>
            <strong>Launch partner setup</strong>
            <p>Menu setup, hub access, item control, pricing, descriptions, and business settings.</p>
          </article>

          <article className="pricing-card">
            <span className="pricing-label">Optional extras</span>
            <strong>Quoted per business</strong>
            <p>Courier support, printing, paperless workflows, multi-app management, kiosk software, and AI phone handling.</p>
          </article>
        </div>
      </section>

      <section id="contact" className="contact-band">
        <div>
          <p className="eyebrow">Contact us</p>
          <h2>Want your business on Hull Eats?</h2>
          <p>
            Tell us who you are, what you sell, and whether you need marketplace orders, a business portal, delivery
            support, or the full Hull Eats setup.
          </p>
        </div>

        <div className="contact-actions">
          <a className="primary-button" href="mailto:hello@hulleats.co.uk?subject=Hull%20Eats%20business%20enquiry">
            Email Hull Eats
          </a>
          <Link href="/" className="secondary-button">
            Back to marketplace
          </Link>
        </div>
      </section>
    </main>
  );
}
