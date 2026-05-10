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
          <h1 className="register-title">Sign in or create your Hull Eats account.</h1>
          <p className="register-copy">
            New customers can register with name, phone, email, password, and delivery address on{" "}
            <Link href="/register" className="ghost-link">
              Create account
            </Link>
            . Returning customers can sign in — your profile, default address, and marketplace safety status stay in sync
            with the admin console.
          </p>
        </section>

        <section className="feature-panel register-form-panel">
          <AccountClient />
        </section>
      </section>
    </main>
  );
}
