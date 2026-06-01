import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buildNoIndexMetadata } from "../../../src/lib/seo";
import { AppSwitcher } from "../../app-switcher";
import { fetchMarketplaceMenu, fetchMarketplaceStore } from "../../../src/lib/marketplace";
import { parseFulfillmentPreference } from "../../../src/lib/fulfillment-preference";
import { CheckoutClient } from "./checkout-client";

export const metadata: Metadata = buildNoIndexMetadata("Checkout");

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ fulfillment?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const initialFulfillment = parseFulfillmentPreference(resolvedSearchParams.fulfillment);
  const liveStore = await fetchMarketplaceStore(resolvedParams.slug);
  const store = liveStore;
  if (!store) {
    notFound();
  }

  const liveMenu = await fetchMarketplaceMenu(resolvedParams.slug);
  const menuItems = liveMenu?.categories.flatMap((category) => category.items) ?? [];

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

      <CheckoutClient store={store} menuItems={menuItems} initialFulfillment={initialFulfillment} />
    </main>
  );
}
