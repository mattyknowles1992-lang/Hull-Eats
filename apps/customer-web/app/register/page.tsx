import Link from "next/link";

import { RegisterForm } from "./register-form";

const storedDetails = [
  "Full name",
  "Phone number",
  "Email address",
  "Saved delivery address",
  "Selected delivery plan",
  "Promo code used at signup",
  "Email verification status",
  "Order history and payment references",
];

export default function RegisterPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand-pill">
          <Link href="/" className="icon-button">
            Back
          </Link>
          <img src="/brand/hull-eats-logo.png" alt="Hull Eats" className="brand-logo brand-logo-small" />
          <div>
            <p className="eyebrow">Customer account</p>
            <p className="brand-title">Create your Hull Eats account</p>
          </div>
        </div>

        <div className="topbar-actions">
          <Link href="/" className="glass-button">
            Browse stores
          </Link>
        </div>
      </header>

      <section className="register-grid">
        <div className="content-stack">
          <section className="feature-panel register-hero">
            <div className="hero-badge">New account</div>
            <h1 className="hero-title">Register once, save your address, then choose plan or pay as you go.</h1>
            <p className="hero-subtitle">
              Customers can sign up with their details, set a default delivery address, and decide whether they want
              standard delivery charging or Hull Eats+ free delivery membership.
            </p>

            <div className="hero-meta">
              <span className="meta-pill">Email stays unverified until confirmed</span>
              <span className="meta-pill">Hull Eats+ requires verified email</span>
              <span className="meta-pill">No card details stored by Hull Eats</span>
            </div>
          </section>

          <section className="feature-panel">
            <div className="section-heading compact">
              <div>
                <h2>What we store</h2>
                <p>Only the customer details needed for ordering, addresses, account management, and subscriptions.</p>
              </div>
            </div>

            <div className="collection-list">
              {storedDetails.map((detail) => (
                <article className="collection-card" key={detail}>
                  <h3>{detail}</h3>
                  <p>Saved in your customer account so the marketplace and checkout can recognise you across orders.</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="sidebar-stack">
          <section className="feature-panel">
            <div className="section-heading compact">
              <div>
                <h2>Register details</h2>
                <p>Designed to map cleanly into Supabase Auth and your customer profile schema.</p>
              </div>
            </div>

            <RegisterForm />

            <p className="form-footer" style={{ marginTop: 18 }}>
              Already have an account? <Link href="/" className="ghost-link">Return to storefront</Link>
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
