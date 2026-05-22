"use client";

import type { DragEvent } from "react";

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
};

function TabGrip({ label }: { label: string }) {
  return (
    <span className="hub-menu-tab-grip" aria-hidden title={label}>
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
}: HubMenuCategoryTabsProps) {
  const dragEnabled = !readOnly && customerSections.length > 1;

  const handleDragStart = (sectionId: string) => (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", sectionId);
    event.currentTarget.classList.add("is-dragging");
  };

  const handleDragEnd = (event: DragEvent<HTMLDivElement>) => {
    event.currentTarget.classList.remove("is-dragging");
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
              onClick={() => onSelectSection(extrasSection.id)}
            >
              <span className="hub-menu-tab-label">
                <span className="hub-menu-tab-name">Added extras</span>
                <span className="hub-menu-tab-meta">Master topping list</span>
              </span>
            </button>
          ) : null}

          {burgerPartsSection ? (
            <button
              type="button"
              className={`hub-menu-tab hub-menu-tab--parts${selectedSectionId === burgerPartsSection.id ? " is-active" : ""}`}
              onClick={() => onSelectSection(burgerPartsSection.id)}
            >
              <span className="hub-menu-tab-label">
                <span className="hub-menu-tab-name">Burger parts</span>
                <span className="hub-menu-tab-meta">Buns, meat, salad</span>
              </span>
            </button>
          ) : null}

          {kebabPartsSection ? (
            <button
              type="button"
              className={`hub-menu-tab hub-menu-tab--parts${selectedSectionId === kebabPartsSection.id ? " is-active" : ""}`}
              onClick={() => onSelectSection(kebabPartsSection.id)}
            >
              <span className="hub-menu-tab-label">
                <span className="hub-menu-tab-name">Kebab parts</span>
                <span className="hub-menu-tab-meta">Bread, meat, salad</span>
              </span>
            </button>
          ) : null}

          {mealSection ? (
            <button
              type="button"
              className={`hub-menu-tab hub-menu-tab--meal${selectedSectionId === mealSection.id ? " is-active" : ""}`}
              onClick={() => onSelectSection(mealSection.id)}
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
              className={`hub-menu-tab-row${isActive ? " is-active" : ""}${dragEnabled ? " is-draggable" : ""}`}
              draggable={dragEnabled}
              onDragStart={dragEnabled ? handleDragStart(section.id) : undefined}
              onDragEnd={dragEnabled ? handleDragEnd : undefined}
              onDragOver={dragEnabled ? handleDragOver : undefined}
              onDrop={dragEnabled ? handleDrop(index) : undefined}
            >
              {dragEnabled ? <TabGrip label="Drag to reorder category" /> : null}
              <button
                type="button"
                className={`hub-menu-tab hub-menu-tab--category${isActive ? " is-active" : ""}`}
                onClick={() => onSelectSection(section.id)}
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
