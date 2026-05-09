import Link from "next/link";

import { AppSwitcher } from "../app-switcher";
import { marketplaceCategories } from "../../src/lib/marketplace-categories";

export default function HullMarketplacePage() {
  return (
    <main className="shell customer-marketplace">
      <header className="topbar">
        <AppSwitcher />

        <div className="topbar-actions">
          <Link href="/" className="primary-button service-back-button">
            Back to Hull Eats Marketplace
          </Link>
        </div>
      </header>

      <section className="services-hero marketplace-scene">
        <div className="services-hero-copy">
          <p className="hero-badge">Hull Marketplace</p>
          <h1>More local categories are coming.</h1>
          <p>Hull Marketplace will sit alongside Hull Eats and Hull Services for local shops, products, and marketplace categories.</p>
        </div>
      </section>

      <section className="marketplace-panel marketplace-scene">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Marketplace categories</p>
            <h2>Using the current category system for now</h2>
            <p>These categories will become the Hull Marketplace entry points as the wider product marketplace is separated from takeaway ordering.</p>
          </div>
        </div>

        <nav className="marketplace-category-rail" aria-label="Hull Marketplace categories">
          {marketplaceCategories.map((category) => (
            <Link key={category.slug} href={`/categories/${category.slug}`} className="marketplace-category-chip">
              <span className="marketplace-category-chip-image" style={{ backgroundImage: `url(${category.imageUrl})` }} />
              <span>{category.label}</span>
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
