import type { Metadata } from "next";
import Link from "next/link";

import { buildNoIndexMetadata } from "../../../src/lib/seo";
import { AppSwitcher } from "../../app-switcher";
import { AccountOrdersClient } from "./account-orders-client";

export const metadata: Metadata = buildNoIndexMetadata("Your orders");

export default function AccountOrdersPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <AppSwitcher />
        <div className="topbar-actions">
          <Link href="/account" className="primary-button service-back-button">
            My account
          </Link>
        </div>
      </header>

      <section className="register-grid register-grid-simple">
        <section className="feature-panel feature-panel-contrast register-intro">
          <div className="hero-badge register-badge">Order history</div>
          <h1 className="register-title">Your orders</h1>
          <p className="register-copy">All current and previous Hull Eats orders linked to your account.</p>
        </section>

        <section className="feature-panel register-form-panel">
          <AccountOrdersClient />
        </section>
      </section>
    </main>
  );
}
