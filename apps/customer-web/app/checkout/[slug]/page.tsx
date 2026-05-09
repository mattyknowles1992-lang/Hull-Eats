import Link from "next/link";

import { AppSwitcher } from "../../app-switcher";
import { featuredStores, storeMenus } from "../../../src/lib/demo";
import { CheckoutClient } from "./checkout-client";

const fallbackStore = featuredStores[0]!;

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const store = featuredStores.find((entry) => entry.slug === resolvedParams.slug) ?? fallbackStore;
  const menu = storeMenus[store.slug];

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand-pill">
          <Link href={`/stores/${store.slug}`} className="icon-button">
            Back
          </Link>
          <AppSwitcher />
          <div>
            <p className="eyebrow">Checkout</p>
            <p className="brand-title">{store.name}</p>
          </div>
        </div>

        <div className="topbar-actions">
          <Link href="/" className="glass-button">
            Browse stores
          </Link>
        </div>
      </header>

      <CheckoutClient store={store} menuItems={menu?.items ?? []} />
    </main>
  );
}
