import Link from "next/link";

import { AppSwitcher } from "../../app-switcher";
import { featuredStores, storeMenus } from "../../../src/lib/demo";
import { fetchMarketplaceMenu, fetchMarketplaceStore } from "../../../src/lib/marketplace";
import { CheckoutClient } from "./checkout-client";

const fallbackStore = featuredStores[0]!;

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const demoStore = featuredStores.find((entry) => entry.slug === resolvedParams.slug) ?? fallbackStore;
  const liveStore = await fetchMarketplaceStore(resolvedParams.slug);
  const store = liveStore ?? demoStore;

  const liveMenu = await fetchMarketplaceMenu(resolvedParams.slug);
  const demoMenu = storeMenus[store.slug];
  const menuItems = liveMenu?.categories.flatMap((category) => category.items) ?? demoMenu?.items ?? [];

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

      <CheckoutClient store={store} menuItems={menuItems} />
    </main>
  );
}
