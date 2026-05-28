"use client";

import { useMemo, useState } from "react";

import type { HubMenuOrderTicketConfig, HubMenuSection, MenuItem } from "@hull-eats/types";
import {
  addMenuSubGroupOnSection,
  formatMenuSubGroupLabel,
  getHubMenuOrderTicketConfig,
  groupMenuItemsBySubGroup,
  readMenuSubGroupsFromSection,
  removeMenuSubGroupOnSection,
  renameMenuSubGroupOnSection,
} from "@hull-eats/types";

import { HubMenuBulkPastePanel } from "./hub-menu-bulk-paste-panel";
import { MenuItemVisibilitySelect } from "./hub-menu-item-visibility-select";
import { HubMenuRowPhotoCell } from "./hub-menu-row-photo-cell";
import { ManualVariationsEditor } from "./hub-menu-variations-editor";
import {
  applyDrinkSizesToItem,
  applyItemSpiceHeat,
  applyManualVariationsToItem,
  buildLocalMenuItem,
  getDrinkSizePrices,
  getItemSpiceHeat,
  getManualVariationRows,
  SPICE_HEAT_LEVELS,
  type BulkPasteRow,
} from "./menu-studio-core";

type Props = {
  section: HubMenuSection;
  readOnly?: boolean;
  onPatchSection: (updater: (section: HubMenuSection) => HubMenuSection) => void;
};

function menuSubGroupKey(label: string | null): string {
  return label?.trim() ?? "";
}

function patchSectionItems(
  onPatchSection: Props["onPatchSection"],
  updater: (items: MenuItem[]) => MenuItem[],
) {
  onPatchSection((current) => ({ ...current, items: updater(current.items) }));
}

function orderTicketGridColumns(config: HubMenuOrderTicketConfig): string {
  const columns = ["minmax(0, 1.4fr)"];
  if (config.showDrinkSizes) {
    columns.push("minmax(88px, 0.75fr)", "minmax(88px, 0.75fr)");
  } else {
    columns.push("minmax(110px, 0.9fr)");
  }
  if (config.showVariations) {
    columns.push("minmax(170px, 1.1fr)");
  }
  if (config.showSpiceHeat) {
    columns.push("minmax(96px, 0.85fr)");
  }
  if (config.showPhoto) {
    columns.push("72px");
  }
  if (config.showAgeCheck) {
    columns.push("52px");
  }
  columns.push("minmax(96px, 0.9fr)");
  columns.push("auto");
  return columns.join(" ");
}

function ticketRowFromBulkPaste(
  sectionId: string,
  row: BulkPasteRow,
  config: HubMenuOrderTicketConfig,
  menuSubGroup?: string,
): MenuItem {
  let item = buildLocalMenuItem({
    categoryId: sectionId,
    name: row.name,
    description: "",
    price: row.price ?? 0,
    menuSubGroup: menuSubGroup?.trim() || undefined,
    requiresIdVerification: config.showAgeCheck,
    components: [],
    optionGroups: [],
  });

  if (config.showDrinkSizes && row.price != null && Number.isFinite(row.price)) {
    const applied = applyDrinkSizesToItem(item, { ml330: String(row.price), ml500: "" });
    if (!("error" in applied)) {
      item = applied;
    }
  }

  return item;
}

export function HubMenuOrderTicketBuilder({ section, readOnly = false, onPatchSection }: Props) {
  const config = getHubMenuOrderTicketConfig(section);
  if (!config) {
    return null;
  }

  const subGroupDefs = readMenuSubGroupsFromSection(section);
  const headerBlocks = useMemo(() => {
    if (!config.useSubGroupHeaders) {
      return [{ label: null as string | null, items: section.items }];
    }

    const grouped = groupMenuItemsBySubGroup(section.items, subGroupDefs);
    const itemsByLabel = new Map<string, MenuItem[]>();
    for (const group of grouped) {
      if (group.label) {
        itemsByLabel.set(group.label, group.items);
      }
    }
    const ungrouped = grouped.find((group) => !group.label)?.items ?? [];

    const blocks: Array<{ label: string | null; items: MenuItem[] }> = subGroupDefs.map((def) => ({
      label: def.label,
      items: itemsByLabel.get(def.label) ?? [],
    }));

    for (const group of grouped) {
      if (group.label && !subGroupDefs.some((def) => def.label === group.label)) {
        blocks.push({ label: group.label, items: group.items });
      }
    }

    if (ungrouped.length > 0) {
      blocks.push({ label: null, items: ungrouped });
    }

    return blocks;
  }, [config.useSubGroupHeaders, section.items, subGroupDefs]);

  const [newHeaderType, setNewHeaderType] = useState("");
  const [newHeaderFormat, setNewHeaderFormat] = useState("");
  const gridColumns = orderTicketGridColumns(config);

  const addHeader = () => {
    const label = formatMenuSubGroupLabel(newHeaderType, newHeaderFormat);
    if (!label) {
      return;
    }
    onPatchSection((current) => addMenuSubGroupOnSection(current, label));
    setNewHeaderType("");
    setNewHeaderFormat("");
  };

  const updateItem = (itemId: string, patch: Partial<MenuItem>) => {
    patchSectionItems(onPatchSection, (items) =>
      items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    );
  };

  const updateItemWithVariations = (itemId: string, item: MenuItem) => {
    patchSectionItems(onPatchSection, (items) => items.map((entry) => (entry.id === itemId ? item : entry)));
  };

  const updateItemDrinkSizes = (itemId: string, item: MenuItem, sizes: ReturnType<typeof getDrinkSizePrices>) => {
    const applied = applyDrinkSizesToItem(item, sizes);
    if ("error" in applied) {
      return;
    }
    updateItemWithVariations(itemId, applied);
  };

  const copyDrinkSizesToBlock = (menuSubGroup: string | null, source: ReturnType<typeof getDrinkSizePrices>) => {
    patchSectionItems(onPatchSection, (items) =>
      items.map((item) => {
        const inBlock = config.useSubGroupHeaders
          ? menuSubGroupKey(item.menuSubGroup ?? null) === menuSubGroupKey(menuSubGroup)
          : true;
        if (!inBlock) {
          return item;
        }
        const applied = applyDrinkSizesToItem(item, source);
        return "error" in applied ? item : applied;
      }),
    );
  };

  const removeItem = (itemId: string) => {
    patchSectionItems(onPatchSection, (items) => items.filter((item) => item.id !== itemId));
  };

  const addProductLine = (menuSubGroup: string | null) => {
    const created = buildLocalMenuItem({
      categoryId: section.id,
      name: "",
      description: "",
      price: 0,
      menuSubGroup: menuSubGroup?.trim() || undefined,
      requiresIdVerification: config.showAgeCheck,
      components: [],
      optionGroups: [],
    });
    patchSectionItems(onPatchSection, (items) => [...items, created]);
  };

  const copyPriceToBlock = (menuSubGroup: string | null, price: number) => {
    if (!config.useSubGroupHeaders) {
      patchSectionItems(onPatchSection, (items) => items.map((item) => ({ ...item, price })));
      return;
    }
    const key = menuSubGroupKey(menuSubGroup);
    patchSectionItems(onPatchSection, (items) =>
      items.map((item) => (menuSubGroupKey(item.menuSubGroup ?? null) === key ? { ...item, price } : item)),
    );
  };

  const previewHeader = formatMenuSubGroupLabel(newHeaderType, newHeaderFormat);

  const applyBulkRows = (rows: BulkPasteRow[]) => {
    const created = rows
      .filter((row) => row.name.trim())
      .map((row) => ticketRowFromBulkPaste(section.id, row, config));
    if (created.length === 0) {
      return;
    }
    patchSectionItems(onPatchSection, (items) => [...items, ...created]);
  };

  return (
    <div className="hub-menu-order-builder">
      <div className="hub-menu-order-builder__intro">
        <strong>{config.introTitle}</strong>
        <p>{config.introBody} Rows save as Live — use Save as → Hidden if an item should stay off the menu.</p>
      </div>

      {config.showBulkPaste ? (
        <HubMenuBulkPastePanel readOnly={readOnly} onApply={applyBulkRows} />
      ) : null}

      {config.useSubGroupHeaders && !readOnly ? (
        <section className="hub-menu-order-builder__add-header">
          <h4 className="hub-menu-order-builder__block-title">Add menu header</h4>
          <div className="hub-menu-order-builder__header-fields">
            <label className="hub-menu-order-builder__field">
              <span>Type (optional)</span>
              <input
                value={newHeaderType}
                placeholder="e.g. Fizzy"
                onChange={(e) => setNewHeaderType(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHeader())}
              />
            </label>
            <label className="hub-menu-order-builder__field">
              <span>Format (optional)</span>
              <input
                value={newHeaderFormat}
                placeholder="e.g. Cans"
                onChange={(e) => setNewHeaderFormat(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHeader())}
              />
            </label>
            <button type="button" className="hub-menu-order-builder__primary-btn" onClick={addHeader}>
              + Add header
            </button>
          </div>
          {previewHeader ? (
            <p className="hub-menu-order-builder__preview">
              Customer will see header: <strong>{previewHeader}</strong>
            </p>
          ) : null}
        </section>
      ) : null}

      {config.useSubGroupHeaders && subGroupDefs.length === 0 ? (
        <p className="hub-menu-order-builder__hint">Add your first header above, then add product lines underneath it.</p>
      ) : null}

      {headerBlocks.map((group) => (
        <OrderTicketBlock
          key={group.label ?? "__flat__"}
          config={config}
          gridColumns={gridColumns}
          headerLabel={group.label ?? "Products"}
          items={group.items}
          readOnly={readOnly}
          namePlaceholder={config.namePlaceholder}
          onRenameHeader={
            config.useSubGroupHeaders && group.label
              ? (nextLabel) => {
                  const def = subGroupDefs.find((entry) => entry.label === group.label);
                  if (!def) {
                    return;
                  }
                  onPatchSection((current) => renameMenuSubGroupOnSection(current, def.id, nextLabel));
                  const oldKey = menuSubGroupKey(group.label);
                  const newKey = menuSubGroupKey(nextLabel);
                  patchSectionItems(onPatchSection, (items) =>
                    items.map((item) =>
                      menuSubGroupKey(item.menuSubGroup ?? null) === oldKey ? { ...item, menuSubGroup: newKey } : item,
                    ),
                  );
                }
              : undefined
          }
          onRemoveHeader={
            config.useSubGroupHeaders && group.label
              ? () => {
                  const def = subGroupDefs.find((entry) => entry.label === group.label);
                  if (!def) {
                    return;
                  }
                  onPatchSection((current) => removeMenuSubGroupOnSection(current, def.id));
                }
              : undefined
          }
          onUpdateItem={updateItem}
          onUpdateItemWithVariations={updateItemWithVariations}
          onUpdateItemDrinkSizes={updateItemDrinkSizes}
          onRemoveItem={removeItem}
          onAddLine={() => addProductLine(group.label)}
          onCopyPriceToAll={(price) => copyPriceToBlock(group.label, price)}
          onCopyDrinkSizesToAll={(sizes) => copyDrinkSizesToBlock(group.label, sizes)}
        />
      ))}
    </div>
  );
}

function OrderTicketBlock({
  config,
  gridColumns,
  headerLabel,
  items,
  readOnly,
  namePlaceholder,
  onRenameHeader,
  onRemoveHeader,
  onUpdateItem,
  onUpdateItemWithVariations,
  onUpdateItemDrinkSizes,
  onRemoveItem,
  onAddLine,
  onCopyPriceToAll,
  onCopyDrinkSizesToAll,
}: {
  config: HubMenuOrderTicketConfig;
  gridColumns: string;
  headerLabel: string;
  items: MenuItem[];
  readOnly: boolean;
  namePlaceholder: string;
  onRenameHeader?: (label: string) => void;
  onRemoveHeader?: () => void;
  onUpdateItem: (itemId: string, patch: Partial<MenuItem>) => void;
  onUpdateItemWithVariations: (itemId: string, item: MenuItem) => void;
  onUpdateItemDrinkSizes: (itemId: string, item: MenuItem, sizes: ReturnType<typeof getDrinkSizePrices>) => void;
  onRemoveItem: (itemId: string) => void;
  onAddLine: () => void;
  onCopyPriceToAll: (price: number) => void;
  onCopyDrinkSizesToAll: (sizes: ReturnType<typeof getDrinkSizePrices>) => void;
}) {
  const [expandedVariationsId, setExpandedVariationsId] = useState<string | null>(null);

  return (
    <section className="hub-menu-order-builder__block">
      <div className="hub-menu-order-builder__block-head">
        {onRenameHeader && !readOnly ? (
          <label className="hub-menu-order-builder__header-edit">
            <span>Menu header</span>
            <input
              className="hub-menu-order-builder__header-input"
              value={headerLabel}
              onChange={(e) => onRenameHeader(e.target.value)}
            />
          </label>
        ) : (
          <h4 className="hub-menu-order-builder__block-title">{headerLabel}</h4>
        )}
        {onRemoveHeader && !readOnly ? (
          <button type="button" className="hub-menu-order-builder__ghost-btn" onClick={onRemoveHeader}>
            Remove header
          </button>
        ) : null}
      </div>

      <div className="hub-menu-order-builder__table" role="table">
        <div
          className="hub-menu-order-builder__row hub-menu-order-builder__row--head"
          role="row"
          style={{ gridTemplateColumns: gridColumns }}
        >
          <span role="columnheader">Product name</span>
          {config.showDrinkSizes ? (
            <>
              <span role="columnheader">330ml (£)</span>
              <span role="columnheader">500ml (£)</span>
            </>
          ) : (
            <span role="columnheader">Price (£)</span>
          )}
          {config.showVariations ? <span role="columnheader">Flavours</span> : null}
          {config.showSpiceHeat ? <span role="columnheader">Spice</span> : null}
          {config.showPhoto ? <span role="columnheader">Photo</span> : null}
          {config.showAgeCheck ? <span role="columnheader">18+</span> : null}
          <span role="columnheader">Save as</span>
          <span role="columnheader" className="hub-menu-order-builder__actions-head" />
        </div>

        {items.map((item, index) => {
          const variationRows = getManualVariationRows(item);
          const variationSummary =
            variationRows.length > 0
              ? variationRows.map((row) => row.label.trim()).filter(Boolean).join(", ")
              : "";
          const drinkSizes = getDrinkSizePrices(item);

          return (
            <div key={item.id} className="hub-menu-order-builder__item-wrap">
              <div className="hub-menu-order-builder__row" role="row" style={{ gridTemplateColumns: gridColumns }}>
                <label className="hub-menu-order-builder__cell">
                  <span className="hub-menu-order-builder__sr-only">Product name</span>
                  <input
                    value={item.name}
                    disabled={readOnly}
                    placeholder={namePlaceholder}
                    onChange={(e) => onUpdateItem(item.id, { name: e.target.value })}
                  />
                </label>
                {config.showDrinkSizes ? (
                  <>
                    <label className="hub-menu-order-builder__cell">
                      <span className="hub-menu-order-builder__sr-only">330ml price</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        disabled={readOnly}
                        placeholder="£"
                        value={drinkSizes.ml330}
                        onChange={(e) =>
                          onUpdateItemDrinkSizes(item.id, item, { ...drinkSizes, ml330: e.target.value })
                        }
                      />
                    </label>
                    <label className="hub-menu-order-builder__cell">
                      <span className="hub-menu-order-builder__sr-only">500ml price</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        disabled={readOnly}
                        placeholder="£"
                        value={drinkSizes.ml500}
                        onChange={(e) =>
                          onUpdateItemDrinkSizes(item.id, item, { ...drinkSizes, ml500: e.target.value })
                        }
                      />
                    </label>
                  </>
                ) : (
                  <div className="hub-menu-order-builder__price-cell">
                    <label className="hub-menu-order-builder__cell">
                      <span className="hub-menu-order-builder__sr-only">Price</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        disabled={readOnly}
                        value={Number.isFinite(item.price) ? item.price : 0}
                        onChange={(e) => onUpdateItem(item.id, { price: Number(e.target.value) || 0 })}
                      />
                    </label>
                    {index === 0 && !readOnly && items.length > 1 ? (
                      <button
                        type="button"
                        className="hub-menu-order-builder__copy-btn"
                        title="Use this price for every product in this section"
                        onClick={() => onCopyPriceToAll(Number.isFinite(item.price) ? item.price : 0)}
                      >
                        Copy to all
                      </button>
                    ) : null}
                  </div>
                )}
                {config.showVariations ? (
                  <div className="hub-menu-order-builder__variations-cell">
                    <button
                      type="button"
                      className="hub-menu-order-builder__variations-btn"
                      disabled={readOnly}
                      onClick={() => setExpandedVariationsId((current) => (current === item.id ? null : item.id))}
                    >
                      {variationSummary || "Add flavours"}
                    </button>
                  </div>
                ) : null}
                {config.showSpiceHeat ? (
                  <label className="hub-menu-order-builder__cell">
                    <span className="hub-menu-order-builder__sr-only">Spice level</span>
                    <select
                      className="hub-menu-order-builder__spice-select"
                      disabled={readOnly}
                      value={getItemSpiceHeat(item)}
                      onChange={(e) =>
                        onUpdateItemWithVariations(item.id, applyItemSpiceHeat(item, e.target.value))
                      }
                    >
                      {SPICE_HEAT_LEVELS.map((level) => (
                        <option key={level.value || "none"} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {config.showPhoto ? (
                  <div className="hub-menu-order-builder__photo-cell">
                    <HubMenuRowPhotoCell
                      key={`${item.id}-${item.imageUrl?.slice(0, 48) ?? "none"}`}
                      value={item.imageUrl}
                      disabled={readOnly}
                      onChange={(imageUrl) => onUpdateItem(item.id, { imageUrl })}
                    />
                  </div>
                ) : null}
                {config.showAgeCheck ? (
                  <label className="hub-menu-order-builder__age-check" title="Requires ID verification">
                    <input
                      type="checkbox"
                      checked={Boolean(item.requiresIdVerification)}
                      disabled={readOnly}
                      onChange={(e) => onUpdateItem(item.id, { requiresIdVerification: e.target.checked })}
                    />
                  </label>
                ) : null}
                <div className="hub-menu-order-builder__visibility-cell">
                  <MenuItemVisibilitySelect
                    item={item}
                    readOnly={readOnly}
                    compact
                    onChange={(next) => onUpdateItemWithVariations(item.id, next)}
                  />
                </div>
                {readOnly ? null : (
                  <button type="button" className="hub-menu-order-builder__remove-btn" onClick={() => onRemoveItem(item.id)}>
                    Remove
                  </button>
                )}
              </div>

              {config.showVariations && expandedVariationsId === item.id ? (
                <div className="hub-menu-order-builder__variations-panel">
                  <ManualVariationsEditor
                    rows={variationRows}
                    readOnly={readOnly}
                    hint="Optional — e.g. BBQ, Spicy, Plain. Extra £ adds on top of the row price."
                    placeholderLabel="e.g. BBQ"
                    addButtonLabel="+ Add flavour"
                    onChange={(rows) => onUpdateItemWithVariations(item.id, applyManualVariationsToItem(item, rows))}
                  />
                </div>
              ) : null}
              {config.showDrinkSizes && index === 0 && !readOnly && items.length > 1 ? (
                <div className="hub-menu-order-builder__copy-row">
                  <button
                    type="button"
                    className="hub-menu-order-builder__copy-btn"
                    title="Use these drink sizes for every product in this section"
                    onClick={() => onCopyDrinkSizesToAll(drinkSizes)}
                  >
                    Copy 330ml / 500ml prices to all rows
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {readOnly ? null : (
        <button type="button" className="hub-menu-order-builder__add-line" onClick={onAddLine}>
          + Add product line
        </button>
      )}
    </section>
  );
}
