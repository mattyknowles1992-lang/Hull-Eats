"use client";

import type { DragEvent } from "react";
import { useRef } from "react";

import type { HubMenuSection } from "@hull-eats/types";
import { isHubMenuStaffLibrarySection } from "@hull-eats/types";

type HubMenuCategoryTabsProps = {
  customerSections: HubMenuSection[];
  extrasSection: HubMenuSection | null;
  burgerPartsSection: HubMenuSection | null;
  kebabPartsSection: HubMenuSection | null;
  mealSection: HubMenuSection | null;
  selectedSectionId: string | null;
  readOnly: boolean;
  onSelectSection: (sectionId: string) => void;
  onReorderCategory: (sectionId: string, toIndex: number) => void;
  burgerPartsTabMeta?: string;
  kebabPartsTabMeta?: string;
};

function TabGrip({
  label,
  draggable,
  onDragStart,
  onDragEnd,
}: {
  label: string;
  draggable: boolean;
  onDragStart?: (event: DragEvent<HTMLSpanElement>) => void;
  onDragEnd?: (event: DragEvent<HTMLSpanElement>) => void;
}) {
  return (
    <span
      className="hub-menu-tab-grip"
      aria-hidden
      title={label}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {Array.from({ length: 6 }, (_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}

export function HubMenuCategoryTabs({
  customerSections,
  extrasSection,
  burgerPartsSection,
  kebabPartsSection,
  mealSection,
  selectedSectionId,
  readOnly,
  onSelectSection,
  onReorderCategory,
  burgerPartsTabMeta = "Buns, meat, salad",
  kebabPartsTabMeta = "Bread, meat, salad",
}: HubMenuCategoryTabsProps) {
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dragEnabled = !readOnly && customerSections.length > 1;

  const handleDragStart = (sectionId: string, row: HTMLDivElement | null) => (event: DragEvent<HTMLSpanElement>) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", sectionId);
    row?.classList.add("is-dragging");
  };

  const handleDragEnd = (row: HTMLDivElement | null) => (event: DragEvent<HTMLSpanElement>) => {
    row?.classList.remove("is-dragging");
    void event;
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (readOnly) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (toIndex: number) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sectionId = event.dataTransfer.getData("text/plain");
    if (!sectionId) {
      return;
    }
    onReorderCategory(sectionId, toIndex);
  };

  const hasStaffTabs = Boolean(extrasSection || burgerPartsSection || kebabPartsSection || mealSection);

  return (
    <nav className="hub-menu-tab-rail" aria-label="Menu sections">
      {hasStaffTabs ? (
        <div className="hub-menu-tab-group hub-menu-tab-group--staff">
          <p className="hub-menu-tab-group-label">Hub setup</p>
          <p className="hub-menu-tab-group-hint">Not shown on customer menu — configure lists here, then apply per item.</p>
          {extrasSection ? (
            <button
              type="button"
              className={`hub-menu-tab hub-menu-tab--staff${selectedSectionId === extrasSection.id ? " is-active" : ""}`}
              onClick={(event) => {
                event.preventDefault();
                onSelectSection(extrasSection.id);
              }}
            >
              <span className="hub-menu-tab-label">
                <span className="hub-menu-tab-name">Extras &amp; sauces</span>
                <span className="hub-menu-tab-meta">Toppings and sauce lists</span>
              </span>
            </button>
          ) : null}

          {burgerPartsSection ? (
            <button
              type="button"
              className={`hub-menu-tab hub-menu-tab--parts${selectedSectionId === burgerPartsSection.id ? " is-active" : ""}`}
              onClick={(event) => {
                event.preventDefault();
                onSelectSection(burgerPartsSection.id);
              }}
            >
              <span className="hub-menu-tab-label">
                <span className="hub-menu-tab-name">Burger parts</span>
                <span className="hub-menu-tab-meta">{burgerPartsTabMeta}</span>
              </span>
            </button>
          ) : null}

          {kebabPartsSection ? (
            <button
              type="button"
              className={`hub-menu-tab hub-menu-tab--parts${selectedSectionId === kebabPartsSection.id ? " is-active" : ""}`}
              onClick={(event) => {
                event.preventDefault();
                onSelectSection(kebabPartsSection.id);
              }}
            >
              <span className="hub-menu-tab-label">
                <span className="hub-menu-tab-name">Kebab parts</span>
                <span className="hub-menu-tab-meta">{kebabPartsTabMeta}</span>
              </span>
            </button>
          ) : null}

          {mealSection ? (
            <button
              type="button"
              className={`hub-menu-tab hub-menu-tab--meal${selectedSectionId === mealSection.id ? " is-active" : ""}`}
              onClick={(event) => {
                event.preventDefault();
                onSelectSection(mealSection.id);
              }}
            >
              <span className="hub-menu-tab-label">
                <span className="hub-menu-tab-name">Make it a meal</span>
                <span className="hub-menu-tab-meta">Master meal deals</span>
              </span>
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="hub-menu-tab-group hub-menu-tab-group--customer">
        <p className="hub-menu-tab-group-label">Customer menu</p>
        <p className="hub-menu-tab-group-hint">
          {customerSections.length > 1
            ? "Drag tabs to reorder. Top tab is first on your live menu."
            : "Add categories below — they appear as tabs here."}
        </p>

        {customerSections.map((section, index) => {
          const isActive = section.id === selectedSectionId;
          const isTop = index === 0;
          const itemLabel = `${section.items.length} item${section.items.length === 1 ? "" : "s"}`;

          return (
            <div
              key={section.id}
              ref={(node) => {
                rowRefs.current[section.id] = node;
              }}
              className={`hub-menu-tab-row${isActive ? " is-active" : ""}${dragEnabled ? " is-draggable" : ""}`}
              onDragOver={dragEnabled ? handleDragOver : undefined}
              onDrop={dragEnabled ? handleDrop(index) : undefined}
            >
              {dragEnabled ? (
                <TabGrip
                  label="Drag to reorder category"
                  draggable
                  onDragStart={handleDragStart(section.id, rowRefs.current[section.id] ?? null)}
                  onDragEnd={handleDragEnd(rowRefs.current[section.id] ?? null)}
                />
              ) : null}
              <button
                type="button"
                className={`hub-menu-tab hub-menu-tab--category${isActive ? " is-active" : ""}`}
                onClick={(event) => {
                  event.preventDefault();
                  onSelectSection(section.id);
                }}
              >
                <span className="hub-menu-tab-label">
                  <span className="hub-menu-tab-name-row">
                    {isTop ? <span className="hub-menu-tab-top-badge">Top</span> : null}
                    <span className="hub-menu-tab-name">{section.name}</span>
                  </span>
                  <span className="hub-menu-tab-meta">{itemLabel}</span>
                </span>
              </button>
            </div>
          );
        })}

        {customerSections.length === 0 ? (
          <p className="hub-menu-tab-empty">No categories yet — add one under this list.</p>
        ) : null}
      </div>
    </nav>
  );
}

export function isMenuStudioStaffSection(section: HubMenuSection | null): boolean {
  if (!section) {
    return false;
  }
  return isHubMenuStaffLibrarySection(section);
}
