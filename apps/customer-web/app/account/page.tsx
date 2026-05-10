import Link from "next/link";

import { AppSwitcher } from "../app-switcher";
import { AccountClient } from "./account-client";

export default function AccountPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <AppSwitcher />
        <div className="topbar-actions">
          <Link href="/" className="primary-button service-back-button">
            Back to Hull Eats Marketplace
          </Link>
        </div>
      </header>

      <section className="register-grid register-grid-simple">
        <section className="feature-panel feature-panel-contrast register-intro">
          <div className="hero-badge register-badge">Customer account</div>
          <h1 className="register-title">Sign in once, then reuse your saved details.</h1>
          <p className="register-copy">
            Your account stores your profile, default address, Hull Eats+ status, order history, and marketplace safety
            status so the website and app can stay in sync.
          </p>
        </section>

        <section className="feature-panel register-form-panel">
          <AccountClient />
        </section>
      </section>
    </main>
  );
}
