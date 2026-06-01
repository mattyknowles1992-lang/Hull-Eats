"use client";

import type { CSSProperties, DragEvent } from "react";
import { useRef } from "react";

import type { MenuItem } from "@hull-eats/types";

import { HubMenuItemExtrasPicker } from "./hub-menu-item-extras";
import { HubMenuItemMealPicker } from "./hub-menu-item-meal-picker";
import { HubMenuItemSaladPicker } from "./hub-menu-item-salad-picker";
import { HubMenuItemSideSeasoningsPicker } from "./hub-menu-item-side-seasonings-picker";
import { HubMenuItemSaucesPicker } from "./hub-menu-item-sauces-picker";
import {
  addItemCustomOptionGroup,
  addItemOptionToGroup,
  applyExtraToppingsToItem,
  applyMealUpgradeToItem,
  applySaladToItem,
  applySideSeasoningsToItem,
  applySaucesToItem,
  findSaucesIncludedGroup,
  findSaucesExtraGroup,
  findSaladIncludedGroup,
  findSaladExtraGroup,
  findSideSeasoningsGroup,
  getItemExtraToppingSelection,
  getItemSaladSelection,
  getItemSideSeasoningsSelection,
  getItemSauceSelection,
  isLikelyChipsOrFriesItem,
  listItemOptionBlocks,
  removeItemOptionBlock,
  removeItemOptionFromGroup,
  reorderItemOptionBlocks,
  updateItemOptionGroup,
  updateItemOptionInGroup,
  updateExtrasGroupTitle,
  updateMealChoiceGroupTitle,
  updateSaladIncludedGroupTitle,
  updateSaladExtraGroupTitle,
  updateSideSeasoningsGroupTitle,
  updateSaucesIncludedGroupTitle,
  updateSaucesExtraGroupTitle,
  findExtrasToppingsGroup,
  findMealChoiceGroup,
  type HubExtraTopping,
  type HubMealTemplate,
  type HubSaladOption,
  type HubSideSeasoningOption,
  type HubSauceOption,
  type ItemOptionBlock,
} from "./menu-studio-core";

type Props = {
  item: MenuItem;
  toppings: HubExtraTopping[];
  sauces: HubSauceOption[];
  salads: HubSaladOption[];
  sideSeasonings: HubSideSeasoningOption[];
  mealTemplates: HubMealTemplate[];
  readOnly?: boolean;
  extrasManagedByCategoryName?: string | null;
  onDetachFromCategoryExtras?: () => void;
  onUpdateItem: (updater: (item: MenuItem) => MenuItem) => void;
};

function BlockGrip({
  label,
  onDragStart,
  onDragEnd,
}: {
  label: string;
  onDragStart: (event: DragEvent<HTMLSpanElement>) => void;
  onDragEnd: (event: DragEvent<HTMLSpanElement>) => void;
}) {
  return (
    <span className="hub-menu-option-block__grip" aria-hidden title={label} draggable onDragStart={onDragStart} onDragEnd={onDragEnd}>
      {Array.from({ length: 6 }, (_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}

function ItemSaucesBlock({
  item,
  sauces,
  readOnly,
  onUpdateItem,
}: {
  item: MenuItem;
  sauces: HubSauceOption[];
  readOnly: boolean;
  onUpdateItem: Props["onUpdateItem"];
}) {
  const selection = getItemSauceSelection(item);

  const patch = (
    enabled: boolean,
    includedIds: Set<string>,
    extraEnabled: boolean,
    extraIds: Set<string>,
    extraPriceById: Map<string, number>,
  ) => {
    onUpdateItem((current) => applySaucesToItem(current, enabled, sauces, includedIds, extraEnabled, extraIds, extraPriceById));
  };

  return (
    <HubMenuItemSaucesPicker
      sauces={sauces}
      enabled={selection.enabled}
      includedIds={selection.includedIds}
      extraEnabled={selection.extraEnabled}
      extraIds={selection.extraIds}
      extraPriceById={selection.extraPriceById}
      readOnly={readOnly}
      onEnabledChange={(enabled) => {
        if (enabled) {
          patch(true, new Set(), false, new Set(), selection.extraPriceById);
          return;
        }
        patch(false, new Set(), false, new Set(), selection.extraPriceById);
      }}
      onSelectAllIncluded={() =>
        patch(selection.enabled, new Set(sauces.map((s) => s.id)), selection.extraEnabled, selection.extraIds, selection.extraPriceById)
      }
      onClearIncluded={() =>
        patch(selection.enabled, new Set(), selection.extraEnabled, selection.extraIds, selection.extraPriceById)
      }
      onIncludedToggle={(id, checked) => {
        const next = new Set(selection.includedIds);
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
        patch(true, next, selection.extraEnabled, selection.extraIds, selection.extraPriceById);
      }}
      onExtraEnabledChange={(extraEnabled) => {
        patch(selection.enabled, selection.includedIds, extraEnabled, selection.extraIds, selection.extraPriceById);
      }}
      onExtraToggle={(id, checked) => {
        const next = new Set(selection.extraIds);
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
        patch(selection.enabled, selection.includedIds, selection.extraEnabled, next, selection.extraPriceById);
      }}
      onExtraPriceChange={(id, price) => {
        const next = new Map(selection.extraPriceById);
        next.set(id, price);
        patch(selection.enabled, selection.includedIds, selection.extraEnabled, selection.extraIds, next);
      }}
    />
  );
}

function ItemExtrasBlock({
  item,
  toppings,
  readOnly,
  extrasManagedByCategoryName,
  onDetachFromCategoryExtras,
  onUpdateItem,
}: {
  item: MenuItem;
  toppings: HubExtraTopping[];
  readOnly: boolean;
  extrasManagedByCategoryName?: string | null;
  onDetachFromCategoryExtras?: () => void;
  onUpdateItem: Props["onUpdateItem"];
}) {
  const selection = getItemExtraToppingSelection(item);

  const patch = (
    enabled: boolean,
    paidExtraIds: Set<string>,
    priceById: Map<string, number>,
    includedQtyById: Map<string, number>,
    maxAddMoreById: Map<string, number>,
  ) => {
    onUpdateItem((current) =>
      applyExtraToppingsToItem(current, enabled, toppings, paidExtraIds, priceById, includedQtyById, maxAddMoreById),
    );
  };

  if (toppings.length === 0) {
    return (
      <p style={hint}>
        Set up <strong>Added extras</strong> on the left first, then tick which ones apply to this item.
      </p>
    );
  }

  return (
    <HubMenuItemExtrasPicker
      toppings={toppings}
      enabled={selection.enabled}
      paidExtraIds={selection.paidExtraIds}
      priceById={selection.priceById}
      includedQtyById={selection.includedQtyById}
      maxAddMoreById={selection.maxAddMoreById}
      readOnly={readOnly}
      managedByCategoryName={extrasManagedByCategoryName}
      onDetachFromCategory={onDetachFromCategoryExtras}
      onEnabledChange={(enabled) => {
        if (!enabled) {
          patch(false, new Set(), new Map(), new Map(), new Map());
          return;
        }
        patch(true, selection.paidExtraIds, selection.priceById, selection.includedQtyById, selection.maxAddMoreById);
      }}
      onSelectAllPaid={() => {
        const paid = new Set(toppings.map((t) => t.id));
        const maxAddMore = new Map(toppings.map((t) => [t.id, selection.maxAddMoreById.get(t.id) ?? 8]));
        patch(true, paid, selection.priceById, selection.includedQtyById, maxAddMore);
      }}
      onClearAll={() => patch(true, new Set(), selection.priceById, new Map(), selection.maxAddMoreById)}
      onIncludedToggle={(id, checked) => {
        const included = new Map(selection.includedQtyById);
        if (checked) {
          included.set(id, Math.max(1, included.get(id) ?? 1));
        } else {
          included.delete(id);
        }
        patch(true, selection.paidExtraIds, selection.priceById, included, selection.maxAddMoreById);
      }}
      onPaidExtraToggle={(id, checked) => {
        const paid = new Set(selection.paidExtraIds);
        const maxAddMore = new Map(selection.maxAddMoreById);
        if (checked) {
          paid.add(id);
          if (!maxAddMore.has(id)) {
            maxAddMore.set(id, 8);
          }
        } else {
          paid.delete(id);
        }
        patch(true, paid, selection.priceById, selection.includedQtyById, maxAddMore);
      }}
      onPriceChange={(id, price) => {
        const next = new Map(selection.priceById);
        next.set(id, price);
        patch(selection.enabled, selection.paidExtraIds, next, selection.includedQtyById, selection.maxAddMoreById);
      }}
      onIncludedQtyChange={(id, quantity) => {
        const included = new Map(selection.includedQtyById);
        if (quantity <= 0) {
          included.delete(id);
        } else {
          included.set(id, quantity);
        }
        patch(selection.enabled, selection.paidExtraIds, selection.priceById, included, selection.maxAddMoreById);
      }}
      onMaxAddMoreChange={(id, quantity) => {
        const maxAddMore = new Map(selection.maxAddMoreById);
        maxAddMore.set(id, quantity);
        patch(selection.enabled, selection.paidExtraIds, selection.priceById, selection.includedQtyById, maxAddMore);
      }}
    />
  );
}

function ItemSideSeasoningsBlock({
  item,
  seasonings,
  readOnly,
  onUpdateItem,
}: {
  item: MenuItem;
  seasonings: HubSideSeasoningOption[];
  readOnly: boolean;
  onUpdateItem: Props["onUpdateItem"];
}) {
  const selection = getItemSideSeasoningsSelection(item);

  const patch = (enabled: boolean, offeredIds: Set<string>) => {
    onUpdateItem((current) => applySideSeasoningsToItem(current, enabled, seasonings, offeredIds));
  };

  return (
    <HubMenuItemSideSeasoningsPicker
      seasonings={seasonings}
      enabled={selection.enabled}
      offeredIds={selection.offeredIds}
      chipsOrFriesHint={isLikelyChipsOrFriesItem(item)}
      readOnly={readOnly}
      onEnabledChange={(enabled) => {
        if (!enabled) {
          patch(false, new Set());
          return;
        }
        patch(true, selection.offeredIds);
      }}
      onSelectAllOffered={() => patch(selection.enabled, new Set(seasonings.map((entry) => entry.id)))}
      onClearOffered={() => patch(selection.enabled, new Set())}
      onOfferedToggle={(id, checked) => {
        const next = new Set(selection.offeredIds);
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
        patch(true, next);
      }}
    />
  );
}

function ItemSaladBlock({
  item,
  salads,
  readOnly,
  onUpdateItem,
}: {
  item: MenuItem;
  salads: HubSaladOption[];
  readOnly: boolean;
  onUpdateItem: Props["onUpdateItem"];
}) {
  const selection = getItemSaladSelection(item);

  const patch = (
    enabled: boolean,
    includedIds: Set<string>,
    extraEnabled: boolean,
    extraIds: Set<string>,
    extraPriceById: Map<string, number>,
  ) => {
    onUpdateItem((current) => applySaladToItem(current, enabled, salads, includedIds, extraEnabled, extraIds, extraPriceById));
  };

  return (
    <HubMenuItemSaladPicker
      salads={salads}
      enabled={selection.enabled}
      includedIds={selection.includedIds}
      extraEnabled={selection.extraEnabled}
      extraIds={selection.extraIds}
      extraPriceById={selection.extraPriceById}
      readOnly={readOnly}
      onEnabledChange={(enabled) => {
        if (!enabled) {
          patch(false, new Set(), false, new Set(), selection.extraPriceById);
          return;
        }
        patch(true, new Set(), false, new Set(), selection.extraPriceById);
      }}
      onSelectAllIncluded={() =>
        patch(selection.enabled, new Set(salads.map((s) => s.id)), selection.extraEnabled, selection.extraIds, selection.extraPriceById)
      }
      onClearIncluded={() =>
        patch(selection.enabled, new Set(), selection.extraEnabled, selection.extraIds, selection.extraPriceById)
      }
      onIncludedToggle={(id, checked) => {
        const next = new Set(selection.includedIds);
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
        patch(true, next, selection.extraEnabled, selection.extraIds, selection.extraPriceById);
      }}
      onExtraEnabledChange={(extraEnabled) => {
        patch(selection.enabled, selection.includedIds, extraEnabled, selection.extraIds, selection.extraPriceById);
      }}
      onExtraToggle={(id, checked) => {
        const next = new Set(selection.extraIds);
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
        patch(selection.enabled, selection.includedIds, selection.extraEnabled, next, selection.extraPriceById);
      }}
      onExtraPriceChange={(id, price) => {
        const next = new Map(selection.extraPriceById);
        next.set(id, price);
        patch(selection.enabled, selection.includedIds, selection.extraEnabled, selection.extraIds, next);
      }}
    />
  );
}

function CustomOptionGroupEditor({
  item,
  groupId,
  readOnly,
  onUpdateItem,
}: {
  item: MenuItem;
  groupId: string;
  readOnly: boolean;
  onUpdateItem: Props["onUpdateItem"];
}) {
  const group = item.optionGroups.find((entry) => entry.id === groupId);
  if (!group) {
    return null;
  }

  return (
    <div style={customBody}>
      <label style={field}>
        <span style={fieldLabel}>Pick one or many?</span>
        <select
          style={input}
          disabled={readOnly}
          value={group.selectionMode}
          onChange={(e) =>
            onUpdateItem((current) =>
              updateItemOptionGroup(current, groupId, {
                selectionMode: e.target.value as typeof group.selectionMode,
                maxSelections: e.target.value === "single" ? 1 : group.maxSelections,
              }),
            )
          }
        >
          <option value="single">Customer picks one</option>
          <option value="multiple">Customer can pick several</option>
        </select>
      </label>
      <label style={toggleLabel}>
        <input
          type="checkbox"
          disabled={readOnly}
          checked={group.isRequired}
          onChange={(e) => onUpdateItem((current) => updateItemOptionGroup(current, groupId, { isRequired: e.target.checked }))}
        />
        <span>Required choice</span>
      </label>
      {group.options.map((option) => (
        <div key={option.id} className="hub-menu-option-choice-row">
          <input
            style={input}
            disabled={readOnly}
            value={option.label}
            placeholder="Option name (e.g. BBQ, Large)"
            onChange={(e) =>
              onUpdateItem((current) => updateItemOptionInGroup(current, groupId, option.id, { label: e.target.value }))
            }
          />
          <input
            type="number"
            step="0.1"
            style={priceInput}
            disabled={readOnly}
            value={option.priceDelta}
            title="Extra £ on top of item price"
            onChange={(e) =>
              onUpdateItem((current) =>
                updateItemOptionInGroup(current, groupId, option.id, { priceDelta: Number(e.target.value) || 0 }),
              )
            }
          />
          {readOnly ? null : (
            <button
              type="button"
              style={removeBtn}
              disabled={group.options.length <= 1}
              onClick={() => onUpdateItem((current) => removeItemOptionFromGroup(current, groupId, option.id))}
            >
              Remove
            </button>
          )}
        </div>
      ))}
      {readOnly ? null : (
        <button type="button" style={secondaryBtn} onClick={() => onUpdateItem((current) => addItemOptionToGroup(current, groupId))}>
          + Add option
        </button>
      )}
    </div>
  );
}

function OptionBlockCard({
  block,
  item,
  toppings,
  sauces,
  salads,
  sideSeasonings,
  mealTemplates,
  readOnly,
  extrasManagedByCategoryName,
  onDetachFromCategoryExtras,
  reorderableIndex,
  reorderableCount,
  onUpdateItem,
  onReorder,
}: {
  block: ItemOptionBlock;
  item: MenuItem;
  toppings: HubExtraTopping[];
  sauces: HubSauceOption[];
  salads: HubSaladOption[];
  sideSeasonings: HubSideSeasoningOption[];
  mealTemplates: HubMealTemplate[];
  readOnly: boolean;
  extrasManagedByCategoryName?: string | null;
  onDetachFromCategoryExtras?: () => void;
  reorderableIndex: number;
  reorderableCount: number;
  onUpdateItem: Props["onUpdateItem"];
  onReorder: (from: number, to: number) => void;
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const customGroupId = block.kind === "custom" ? block.groupIds[0] : null;
  const customGroup = customGroupId ? item.optionGroups.find((g) => g.id === customGroupId) : null;
  const extrasGroup = block.kind === "extras" ? findExtrasToppingsGroup(item) : null;
  const saucesIncludedGroup = block.kind === "sauces" ? findSaucesIncludedGroup(item) : null;
  const saucesExtraGroup = block.kind === "sauces" ? findSaucesExtraGroup(item) : null;
  const saladIncludedGroup = block.kind === "salad" ? findSaladIncludedGroup(item) : null;
  const saladExtraGroup = block.kind === "salad" ? findSaladExtraGroup(item) : null;
  const sideSeasoningsGroup = block.kind === "side_seasonings" ? findSideSeasoningsGroup(item) : null;
  const mealGroup = block.kind === "meal" ? findMealChoiceGroup(item) : null;

  const handleDragStart = (event: DragEvent<HTMLSpanElement>) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(reorderableIndex));
    rowRef.current?.classList.add("is-dragging");
  };

  const handleDragEnd = () => {
    rowRef.current?.classList.remove("is-dragging");
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!block.canReorder || readOnly) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const from = Number(event.dataTransfer.getData("text/plain"));
    if (!Number.isFinite(from) || from === reorderableIndex) {
      return;
    }
    onReorder(from, reorderableIndex);
  };

  return (
    <article
      ref={rowRef}
      className={`hub-menu-option-block${block.canReorder ? " hub-menu-option-block--draggable" : ""}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <header className="hub-menu-option-block__header">
        {block.canReorder && reorderableCount > 1 ? (
          <BlockGrip label="Drag to reorder this option group" onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
        ) : null}
        <div style={headerMain}>
          {block.kind === "custom" && customGroup ? (
            <label style={titleField}>
              <span style={fieldLabel}>Title (customer sees)</span>
              <input
                style={input}
                disabled={readOnly}
                value={customGroup.name}
                placeholder="e.g. Sauce, Size, Flavour"
                onChange={(e) =>
                  onUpdateItem((current) => updateItemOptionGroup(current, customGroup.id, { name: e.target.value }))
                }
              />
            </label>
          ) : block.kind === "extras" && extrasGroup ? (
            <label style={titleField}>
              <span style={fieldLabel}>Title (customer sees)</span>
              <input
                style={input}
                disabled={readOnly || Boolean(extrasManagedByCategoryName)}
                value={extrasGroup.name}
                placeholder="e.g. Added extras, Toppings"
                onChange={(e) => onUpdateItem((current) => updateExtrasGroupTitle(current, e.target.value))}
              />
            </label>
          ) : block.kind === "sauces" && saucesIncludedGroup ? (
            <label style={titleField}>
              <span style={fieldLabel}>Included sauces title (customer sees)</span>
              <input
                style={input}
                disabled={readOnly}
                value={saucesIncludedGroup.name}
                placeholder="Sauces"
                onChange={(e) => onUpdateItem((current) => updateSaucesIncludedGroupTitle(current, e.target.value))}
              />
              <span style={blockMeta}>Customer must pick one included sauce</span>
            </label>
          ) : block.kind === "sauces" && saucesExtraGroup && !saucesIncludedGroup ? (
            <label style={titleField}>
              <span style={fieldLabel}>Extra sauce title (customer sees)</span>
              <input
                style={input}
                disabled={readOnly}
                value={saucesExtraGroup.name}
                placeholder="Extra sauce"
                onChange={(e) => onUpdateItem((current) => updateSaucesExtraGroupTitle(current, e.target.value))}
              />
            </label>
          ) : block.kind === "salad" && saladIncludedGroup ? (
            <label style={titleField}>
              <span style={fieldLabel}>Included salad title (customer sees)</span>
              <input
                style={input}
                disabled={readOnly}
                value={saladIncludedGroup.name}
                placeholder="Salad"
                onChange={(e) => onUpdateItem((current) => updateSaladIncludedGroupTitle(current, e.target.value))}
              />
              <span style={blockMeta}>Customer can remove included salad choices</span>
            </label>
          ) : block.kind === "salad" && saladExtraGroup && !saladIncludedGroup ? (
            <label style={titleField}>
              <span style={fieldLabel}>Extra salad title (customer sees)</span>
              <input
                style={input}
                disabled={readOnly}
                value={saladExtraGroup.name}
                placeholder="Extra salad"
                onChange={(e) => onUpdateItem((current) => updateSaladExtraGroupTitle(current, e.target.value))}
              />
            </label>
          ) : block.kind === "side_seasonings" && sideSeasoningsGroup ? (
            <label style={titleField}>
              <span style={fieldLabel}>Seasoning title (customer sees)</span>
              <input
                style={input}
                disabled={readOnly}
                value={sideSeasoningsGroup.name}
                placeholder="Seasoning"
                onChange={(e) => onUpdateItem((current) => updateSideSeasoningsGroupTitle(current, e.target.value))}
              />
              <span style={blockMeta}>Customer ticks each seasoning they want (salt, spice, vinegar, etc.)</span>
            </label>
          ) : block.kind === "meal" && mealGroup ? (
            <label style={titleField}>
              <span style={fieldLabel}>Title (customer sees)</span>
              <input
                style={input}
                disabled={readOnly}
                value={mealGroup.name}
                placeholder="Make it a meal"
                onChange={(e) => onUpdateItem((current) => updateMealChoiceGroupTitle(current, e.target.value))}
              />
              <span style={blockMeta}>Tick below to offer a meal upgrade on this item only</span>
            </label>
          ) : (
            <strong style={blockTitle}>{block.label}</strong>
          )}
          {block.kind === "custom" ? <span style={blockMeta}>Variation / option group</span> : null}
          {block.kind === "extras" && !extrasGroup ? <span style={blockMeta}>From your master extras list</span> : null}
          {block.kind === "sauces" ? <span style={blockMeta}>From your master sauces list</span> : null}
          {block.kind === "salad" ? <span style={blockMeta}>From your master salad list</span> : null}
          {block.kind === "side_seasonings" ? (
            <span style={blockMeta}>From your chips &amp; sides seasoning list</span>
          ) : null}
          {block.kind === "meal" && !mealGroup ? <span style={blockMeta}>Meal upgrade template</span> : null}
        </div>
        {readOnly || !block.canRemove ? null : (
          <button type="button" style={removeBtn} onClick={() => onUpdateItem((current) => removeItemOptionBlock(current, block.id))}>
            Remove
          </button>
        )}
      </header>

      {block.kind === "extras" ? (
        <ItemExtrasBlock
          item={item}
          toppings={toppings}
          readOnly={readOnly}
          extrasManagedByCategoryName={extrasManagedByCategoryName}
          onDetachFromCategoryExtras={onDetachFromCategoryExtras}
          onUpdateItem={onUpdateItem}
        />
      ) : null}
      {block.kind === "sauces" ? <ItemSaucesBlock item={item} sauces={sauces} readOnly={readOnly} onUpdateItem={onUpdateItem} /> : null}
      {block.kind === "salad" ? <ItemSaladBlock item={item} salads={salads} readOnly={readOnly} onUpdateItem={onUpdateItem} /> : null}
      {block.kind === "side_seasonings" ? (
        <ItemSideSeasoningsBlock
          item={item}
          seasonings={sideSeasonings}
          readOnly={readOnly}
          onUpdateItem={onUpdateItem}
        />
      ) : null}
      {block.kind === "meal" ? (
        <HubMenuItemMealPicker item={item} templates={mealTemplates} readOnly={readOnly} onUpdateItem={onUpdateItem} />
      ) : null}
      {block.kind === "custom" && customGroupId ? (
        <CustomOptionGroupEditor item={item} groupId={customGroupId} readOnly={readOnly} onUpdateItem={onUpdateItem} />
      ) : null}
      {block.kind === "pizza_sizes" || block.kind === "crust" || block.kind === "meal_bundle" ? (
        <p style={hint}>Managed in the sections above — order is fixed for this block.</p>
      ) : null}
    </article>
  );
}

export function HubMenuItemOptionsPanel({
  item,
  toppings,
  sauces,
  salads,
  sideSeasonings,
  mealTemplates,
  readOnly = false,
  extrasManagedByCategoryName = null,
  onDetachFromCategoryExtras,
  onUpdateItem,
}: Props) {
  const blocks = listItemOptionBlocks(item);
  const reorderable = blocks.filter((block) => block.canReorder);
  const fixed = blocks.filter((block) => !block.canReorder);
  const hasExtras = blocks.some((b) => b.kind === "extras");
  const hasSauces = blocks.some((b) => b.kind === "sauces");
  const hasSalad = blocks.some((b) => b.kind === "salad");
  const hasSideSeasonings = blocks.some((b) => b.kind === "side_seasonings");
  const hasMeal = blocks.some((b) => b.kind === "meal");

  const handleReorder = (from: number, to: number) => {
    onUpdateItem((current) => reorderItemOptionBlocks(current, from, to));
  };

  const addExtrasBlock = () => {
    if (toppings.length === 0) {
      return;
    }
    onUpdateItem((current) => applyExtraToppingsToItem(current, true, toppings, new Set(), new Map(), new Map(), new Map()));
  };

  const addSaucesBlock = () => {
    if (sauces.length === 0) {
      return;
    }
    onUpdateItem((current) => applySaucesToItem(current, true, sauces, new Set(), false, new Set(), new Map()));
  };

  const addSaladBlock = () => {
    if (salads.length === 0) {
      return;
    }
    onUpdateItem((current) => applySaladToItem(current, true, salads, new Set(), false, new Set(), new Map()));
  };

  const addSideSeasoningsBlock = () => {
    if (sideSeasonings.length === 0) {
      return;
    }
    onUpdateItem((current) => applySideSeasoningsToItem(current, true, sideSeasonings, new Set()));
  };

  const addMealBlock = () => {
    const template = mealTemplates[0];
    if (!template) {
      return;
    }
    onUpdateItem((current) =>
      applyMealUpgradeToItem(
        current,
        false,
        template,
        new Set(template.sides.map((s) => s.id)),
        new Set(template.drinks.map((d) => d.id)),
      ),
    );
  };

  return (
    <section className="hub-menu-item-options-panel">
      <div style={panelIntro}>
        <p style={panelTitle}>Customer options &amp; variations</p>
        <p style={hint}>
          Each block is one choice customers make when ordering. Drag blocks to change the order (e.g. put{" "}
          <strong>Make it a meal</strong> before <strong>Added extras</strong>).
        </p>
      </div>

      {fixed.map((block) => (
        <OptionBlockCard
          key={block.id}
          block={block}
          item={item}
          toppings={toppings}
          sauces={sauces}
          salads={salads}
          sideSeasonings={sideSeasonings}
          mealTemplates={mealTemplates}
          readOnly={readOnly}
          extrasManagedByCategoryName={extrasManagedByCategoryName}
          onDetachFromCategoryExtras={onDetachFromCategoryExtras}
          reorderableIndex={-1}
          reorderableCount={reorderable.length}
          onUpdateItem={onUpdateItem}
          onReorder={handleReorder}
        />
      ))}

      {reorderable.map((block, index) => (
        <OptionBlockCard
          key={block.id}
          block={block}
          item={item}
          toppings={toppings}
          sauces={sauces}
          salads={salads}
          sideSeasonings={sideSeasonings}
          mealTemplates={mealTemplates}
          readOnly={readOnly}
          extrasManagedByCategoryName={extrasManagedByCategoryName}
          onDetachFromCategoryExtras={onDetachFromCategoryExtras}
          reorderableIndex={index}
          reorderableCount={reorderable.length}
          onUpdateItem={onUpdateItem}
          onReorder={handleReorder}
        />
      ))}

      {readOnly ? null : (
        <div style={addRow}>
          <button type="button" style={secondaryBtn} onClick={() => onUpdateItem((current) => addItemCustomOptionGroup(current))}>
            + Add option group
          </button>
          {!hasExtras && toppings.length > 0 ? (
            <button type="button" style={secondaryBtn} onClick={addExtrasBlock}>
              + Added extras on this item
            </button>
          ) : null}
          {!hasSauces && sauces.length > 0 ? (
            <button type="button" style={secondaryBtn} onClick={addSaucesBlock}>
              + Sauces on this item
            </button>
          ) : null}
          {!hasSalad && salads.length > 0 ? (
            <button type="button" style={secondaryBtn} onClick={addSaladBlock}>
              + Salad on this item
            </button>
          ) : null}
          {!hasSideSeasonings && sideSeasonings.length > 0 ? (
            <button type="button" style={secondaryBtn} onClick={addSideSeasoningsBlock}>
              + Seasoning on this item
            </button>
          ) : null}
          {!hasMeal && mealTemplates.length > 0 ? (
            <button type="button" style={secondaryBtn} onClick={addMealBlock}>
              + Make it a meal
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

const panelIntro: CSSProperties = { display: "grid", gap: 6 };
const panelTitle: CSSProperties = { margin: 0, fontWeight: 900, fontSize: "1rem", color: "#101216" };
const hint: CSSProperties = { margin: 0, fontSize: "0.86rem", lineHeight: 1.45, color: "rgba(15, 17, 21, 0.65)" };
const field: CSSProperties = { display: "grid", gap: 6, minWidth: 0 };
const titleField: CSSProperties = { ...field, flex: 1, minWidth: 0 };
const fieldLabel: CSSProperties = { fontSize: "0.78rem", fontWeight: 700, color: "rgba(15, 17, 21, 0.55)" };
const input: CSSProperties = {
  minHeight: 44,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.14)",
  font: "inherit",
  width: "100%",
  boxSizing: "border-box",
};
const priceInput: CSSProperties = { ...input, maxWidth: 120 };
const toggleLabel: CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: "0.86rem" };
const customBody: CSSProperties = { display: "grid", gap: 10 };
const headerMain: CSSProperties = { flex: 1, minWidth: 0, display: "grid", gap: 4 };
const blockTitle: CSSProperties = { fontSize: "0.95rem" };
const blockMeta: CSSProperties = { fontSize: "0.78rem", color: "rgba(15, 17, 21, 0.55)", fontWeight: 600 };
const addRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };
const secondaryBtn: CSSProperties = {
  minHeight: 40,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid rgba(7, 155, 200, 0.35)",
  background: "rgba(35, 205, 255, 0.1)",
  fontWeight: 800,
  fontSize: "0.86rem",
  cursor: "pointer",
};
const removeBtn: CSSProperties = {
  ...secondaryBtn,
  borderColor: "rgba(155, 28, 28, 0.25)",
  color: "#9b1c1c",
  background: "#fff",
};
