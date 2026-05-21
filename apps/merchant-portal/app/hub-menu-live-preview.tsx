"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import type { HubMenuSection, HubSettings } from "@hull-eats/types";

import {
  buildMenuPreviewCategories,
  describeMenuAvailability,
  getMenuAvailabilityMode,
  getMenuItemPriceLabel,
} from "./menu-studio-core";

type Props = {
  settings: HubSettings;
  menuSections: HubMenuSection[];
  hasUnsavedChanges: boolean;
};

export function HubMenuLivePreview({ settings, menuSections, hasUnsavedChanges }: Props) {
  const categories = useMemo(() => buildMenuPreviewCategories(menuSections), [menuSections]);
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? "");

  useEffect(() => {
    if (!categories.some((category) => category.id === activeCategoryId)) {
      setActiveCategoryId(categories[0]?.id ?? "");
    }
  }, [categories, activeCategoryId]);

  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? categories[0] ?? null;

  return (
    <aside className="hub-menu-live-preview" style={shell} aria-label="Live menu preview">
      <div style={header}>
        <p style={eyebrow}>Live preview</p>
        <strong style={title}>Customer menu</strong>
        <p style={copy}>
          {hasUnsavedChanges ? "Updates as you edit your draft." : "Matches your saved draft."} Category order follows the
          list on the left.
        </p>
      </div>

      {categories.length === 0 ? (
        <div style={empty}>Add a category and items — they appear here straight away.</div>
      ) : (
        <>
          <div style={categoryRail}>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                style={category.id === activeCategoryId ? chipActive : chip}
                onClick={() => setActiveCategoryId(category.id)}
              >
                {category.name}
                <small>{category.items.length}</small>
              </button>
            ))}
          </div>

          {activeCategory ? (
            <div style={categoryBlock}>
              <h3 style={categoryName}>{activeCategory.name}</h3>
              {activeCategory.items.length === 0 ? (
                <p style={muted}>No live or sold-out items in this category yet.</p>
              ) : (
                <ul style={itemList}>
                  {activeCategory.items.map((item) => {
                    const mode = getMenuAvailabilityMode(item);
                    const availability = describeMenuAvailability(mode);
                    return (
                      <li key={item.id} style={itemRow}>
                        <div style={itemTop}>
                          <strong style={itemTitle}>{item.name}</strong>
                          <span style={itemPrice}>{getMenuItemPriceLabel(item)}</span>
                        </div>
                        {mode === "sold_out" ? <span style={badgeMuted}>{availability.label}</span> : null}
                        {item.optionGroups.length > 0 ? <span style={badge}>Choices</span> : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </>
      )}

      <p style={footer}>
        Store: <strong>{settings.name || "Your hub"}</strong>
      </p>
    </aside>
  );
}

const shell: CSSProperties = {
  display: "grid",
  gap: 12,
  alignContent: "start",
  padding: 14,
  borderRadius: 16,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "linear-gradient(180deg, #f8fbff, #fff)",
  maxHeight: "min(78vh, 800px)",
  overflowY: "auto",
  position: "sticky",
  top: 12,
};

const header: CSSProperties = { display: "grid", gap: 4 };

const eyebrow: CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#0680a6",
};

const title: CSSProperties = { margin: 0, fontSize: "1.05rem" };

const copy: CSSProperties = { margin: 0, fontSize: "0.8rem", color: "#5b6470", lineHeight: 1.45 };

const categoryRail: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 6 };

const chip: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "#fff",
  fontWeight: 700,
  fontSize: "0.78rem",
  cursor: "pointer",
  display: "inline-flex",
  gap: 6,
  alignItems: "center",
};

const chipActive: CSSProperties = { ...chip, borderColor: "rgba(7, 155, 200, 0.4)", background: "rgba(7, 155, 200, 0.12)", color: "#064f68" };

const categoryBlock: CSSProperties = { display: "grid", gap: 8 };

const categoryName: CSSProperties = { margin: 0, fontSize: "0.95rem" };

const itemList: CSSProperties = { margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 };

const itemRow: CSSProperties = {
  padding: 10,
  borderRadius: 12,
  border: "1px solid rgba(15, 17, 21, 0.08)",
  background: "#fff",
  display: "grid",
  gap: 4,
};

const itemTop: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" };

const itemTitle: CSSProperties = { fontSize: "0.88rem" };

const itemPrice: CSSProperties = { fontSize: "0.82rem", fontWeight: 800, whiteSpace: "nowrap" };

const badge: CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 800,
  color: "#064f68",
  background: "rgba(7, 155, 200, 0.12)",
  padding: "2px 8px",
  borderRadius: 999,
  width: "fit-content",
};

const badgeMuted: CSSProperties = { ...badge, color: "#5b6470", background: "rgba(15, 17, 21, 0.08)" };

const empty: CSSProperties = { padding: 12, borderRadius: 12, background: "rgba(15, 17, 21, 0.04)", color: "#5b6470", fontSize: "0.86rem" };

const muted: CSSProperties = { margin: 0, fontSize: "0.84rem", color: "#7a8491" };

const footer: CSSProperties = { margin: 0, fontSize: "0.78rem", color: "#7a8491" };
