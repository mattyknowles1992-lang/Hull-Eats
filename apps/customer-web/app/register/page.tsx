import Link from "next/link";

import { AppSwitcher } from "../app-switcher";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <main className="shell">
      <header className="topbar register-page-topbar">
        <div className="brand-pill register-page-brand-pill">
          <Link href="/" className="icon-button">
            Back
          </Link>
          <AppSwitcher />
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
            Fill in your details below. We will create your Hull Eats account so you can sign in from My account straight away.
          </p>

          <div className="register-step-list" aria-label="Signup steps">
            <article className="register-step">
              <strong>1. Enter your details</strong>
              <p>Name, mobile number, email, password, and delivery address.</p>
            </article>
            <article className="register-step">
              <strong>2. Start ordering</strong>
              <p>Use My account to manage your profile and saved addresses whenever you order.</p>
            </article>
          </div>

          <div className="register-note">
            No card details are stored when you register. You pay securely at checkout when you place an order.
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
            Already have an account? <Link href="/account" className="ghost-link">Sign in</Link>
          </p>
        </section>
      </section>
    </main>
  );
}
