import type { Metadata } from "next";
import Link from "next/link";

import { buildNoIndexMetadata } from "../../src/lib/seo";
import { AppSwitcher } from "../app-switcher";
import { AccountClient } from "./account-client";

export const metadata: Metadata = buildNoIndexMetadata("Your account");

export default function AccountPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <AppSwitcher />
        <div className="topbar-actions">
          <Link href="/" className="primary-button service-back-button">
            Back to home
          </Link>
        </div>
      </header>

      <section className="register-grid register-grid-simple">
        <section className="feature-panel feature-panel-contrast register-intro">
          <div className="hero-badge register-badge">Customer account</div>
          <h1 className="register-title">Your Hull Eats account</h1>
          <p className="register-copy">
            Sign in on any phone or computer — same login everywhere. Save addresses, see order history, and reset your
            password anytime.{" "}
            <Link href="/register" className="ghost-link">
              Create account
            </Link>{" "}
            if you are new.
          </p>
        </section>

        <section className="feature-panel register-form-panel">
          <AccountClient />
        </section>
      </section>
    </main>
  );
}
