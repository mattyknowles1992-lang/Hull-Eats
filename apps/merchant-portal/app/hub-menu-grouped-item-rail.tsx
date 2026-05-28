"use client";

import type { MenuItem } from "@hull-eats/types";
import { groupMenuItemsBySubGroup, readMenuSubGroupsFromSection, type HubMenuSection } from "@hull-eats/types";

import { describeMenuAvailability, getMenuAvailabilityMode, getMenuItemPriceLabel } from "./menu-studio-core";
import { HubMenuCategorySubGroupsPanel } from "./hub-menu-category-subgroups";

type Props = {
  section: HubMenuSection;
  selectedItemId: string;
  isCreatingNewItem: boolean;
  readOnly?: boolean;
  onSelectItem: (itemId: string) => void;
  onBeginCreateItem: (sectionId: string, menuSubGroup?: string) => void;
  onUpdateSection: (updater: (section: HubMenuSection) => HubMenuSection) => void;
};

export function HubMenuGroupedItemRail({
  section,
  selectedItemId,
  isCreatingNewItem,
  readOnly = false,
  onSelectItem,
  onBeginCreateItem,
  onUpdateSection,
}: Props) {
  const subGroupDefs = readMenuSubGroupsFromSection(section);
  const grouped = groupMenuItemsBySubGroup(section.items, subGroupDefs);

  return (
    <div className="hub-menu-grouped-rail">
      <HubMenuCategorySubGroupsPanel section={section} readOnly={readOnly} onUpdateSection={onUpdateSection} />

      {subGroupDefs.length === 0 ? (
        <p className="hub-menu-grouped-rail__hint">
          Add a menu section above (e.g. <strong>Fizzy — Cans</strong> or <strong>Milkshakes</strong>), then add each drink with
          its own price and photo.
        </p>
      ) : null}

      {grouped.map((group) => (
        <section key={group.label ?? "__ungrouped"} className="hub-menu-grouped-rail__section">
          <div className="hub-menu-grouped-rail__section-head">
            <h4 className="hub-menu-grouped-rail__section-title">{group.label ?? "Other drinks"}</h4>
            {readOnly ? null : (
              <button
                type="button"
                className="hub-menu-grouped-rail__section-add"
                onClick={() => onBeginCreateItem(section.id, group.label ?? undefined)}
              >
                + Add here
              </button>
            )}
          </div>

          {group.items.length === 0 ? (
            <p className="hub-menu-grouped-rail__empty">
              No products in this section yet.
              {readOnly ? null : (
                <>
                  {" "}
                  Tap <strong>+ Add here</strong> for e.g. Coke or Fanta.
                </>
              )}
            </p>
          ) : (
            <ul className="hub-menu-grouped-rail__list">
              {group.items.map((item) => (
                <li key={item.id}>
                  <MenuProductRailButton
                    item={item}
                    active={item.id === selectedItemId && !isCreatingNewItem}
                    onSelect={() => onSelectItem(item.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function MenuProductRailButton({
  item,
  active,
  onSelect,
}: {
  item: MenuItem;
  active: boolean;
  onSelect: () => void;
}) {
  const availability = describeMenuAvailability(getMenuAvailabilityMode(item));

  return (
    <button type="button" className={`hub-menu-grouped-rail__item${active ? " is-active" : ""}`} onClick={onSelect}>
      <span
        className="hub-menu-grouped-rail__thumb"
        style={item.imageUrl ? { backgroundImage: `url(${item.imageUrl})` } : undefined}
        aria-hidden="true"
      />
      <span className="hub-menu-grouped-rail__item-copy">
        <strong>{item.name || "Untitled"}</strong>
        <span>
          {getMenuItemPriceLabel(item)} · {availability.label}
        </span>
      </span>
    </button>
  );
}
