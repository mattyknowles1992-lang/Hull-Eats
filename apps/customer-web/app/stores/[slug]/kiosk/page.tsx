import Link from "next/link";

import { featuredStores, storeMenus } from "../../../../src/lib/demo";
import { KioskMenuClient } from "./kiosk-client";

const fallbackStore = featuredStores[0]!;
const fallbackMenu = storeMenus["loaded-munch-hull"]!;

export default async function StoreKioskPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const store = featuredStores.find((entry) => entry.slug === resolvedParams.slug) ?? fallbackStore;
  const menu = storeMenus[store.slug] ?? fallbackMenu;

  return (
    <main className="kiosk-shell">
      <header className="kiosk-topbar">
        <div className="kiosk-brand">
          <img src="/brand/hull-eats-logo.jpeg" alt="Hull Eats" className="brand-logo brand-logo-small" />
          <div>
            <p className="eyebrow">Self service kiosk</p>
            <h1>{store.name}</h1>
          </div>
        </div>
        <Link href={`/stores/${store.slug}`} className="secondary-button kiosk-soft-exit">
          Store view
        </Link>
      </header>

      <KioskMenuClient storeId={store.id} storeSlug={store.slug} storeName={store.name} categories={menu.categories} />
    </main>
  );
}
