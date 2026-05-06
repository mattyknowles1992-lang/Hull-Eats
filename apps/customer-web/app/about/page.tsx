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

const timeSavingFeatures = [
  {
    title: "AI phone call assistant",
    saving: "Save 3-8 staff hours a week",
    copy:
      "The assistant can answer common calls, take order details, and handle order-status questions so staff are not constantly pulled away from cooking, packing, and serving.",
    calculation:
      "Example: 25 calls a day x 2 minutes each = 50 minutes/day. Over 6 days, that is 5 hours a week back to the team.",
  },
  {
    title: "Live order tracking",
    saving: "Fewer where-is-my-order calls",
    copy:
      "Customers can see progress instead of calling the shop. That reduces interruptions and keeps the business focused on getting orders out.",
    calculation:
      "Example: removing 15 update calls a night at 90 seconds each saves 22 minutes per shift, plus the stress of constant interruptions.",
  },
  {
    title: "Hull Eats courier service",
    saving: "Deliver faster without managing every driver yourself",
    copy:
      "A dedicated courier flow helps orders move from accepted, to ready, to collected, to delivered. Faster delivery means happier customers and more capacity at busy times.",
    calculation:
      "Example: if quicker courier handoff lets a kitchen process just 4 extra £35 orders a night, that is £140 extra order value per night before costs.",
  },
  {
    title: "Order marketplace",
    saving: "More orders without building your own ordering system",
    copy:
      "The marketplace gives buyers a simple place to discover and order while the business still controls menu, pricing, descriptions, and availability from the hub.",
    calculation:
      "Example: 30 extra marketplace orders a week at £35 average order value creates £1,050 extra weekly order value.",
  },
  {
    title: "Other ordering app manager",
    saving: "One workflow instead of tablet chaos",
    copy:
      "The goal is to pull outside platform orders into one operational view, so staff can accept, prepare, print, and complete orders without jumping between systems.",
    calculation:
      "Example: saving 45 seconds on 80 orders a day is 1 hour a day back, and fewer missed tickets or duplicated checks.",
  },
];

const savingBreakdown = [
  { label: "Staff time saved", value: "5 hrs/week", detail: "from fewer calls and less app switching" },
  { label: "At £12/hour", value: "£60/week", detail: "or roughly £240/month in staff time" },
  { label: "Extra capacity", value: "4 orders/night", detail: "at £35 average order value = £140/night" },
];

export default function AboutHullEatsPage() {
  return (
    <main className="marketing-page">
      <header className="marketing-nav">
        <Link href="/" className="brand-pill">
          <img src="/brand/hull-eats-logo.jpeg" alt="Hull Eats" className="brand-logo-small" />
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

      <section className="savings-band">
        <div>
          <p className="eyebrow">Time saved is money saved</p>
          <h2>We reduce the jobs that slow food businesses down.</h2>
          <p>
            Hull Eats is being built around real operational problems: missed calls, repeated order-update questions,
            slow courier handoff, menu changes, app switching, printing, and busy-shift pressure. The goal is not just
            more orders. It is fewer interruptions, faster fulfilment, and a calmer way to run service.
          </p>
        </div>

        <div className="savings-metrics" aria-label="Example business savings">
          {savingBreakdown.map((item) => (
            <article key={item.label} className="saving-metric-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Feature value</p>
            <h2>Each feature is designed to remove hassle from the shift</h2>
            <p>
              These example savings use simple real-world assumptions. The exact saving depends on call volume, order
              volume, staffing, delivery setup, and how many systems the business currently runs.
            </p>
          </div>
        </div>

        <div className="feature-savings-grid">
          {timeSavingFeatures.map((feature) => (
            <article key={feature.title} className="feature-saving-card">
              <div>
                <span className="pricing-label">{feature.saving}</span>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
              </div>
              <div className="calculation-box">{feature.calculation}</div>
            </article>
          ))}
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
