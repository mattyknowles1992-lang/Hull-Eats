import Link from "next/link";

import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand-pill">
          <Link href="/" className="icon-button">
            Back
          </Link>
          <div className="brand-logo-cluster">
            <Link href="/" className="brand-logo-link" aria-label="Hull Eats marketplace">
              <img src="/brand/hull-eats-logo.jpeg" alt="Hull Eats" className="brand-logo brand-logo-small" />
            </Link>
            <Link href="/services" className="brand-logo-link" aria-label="Hull Services">
              <img src="/brand/hull-services-logo.png" alt="Hull Services" className="brand-logo brand-logo-small" />
            </Link>
          </div>
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

      <section className="register-grid register-grid-simple">
        <section className="feature-panel feature-panel-contrast register-intro">
          <div className="hero-badge register-badge">Create account</div>
          <h1 className="register-title">Create your account, add your address, and start ordering.</h1>
          <p className="register-copy">
            Fill in your details below. We will create your Hull Eats account and ask you to verify your email after sign up.
          </p>

          <div className="register-step-list" aria-label="Signup steps">
            <article className="register-step">
              <strong>1. Enter your details</strong>
              <p>Name, mobile number, email, password, and delivery address.</p>
            </article>
            <article className="register-step">
              <strong>2. Pick your plan</strong>
              <p>Choose pay as you go or Hull Eats+ for free delivery.</p>
            </article>
            <article className="register-step">
              <strong>3. Verify your email</strong>
              <p>You can create your account now, but Hull Eats+ stays inactive until verified.</p>
            </article>
          </div>

          <div className="register-note">
            No card details are stored by Hull Eats. Payments and subscriptions are handled by Stripe.
          </div>
        </section>

        <section className="feature-panel register-form-panel">
          <div className="section-heading compact">
            <div>
              <h2>Create your Hull Eats account</h2>
              <p>Complete the form below to continue.</p>
            </div>
          </div>

          <RegisterForm />

          <p className="form-footer" style={{ marginTop: 18 }}>
            Already have an account? <Link href="/" className="ghost-link">Return to storefront</Link>
          </p>
        </section>
      </section>
    </main>
  );
}
