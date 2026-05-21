"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import type { HubMenuSection, HubSettings } from "@hull-eats/types";

import {
  buildMenuPreviewCategories,
  describeMenuAvailability,
  formatMenuMoney,
  getMenuAvailabilityMode,
  getMenuItemPriceLabel,
} from "./menu-studio-core";

type HubMenuPreviewProps = {
  open: boolean;
  onClose: () => void;
  settings: HubSettings;
  menuSections: HubMenuSection[];
  hasUnsavedChanges: boolean;
};

const defaultHero =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=82";

export function HubMenuPreview({ open, onClose, settings, menuSections, hasUnsavedChanges }: HubMenuPreviewProps) {
  const categories = useMemo(() => buildMenuPreviewCategories(menuSections), [menuSections]);
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? "");

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!categories.some((category) => category.id === activeCategoryId)) {
      setActiveCategoryId(categories[0]?.id ?? "");
    }
  }, [categories, activeCategoryId]);

  if (!open) {
    return null;
  }

  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? categories[0] ?? null;
  const headline = settings.onboardingMessage?.trim() || "Browse your menu, customise items, and checkout on Hull Eats.";
  const address = [settings.city, settings.postcode].filter(Boolean).join(", ");
  const heroImage = settings.heroImageUrl?.trim() || settings.logoImageUrl?.trim() || defaultHero;

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-label="Menu preview">
      <div style={previewShell}>
        <header style={previewTopbar}>
          <div>
            <p style={previewEyebrow}>Draft menu preview</p>
            <strong style={previewTopbarTitle}>{settings.name || "Your store"}</strong>
          </div>
          <button type="button" style={closeButton} onClick={onClose}>
            Close preview
          </button>
        </header>

        <div style={previewBanner}>
          <strong>{hasUnsavedChanges ? "Showing your unsaved draft" : "Showing your current draft"}</strong>
          <p>
            This is how your menu can look on Hull Eats. Customers only see it after you <strong>Save &amp; publish</strong> and
            your store is open on the marketplace.
          </p>
        </div>

        <div style={previewScroll}>
          <section
            style={{
              ...hero,
              backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.2), rgba(8,14,24,0.35)), url(${heroImage})`,
            }}
          >
            <p style={heroEyebrow}>Storefront preview</p>
            <h1 style={heroTitle}>{settings.name || "Your store"}</h1>
            <p style={heroCopy}>{headline}</p>
            <div style={heroMetaRow}>
              {settings.cuisineLabel ? <span style={metaPill}>{settings.cuisineLabel}</span> : null}
              <span style={metaPill}>{settings.etaMinutes} min</span>
              <span style={metaPill}>Delivery from {formatMenuMoney(settings.deliveryFee)}</span>
              {!settings.isOpen ? <span style={metaPillMuted}>Not live on marketplace yet</span> : null}
            </div>
          </section>

          <section style={menuPanel}>
            <div style={menuPanelHeading}>
              <div>
                <h2 style={menuTitle}>Menu</h2>
                <p style={menuSubtitle}>Category order and items match your draft. Hidden items are not shown.</p>
              </div>
            </div>

            {categories.length === 0 ? (
              <div style={emptyCard}>
                <h3>No customer-visible items yet</h3>
                <p>Mark items as live (or sold out) in Menu studio to see them here.</p>
              </div>
            ) : (
              <>
                <div style={categoryRail}>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      style={category.id === activeCategoryId ? categoryChipActive : categoryChip}
                      onClick={() => setActiveCategoryId(category.id)}
                    >
                      {category.name}
                      <small style={{ opacity: 0.8 }}>{category.items.length}</small>
                    </button>
                  ))}
                </div>

                {activeCategory ? (
                  <div style={categoryBlock}>
                    <div style={categoryHeader}>
                      <h3 style={categoryName}>{activeCategory.name}</h3>
                      {activeCategory.description ? <p style={categoryDescription}>{activeCategory.description}</p> : null}
                    </div>

                    {activeCategory.items.length === 0 ? (
                      <p style={emptyCategoryCopy}>No live or sold-out items in this category yet. Hidden items stay in the studio only.</p>
                    ) : (
                    <div style={itemGrid}>
                      {activeCategory.items.map((item) => {
                        const mode = getMenuAvailabilityMode(item);
                        const availability = describeMenuAvailability(mode);

                        return (
                          <article key={item.id} style={itemCard}>
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt="" style={itemImage} />
                            ) : (
                              <div style={itemImagePlaceholder}>{settings.name.slice(0, 2).toUpperCase() || "HE"}</div>
                            )}
                            <div style={itemBody}>
                              <div style={itemTitleRow}>
                                <strong style={itemName}>{item.name}</strong>
                                <span style={itemPrice}>{getMenuItemPriceLabel(item)}</span>
                              </div>
                              {item.description ? <p style={itemDescription}>{item.description}</p> : null}
                              {mode === "sold_out" ? (
                                <span style={soldOutBadge}>{availability.label}</span>
                              ) : item.optionGroups.length > 0 ? (
                                <span style={customisableBadge}>Customisable</span>
                              ) : null}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </section>

          <aside style={detailsPanel}>
            <h2 style={detailsTitle}>Store details</h2>
            <div style={detailRow}>
              <span style={detailLabel}>Minimum order</span>
              <strong>{formatMenuMoney(settings.minimumOrderAmount)}</strong>
            </div>
            {address ? (
              <div style={detailRow}>
                <span style={detailLabel}>Area</span>
                <strong>{address}</strong>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1200,
  background: "rgba(8, 14, 24, 0.72)",
  display: "flex",
  alignItems: "stretch",
  justifyContent: "center",
  padding: "12px",
};

const previewShell: CSSProperties = {
  width: "min(920px, 100%)",
  margin: "0 auto",
  background: "#f4f7fb",
  borderRadius: 20,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 24px 80px rgba(8, 14, 24, 0.35)",
};

const previewTopbar: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "14px 18px",
  background: "#fff",
  borderBottom: "1px solid rgba(15, 17, 21, 0.08)",
};

const previewEyebrow: CSSProperties = {
  margin: 0,
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#0680a6",
  fontWeight: 800,
};

const previewTopbarTitle: CSSProperties = {
  display: "block",
  fontSize: 18,
  color: "#0f1115",
};

const closeButton: CSSProperties = {
  minHeight: 44,
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const previewBanner: CSSProperties = {
  padding: "12px 18px",
  background: "linear-gradient(90deg, rgba(7, 155, 200, 0.14), rgba(245, 180, 0, 0.12))",
  borderBottom: "1px solid rgba(7, 155, 200, 0.2)",
  color: "#0f1115",
};

const previewScroll: CSSProperties = {
  overflow: "auto",
  flex: 1,
  padding: 16,
  display: "grid",
  gap: 16,
};

const hero: CSSProperties = {
  borderRadius: 18,
  minHeight: 220,
  padding: "28px 24px",
  backgroundSize: "cover",
  backgroundPosition: "center",
  color: "#fff",
};

const heroEyebrow: CSSProperties = {
  margin: "0 0 8px",
  fontSize: 12,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  opacity: 0.9,
};

const heroTitle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
  lineHeight: 1.05,
};

const heroCopy: CSSProperties = {
  margin: "0 0 14px",
  maxWidth: 520,
  lineHeight: 1.5,
  opacity: 0.95,
};

const heroMetaRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const metaPill: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.2)",
  fontSize: 13,
  fontWeight: 700,
};

const metaPillMuted: CSSProperties = {
  ...metaPill,
  background: "rgba(255,255,255,0.12)",
  fontStyle: "italic",
};

const menuPanel: CSSProperties = {
  background: "#fff",
  borderRadius: 18,
  border: "1px solid rgba(15, 17, 21, 0.08)",
  padding: 16,
};

const menuPanelHeading: CSSProperties = {
  marginBottom: 12,
};

const menuTitle: CSSProperties = {
  margin: 0,
  fontSize: 22,
};

const menuSubtitle: CSSProperties = {
  margin: "6px 0 0",
  color: "rgba(15, 17, 21, 0.65)",
  fontSize: 14,
};

const categoryRail: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 16,
};

const categoryChip: CSSProperties = {
  minHeight: 40,
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const categoryChipActive: CSSProperties = {
  ...categoryChip,
  borderColor: "rgba(7, 155, 200, 0.45)",
  background: "rgba(7, 155, 200, 0.12)",
  color: "#0680a6",
};

const categoryBlock: CSSProperties = {
  display: "grid",
  gap: 12,
};

const categoryHeader: CSSProperties = {
  display: "grid",
  gap: 4,
};

const categoryName: CSSProperties = {
  margin: 0,
  fontSize: 20,
};

const categoryDescription: CSSProperties = {
  margin: 0,
  color: "rgba(15, 17, 21, 0.65)",
};

const itemGrid: CSSProperties = {
  display: "grid",
  gap: 12,
};

const itemCard: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "96px 1fr",
  gap: 12,
  padding: 12,
  borderRadius: 14,
  border: "1px solid rgba(15, 17, 21, 0.08)",
  background: "#fafbfd",
};

const itemImage: CSSProperties = {
  width: 96,
  height: 96,
  borderRadius: 12,
  objectFit: "cover",
};

const itemImagePlaceholder: CSSProperties = {
  ...itemImage,
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(135deg, #079bc8, #0f1115)",
  color: "#fff",
  fontWeight: 800,
};

const itemBody: CSSProperties = {
  display: "grid",
  gap: 6,
  alignContent: "start",
};

const itemTitleRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "flex-start",
};

const itemName: CSSProperties = {
  fontSize: 16,
};

const itemPrice: CSSProperties = {
  fontWeight: 800,
  color: "#0680a6",
  whiteSpace: "nowrap",
};

const itemDescription: CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "rgba(15, 17, 21, 0.7)",
  lineHeight: 1.45,
};

const soldOutBadge: CSSProperties = {
  justifySelf: "start",
  padding: "4px 8px",
  borderRadius: 8,
  background: "rgba(180, 35, 24, 0.1)",
  color: "#9f1239",
  fontSize: 12,
  fontWeight: 800,
};

const customisableBadge: CSSProperties = {
  ...soldOutBadge,
  background: "rgba(7, 155, 200, 0.1)",
  color: "#0680a6",
};

const emptyCategoryCopy: CSSProperties = {
  margin: 0,
  padding: "12px 14px",
  borderRadius: 12,
  background: "rgba(15, 17, 21, 0.04)",
  color: "rgba(15, 17, 21, 0.65)",
  fontSize: 14,
};

const emptyCard: CSSProperties = {
  padding: 24,
  borderRadius: 14,
  border: "1px dashed rgba(15, 17, 21, 0.18)",
  textAlign: "center",
  color: "rgba(15, 17, 21, 0.7)",
};

const detailsPanel: CSSProperties = {
  background: "#fff",
  borderRadius: 18,
  border: "1px solid rgba(15, 17, 21, 0.08)",
  padding: 16,
};

const detailsTitle: CSSProperties = {
  margin: "0 0 12px",
  fontSize: 18,
};

const detailRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "8px 0",
  borderBottom: "1px solid rgba(15, 17, 21, 0.06)",
};

const detailLabel: CSSProperties = {
  color: "rgba(15, 17, 21, 0.6)",
  fontSize: 14,
};
