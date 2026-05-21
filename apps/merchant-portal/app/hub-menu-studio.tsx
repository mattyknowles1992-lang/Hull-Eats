"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

import type { HubMenuSection, HubSettings, MenuItem } from "@hull-eats/types";
import {
  HUB_MENU_CATEGORY_CUSTOM_ID,
  hubMenuCategorySelectOptions,
  isHubMenuExtrasLibrarySection,
  isHubMenuMealLibrarySection,
  isHubMenuStaffLibrarySection,
  isHubMenuSectionPizza,
  type HubMenuCategoryPresetChoice,
} from "@hull-eats/types";

import { HubMenuCustomisationBuilder } from "./hub-menu-customisation";
import { HubMenuExtrasLibrary } from "./hub-menu-extras-library";
import { HubMenuItemExtrasPicker } from "./hub-menu-item-extras";
import { HubMenuPublishDialog } from "./hub-menu-publish-dialog";
import { MenuItemImageField } from "./menu-item-image-field";
import {
  applyExtraToppingsToItem,
  applyMenuAvailabilityMode,
  buildAllToppingSelection,
  customerFacingMenuSections,
  describeCategoryItemBuilder,
  describeMenuAvailability,
  formatMenuMoney,
  getCategoryItemBuilderMode,
  getHubExtraToppingsFromSection,
  getHubMealTemplatesFromSection,
  getItemExtraToppingSelection,
  getMenuAvailabilityMode,
  getMenuItemPriceLabel,
  itemUsesSizePricing,
  type HubExtraTopping,
  type ManualVariationRow,
  type MenuAvailabilityMode,
  type MenuPublishSummary,
} from "./menu-studio-core";
import { HubMenuItemMealPicker } from "./hub-menu-item-meal-picker";
import { HubMenuLivePreview } from "./hub-menu-live-preview";
import { HubMenuMealLibrary } from "./hub-menu-meal-library";
import { ItemManualVariationsEditor, ManualVariationsEditor } from "./hub-menu-variations-editor";
import { HubMenuPreview } from "./hub-menu-preview";
import { PizzaSizeDraftPanel, type PizzaSizeRow } from "./pizza-size-draft";

export type CreateCategoryFormState = {
  presetId: string;
  name: string;
  description: string;
  defaultPrice: string;
};

export type CreateItemFormState = {
  sectionId: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  requiresIdVerification: boolean;
};

type HubMenuStudioProps = {
  menuSections: HubMenuSection[];
  selectedCategory: HubMenuSection | null;
  selectedItem: MenuItem | null;
  isCreatingNewItem: boolean;
  newCategory: CreateCategoryFormState;
  newItem: CreateItemFormState;
  pizzaSizeRows: PizzaSizeRow[];
  newItemVariationRows: ManualVariationRow[];
  onNewItemVariationRowsChange: (rows: ManualVariationRow[]) => void;
  publishIssues: string[];
  hasUnsavedHubChanges: boolean;
  hubSettings: HubSettings;
  menuPreviewOpen: boolean;
  onOpenMenuPreview: () => void;
  onCloseMenuPreview: () => void;
  categoryPresetOptions: HubMenuCategoryPresetChoice[];
  onMoveCategory: (sectionId: string, direction: "up" | "down") => void;
  onNewCategoryPresetChange: (presetId: string) => void;
  onNewCategoryChange: (patch: Partial<CreateCategoryFormState>) => void;
  onNewItemChange: (patch: Partial<CreateItemFormState>) => void;
  onPizzaSizeRowsChange: (rows: PizzaSizeRow[]) => void;
  onSelectCategory: (sectionId: string) => void;
  onSelectItem: (itemId: string) => void;
  onBeginCreateItem: (sectionId: string) => void;
  onCancelCreateItem: () => void;
  onCreateItem: () => void;
  onCreateCategory: () => void;
  onDuplicateItem: (item: MenuItem) => void;
  onDeleteCategory: () => void;
  onDeleteItem: () => void;
  onSaveDraft: () => void;
  onRequestPublish: () => void;
  onOpenImport: () => void;
  extrasSection: HubMenuSection | null;
  mealSection: HubMenuSection | null;
  onAddExtraTopping: (item: MenuItem) => void;
  onRemoveExtraTopping: (itemId: string) => void;
  onAddMealTemplate: (item: MenuItem) => void;
  onUpdateMealTemplate: (itemId: string, updater: (item: MenuItem) => MenuItem) => void;
  onRemoveMealTemplate: (itemId: string) => void;
  publishDialogOpen: boolean;
  publishSummary: MenuPublishSummary;
  menuPublishing: boolean;
  onCancelPublish: () => void;
  onConfirmPublish: () => void;
  onUpdateSectionField: (field: "name" | "description", value: string | number | null) => void;
  onUpdateItem: (updater: (item: MenuItem) => MenuItem) => void;
  saveButtonStyle: CSSProperties;
  readOnly?: boolean;
};

type MenuStudioLeftTab = "categories" | "extras" | "meals";

const moneyInput = (value: number) => (Number.isFinite(value) ? value : 0);

function ItemExtrasEditor({
  item,
  toppings,
  readOnly,
  onUpdateItem,
}: {
  item: MenuItem;
  toppings: HubExtraTopping[];
  readOnly: boolean;
  onUpdateItem: (updater: (item: MenuItem) => MenuItem) => void;
}) {
  const selection = getItemExtraToppingSelection(item);

  const patch = (enabled: boolean, selectedIds: Set<string>, priceById: Map<string, number>) => {
    onUpdateItem((current) => applyExtraToppingsToItem(current, enabled, toppings, selectedIds, priceById));
  };

  return (
    <HubMenuItemExtrasPicker
      toppings={toppings}
      enabled={selection.enabled}
      selectedIds={selection.selectedIds}
      priceById={selection.priceById}
      readOnly={readOnly}
      onEnabledChange={(enabled) => {
        if (enabled) {
          const defaults = buildAllToppingSelection(toppings);
          patch(true, defaults.selectedIds, defaults.priceById);
          return;
        }
        patch(false, new Set(), new Map());
      }}
      onSelectAll={() => patch(true, new Set(toppings.map((t) => t.id)), selection.priceById)}
      onClearAll={() => patch(false, new Set(), selection.priceById)}
      onToggle={(id, checked) => {
        const next = new Set(selection.selectedIds);
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
        patch(true, next, selection.priceById);
      }}
      onPriceChange={(id, price) => {
        const next = new Map(selection.priceById);
        next.set(id, price);
        patch(selection.enabled, selection.selectedIds, next);
      }}
    />
  );
}

export function HubMenuStudio({
  menuSections,
  selectedCategory,
  selectedItem,
  isCreatingNewItem,
  newCategory,
  newItem,
  pizzaSizeRows,
  newItemVariationRows,
  onNewItemVariationRowsChange,
  publishIssues,
  hasUnsavedHubChanges,
  hubSettings,
  menuPreviewOpen,
  onOpenMenuPreview,
  onCloseMenuPreview,
  categoryPresetOptions,
  onMoveCategory,
  onNewCategoryPresetChange,
  onNewCategoryChange,
  onNewItemChange,
  onPizzaSizeRowsChange,
  onSelectCategory,
  onSelectItem,
  onBeginCreateItem,
  onCancelCreateItem,
  onCreateItem,
  onCreateCategory,
  onDuplicateItem,
  onDeleteCategory,
  onDeleteItem,
  onSaveDraft,
  onRequestPublish,
  onOpenImport,
  extrasSection,
  mealSection,
  onAddExtraTopping,
  onRemoveExtraTopping,
  onAddMealTemplate,
  onUpdateMealTemplate,
  onRemoveMealTemplate,
  publishDialogOpen,
  publishSummary,
  menuPublishing,
  onCancelPublish,
  onConfirmPublish,
  onUpdateSectionField,
  onUpdateItem,
  saveButtonStyle,
  readOnly = false,
}: HubMenuStudioProps) {
  const newItemDraftRef = useRef<HTMLElement | null>(null);
  const availabilityModes: MenuAvailabilityMode[] = ["live", "sold_out", "hidden"];
  const studioLocked = readOnly;
  const [leftTab, setLeftTab] = useState<MenuStudioLeftTab>("categories");
  const visibleSections = customerFacingMenuSections(menuSections);
  const categoryIsPizza = isHubMenuSectionPizza(selectedCategory);
  const mealTemplates = getHubMealTemplatesFromSection(mealSection);
  const creatingItemSection = menuSections.find((section) => section.id === newItem.sectionId) ?? null;
  const creatingItemIsPizza = isHubMenuSectionPizza(creatingItemSection);
  const creatingItemBuilderMode = getCategoryItemBuilderMode(creatingItemSection ?? selectedCategory);
  const selectedBuilderHint = describeCategoryItemBuilder(selectedCategory);
  const hubExtraToppings = getHubExtraToppingsFromSection(extrasSection);
  const selectedCustomerIndex = selectedCategory
    ? visibleSections.findIndex((section) => section.id === selectedCategory.id)
    : -1;
  const canMoveCategoryUp = selectedCustomerIndex > 0;
  const canMoveCategoryDown = selectedCustomerIndex >= 0 && selectedCustomerIndex < visibleSections.length - 1;

  useEffect(() => {
    if (!selectedCategory) {
      return;
    }
    if (isHubMenuExtrasLibrarySection(selectedCategory)) {
      setLeftTab("extras");
    } else if (isHubMenuMealLibrarySection(selectedCategory)) {
      setLeftTab("meals");
    } else if (!isHubMenuExtrasLibrarySection(selectedCategory) && !isHubMenuMealLibrarySection(selectedCategory)) {
      setLeftTab("categories");
    }
  }, [selectedCategory?.id]);

  const selectLeftTab = (tab: MenuStudioLeftTab) => {
    setLeftTab(tab);
    if (tab === "extras" && extrasSection) {
      onSelectCategory(extrasSection.id);
      return;
    }
    if (tab === "meals" && mealSection) {
      onSelectCategory(mealSection.id);
      return;
    }
    const firstCategory = visibleSections[0];
    if (firstCategory) {
      onSelectCategory(firstCategory.id);
    }
  };

  const showCategoryBuilder = leftTab === "categories" && selectedCategory && !isHubMenuStaffLibrarySection(selectedCategory);
  const showExtrasPanel = leftTab === "extras";
  const showMealsPanel = leftTab === "meals";

  return (
    <section className="hub-menu-studio" style={studioShell}>
      <HubMenuPreview
        open={menuPreviewOpen}
        onClose={onCloseMenuPreview}
        settings={hubSettings}
        menuSections={menuSections}
        hasUnsavedChanges={hasUnsavedHubChanges}
      />
      <div style={studioTopBar}>
        <div>
          <p style={eyebrow}>Menu studio</p>
          <h2 style={studioTitle}>Menu builder</h2>
          <p style={studioCopy}>
            Pick a category, add items (name, description, price, photo). Save draft anytime. Publish when ready for customers.
          </p>
        </div>
        <div className="he-btn-row" style={studioTopActions}>
          <button type="button" style={secondaryButton} onClick={onOpenMenuPreview}>
            Preview menu
          </button>
          {studioLocked ? null : (
            <>
              <button type="button" style={secondaryButton} onClick={onSaveDraft} disabled={menuPublishing}>
                {hasUnsavedHubChanges ? "Save draft *" : "Save draft"}
              </button>
              <button type="button" className="he-portal-primary" style={saveButtonStyle} onClick={onRequestPublish} disabled={menuPublishing}>
                Publish to customers
              </button>
            </>
          )}
        </div>
      </div>

      {studioLocked ? (
        <div style={readOnlyBanner}>View-only account — you can preview the menu but cannot edit or publish.</div>
      ) : null}

      <div style={studioLocked ? { pointerEvents: "none", opacity: 0.92 } : undefined}>
      {hasUnsavedHubChanges ? (
        <div style={draftBanner}>
          <strong>Draft in progress</strong>
          <p>Add categories and items freely — nothing changes for customers until you save &amp; publish.</p>
        </div>
      ) : (
        <div style={syncedBanner}>
          <strong>Menu is live</strong>
          <p>What you see here matches what customers see on Hull Eats (after their next refresh).</p>
        </div>
      )}

      {publishIssues.length > 0 ? (
        <div style={publishBanner}>
          <strong>Before you publish</strong>
          <ul style={publishList}>
            {publishIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="hub-menu-builder-layout">
          <aside className="hub-menu-category-sidebar" style={categorySidebar}>
            <div className="hub-menu-studio-tabs" style={leftTabRow} role="tablist" aria-label="Menu builder sections">
              <button
                type="button"
                role="tab"
                aria-selected={leftTab === "categories"}
                style={leftTab === "categories" ? leftTabActive : leftTabButton}
                onClick={() => selectLeftTab("categories")}
              >
                Categories
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={leftTab === "extras"}
                style={leftTab === "extras" ? leftTabActive : leftTabButton}
                onClick={() => selectLeftTab("extras")}
              >
                Toppings / extras
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={leftTab === "meals"}
                style={leftTab === "meals" ? leftTabActive : leftTabButton}
                onClick={() => selectLeftTab("meals")}
              >
                Make it a meal
              </button>
            </div>

            {leftTab === "categories" ? (
              <>
                <p style={sidebarHint}>Customer menu categories — set the price on each item, not here.</p>
                <nav style={categoryNav} aria-label="Menu categories">
              {visibleSections.map((section, index) => (
                <div key={section.id} style={categoryNavRow}>
                  <button
                    type="button"
                    className="hub-menu-category-nav-btn"
                    style={section.id === selectedCategory?.id ? categoryNavButtonActive : categoryNavButton}
                    onClick={() => onSelectCategory(section.id)}
                  >
                    <span style={categoryNavName}>{section.name}</span>
                    <span style={categoryNavMeta}>
                      {section.items.length} item{section.items.length === 1 ? "" : "s"}
                    </span>
                  </button>
                  <div style={categoryMoveCol}>
                    <button
                      type="button"
                      style={moveButton}
                      disabled={studioLocked || index === 0}
                      title="Move category up"
                      onClick={() => onMoveCategory(section.id, "up")}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      style={moveButton}
                      disabled={studioLocked || index === visibleSections.length - 1}
                      title="Move category down"
                      onClick={() => onMoveCategory(section.id, "down")}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
                </nav>
                <section style={sidebarAddCategory}>
                  <p style={sectionLabel}>New category</p>
                  <label style={field}>
                    <span style={darkFieldLabel}>Type</span>
                    <select
                      style={lightInput}
                      value={newCategory.presetId}
                      disabled={studioLocked}
                      onChange={(event) => onNewCategoryPresetChange(event.target.value)}
                    >
                      {categoryPresetOptions.map((option: HubMenuCategoryPresetChoice) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={field}>
                    <span style={darkFieldLabel}>Name on menu</span>
                    <input
                      style={lightInput}
                      value={newCategory.name}
                      onChange={(event) => onNewCategoryChange({ name: event.target.value })}
                      placeholder="e.g. Pizzas"
                      disabled={studioLocked}
                    />
                  </label>
                  <button type="button" style={primaryButtonCompact} onClick={onCreateCategory} disabled={studioLocked}>
                    Add category
                  </button>
                </section>
              </>
            ) : leftTab === "extras" ? (
              <p style={sidebarHint}>Build your topping list here. Tick which toppings each item offers in the Categories tab.</p>
            ) : (
              <p style={sidebarHint}>Create meal deals here, then enable them per item under Categories.</p>
            )}
          </aside>

          <div className="hub-menu-builder-workspace" style={builderWorkspace}>
            <div className="hub-menu-builder-main" style={builderMain}>
              {showExtrasPanel && extrasSection ? (
                <div className="hub-menu-staff-library-editor" style={staffLibraryEditor}>
                  <HubMenuExtrasLibrary
                    section={extrasSection}
                    onAddTopping={onAddExtraTopping}
                    onRemoveTopping={onRemoveExtraTopping}
                    readOnly={studioLocked}
                  />
                </div>
              ) : null}

              {showMealsPanel && mealSection ? (
                <div className="hub-menu-staff-library-editor" style={staffLibraryEditor}>
                  <HubMenuMealLibrary
                    section={mealSection}
                    onAddTemplate={onAddMealTemplate}
                    onUpdateTemplate={onUpdateMealTemplate}
                    onRemoveTemplate={onRemoveMealTemplate}
                    readOnly={studioLocked}
                  />
                </div>
              ) : null}

              {showCategoryBuilder ? (
                <>
              <aside className="hub-menu-item-sidebar" style={itemSidebar}>
                <div style={itemSidebarHeader}>
                  <div>
                    <p style={sectionLabel}>{selectedCategory.name}</p>
                    <p style={itemsPanelCopy}>{selectedBuilderHint}</p>
                  </div>
                  <button type="button" style={primaryButtonCompact} onClick={() => onBeginCreateItem(selectedCategory.id)}>
                    + Add item
                  </button>
                </div>
                <div style={itemRail}>
                  {selectedCategory.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      style={item.id === selectedItem?.id && !isCreatingNewItem ? itemRailButtonActive : itemRailButton}
                      onClick={() => onSelectItem(item.id)}
                    >
                      <strong>{item.name || "Untitled"}</strong>
                      <span>
                        {getMenuItemPriceLabel(item)} · {describeMenuAvailability(getMenuAvailabilityMode(item)).label}
                      </span>
                    </button>
                  ))}
                  {selectedCategory.items.length === 0 ? (
                    <div style={emptyStateCard}>
                      No items yet. Tap <strong>+ Add item</strong> — e.g. 6 Chicken Wings or Margherita.
                    </div>
                  ) : null}
                </div>
              </aside>

              <div className="hub-menu-item-editor" style={itemEditorColumn}>
                <details style={categorySettingsDetails}>
                  <summary style={categorySettingsSummary}>Category settings</summary>
                  <div style={builderGrid}>
                    <label style={field}>
                      <span style={darkFieldLabel}>Category name</span>
                      <input
                        style={lightInput}
                        value={selectedCategory.name}
                        onChange={(event) => onUpdateSectionField("name", event.target.value)}
                      />
                    </label>
                    <label style={field}>
                      <span style={darkFieldLabel}>Note (optional)</span>
                      <input
                        style={lightInput}
                        value={selectedCategory.description ?? ""}
                        onChange={(event) => onUpdateSectionField("description", event.target.value)}
                      />
                    </label>
                  </div>
                  <div style={inlineActions}>
                    <button type="button" style={dangerButtonSmall} onClick={onDeleteCategory}>
                      Delete category
                    </button>
                  </div>
                </details>

          {isCreatingNewItem ? (
            <section ref={newItemDraftRef} style={newItemPanel}>
              <div style={panelHeaderRow}>
                <div>
                  <h3 style={panelHeading}>New item — {creatingItemSection?.name ?? selectedCategory.name}</h3>
                </div>
                <button type="button" style={secondaryButtonSmall} onClick={onCancelCreateItem}>
                  Cancel
                </button>
              </div>
              <div style={builderGrid}>
                <label style={field}>
                  <span style={darkFieldLabel}>Name</span>
                  <input
                    style={lightInput}
                    value={newItem.name}
                    onChange={(event) => onNewItemChange({ name: event.target.value })}
                    placeholder={
                      creatingItemIsPizza
                        ? "e.g. Margherita"
                        : creatingItemSection?.presetKey === "chicken"
                          ? "e.g. 6 Chicken Wings"
                          : "e.g. Cheeseburger"
                    }
                    autoFocus
                  />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Description</span>
                  <textarea
                    style={{ ...lightInput, minHeight: 72, paddingTop: 10, paddingBottom: 10, resize: "vertical" }}
                    value={newItem.description}
                    onChange={(event) => onNewItemChange({ description: event.target.value })}
                    placeholder="Optional"
                  />
                </label>
                {creatingItemBuilderMode === "pizza-sizes" ? (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <PizzaSizeDraftPanel rows={pizzaSizeRows} onChange={onPizzaSizeRowsChange} />
                  </div>
                ) : (
                  <label style={field}>
                    <span style={darkFieldLabel}>Price (£)</span>
                    <input
                      type="number"
                      step="0.01"
                      style={lightInput}
                      value={newItem.price}
                      onChange={(event) => onNewItemChange({ price: event.target.value })}
                      placeholder="e.g. 7.99"
                    />
                  </label>
                )}
                <MenuItemImageField
                  value={newItem.imageUrl || undefined}
                  onChange={(imageUrl) => onNewItemChange({ imageUrl: imageUrl ?? "" })}
                  disabled={studioLocked}
                />
              </div>
              {creatingItemBuilderMode === "fixed-price" ? (
                <section style={choicesSection}>
                  <p style={sectionLabel}>Flavours &amp; options (optional)</p>
                  <ManualVariationsEditor
                    rows={newItemVariationRows}
                    readOnly={studioLocked}
                    hint="Add choices customers pick once — e.g. BBQ, Spicy, Buffalo. Extra £ is added on top of the item price (use 0 if same price)."
                    placeholderLabel="e.g. BBQ"
                    onChange={onNewItemVariationRowsChange}
                  />
                </section>
              ) : null}
              <button type="button" style={primaryButton} onClick={onCreateItem}>
                Save item
              </button>
            </section>
          ) : null}

          {!isCreatingNewItem && selectedItem ? (
            <section style={editItemPanel}>
              <div style={panelHeaderRow}>
                <div>
                  <p style={eyebrow}>Editing product</p>
                  <h3 style={panelHeading}>{selectedItem.name}</h3>
                </div>
                <div style={inlineActions}>
                  <button
                    type="button"
                    style={secondaryButtonSmall}
                    onClick={() => onDuplicateItem(selectedItem)}
                    title="Copy this item so you can change the name and price (e.g. 6 wings → 8 wings)"
                  >
                    Duplicate listing
                  </button>
                  <button type="button" style={dangerButtonSmall} onClick={onDeleteItem}>
                    Remove
                  </button>
                </div>
              </div>

              <div style={builderGrid}>
                <label style={field}>
                  <span style={darkFieldLabel}>Product name</span>
                  <input
                    style={lightInput}
                    value={selectedItem.name}
                    onChange={(event) => onUpdateItem((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                {itemUsesSizePricing(selectedItem) ? (
                  <div style={sizePriceNotice}>
                    <strong>Prices are on each size</strong>
                    <p>Edit size prices in the <em>Sizes &amp; toppings</em> section below — not here.</p>
                  </div>
                ) : (
                  <label style={field}>
                    <span style={darkFieldLabel}>Price (£)</span>
                    <input
                      type="number"
                      step="0.01"
                      style={lightInput}
                      value={moneyInput(selectedItem.price)}
                      onChange={(event) => onUpdateItem((current) => ({ ...current, price: Number(event.target.value) || 0 }))}
                    />
                  </label>
                )}
                <label style={{ ...field, gridColumn: "1 / -1" }}>
                  <span style={darkFieldLabel}>Description</span>
                  <textarea
                    style={{ ...lightInput, minHeight: 88, paddingTop: 12, paddingBottom: 12, resize: "vertical" }}
                    value={selectedItem.description}
                    onChange={(event) => onUpdateItem((current) => ({ ...current, description: event.target.value }))}
                  />
                </label>
                <MenuItemImageField
                  value={selectedItem.imageUrl}
                  onChange={(imageUrl) => onUpdateItem((current) => ({ ...current, imageUrl }))}
                  disabled={studioLocked}
                />
              </div>

              <section style={availabilityPanel}>
                <p style={sectionLabel}>Customer visibility</p>
                <div style={availabilityGrid}>
                  {availabilityModes.map((mode) => {
                    const meta = describeMenuAvailability(mode);
                    const active = getMenuAvailabilityMode(selectedItem) === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        style={active ? availabilityCardActive : availabilityCard}
                        onClick={() => onUpdateItem((current) => applyMenuAvailabilityMode(current, mode))}
                      >
                        <strong>{meta.label}</strong>
                        <span>{meta.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <label style={{ ...toggleLabel, marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={selectedItem.requiresIdVerification ?? false}
                  onChange={(event) => onUpdateItem((current) => ({ ...current, requiresIdVerification: event.target.checked }))}
                />
                <span>Age-restricted (ID check at delivery)</span>
              </label>

              <section style={choicesSection}>
                <p style={sectionLabel}>Extra toppings</p>
                <p style={choicesSectionCopy}>All toppings are ticked by default — untick any this item should not offer.</p>
                <ItemExtrasEditor
                  item={selectedItem}
                  toppings={hubExtraToppings}
                  readOnly={studioLocked}
                  onUpdateItem={onUpdateItem}
                />
              </section>

              <section style={choicesSection}>
                <p style={sectionLabel}>Make it a meal</p>
                <HubMenuItemMealPicker
                  item={selectedItem}
                  templates={mealTemplates}
                  readOnly={studioLocked}
                  onUpdateItem={onUpdateItem}
                />
              </section>

              <section style={choicesSection}>
                <p style={sectionLabel}>Flavours &amp; options (optional)</p>
                <ItemManualVariationsEditor
                  item={selectedItem}
                  readOnly={studioLocked}
                  onUpdateItem={onUpdateItem}
                  hint="One choice per order — e.g. BBQ, Spicy, Buffalo. Extra £ adds to the item price."
                />
              </section>

              <details style={categorySettingsDetails}>
                <summary style={categorySettingsSummary}>Advanced — sizes, crust &amp; choice groups</summary>
                <div style={{ marginTop: 10 }}>
                  <HubMenuCustomisationBuilder
                    item={selectedItem}
                    onChangeComponents={(components) => onUpdateItem((current) => ({ ...current, components }))}
                    onChangeOptionGroups={(optionGroups) => onUpdateItem((current) => ({ ...current, optionGroups }))}
                  />
                </div>
              </details>
            </section>
          ) : null}

          {showCategoryBuilder && !isCreatingNewItem && !selectedItem ? (
            <div style={emptyStateCard}>
              Select a product from the list, or tap <strong>+ Add item</strong> to add one to {selectedCategory.name}.
            </div>
          ) : null}
              </div>
                </>
              ) : leftTab === "categories" ? (
                <div style={emptyStateCard}>
                  Add a category on the left, then add items and set each item&apos;s price here.
                </div>
              ) : null}
            </div>

            <HubMenuLivePreview settings={hubSettings} menuSections={menuSections} hasUnsavedChanges={hasUnsavedHubChanges} />
          </div>
      </div>
      </div>

      {studioLocked ? null : (
      <HubMenuPublishDialog
        open={publishDialogOpen}
        summary={publishSummary}
        publishing={menuPublishing}
        onCancel={onCancelPublish}
        onConfirm={onConfirmPublish}
      />
      )}
    </section>
  );
}

const studioShell: CSSProperties = { display: "grid", gap: 16 };
const studioTopBar: CSSProperties = { display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16, alignItems: "flex-end" };
const studioTopActions: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 10 };
const eyebrow: CSSProperties = { margin: 0, color: "#0680a6", fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const studioTitle: CSSProperties = { margin: "6px 0 0", fontSize: "clamp(1.5rem, 4vw, 2rem)", fontFamily: "Georgia, serif" };
const studioCopy: CSSProperties = { margin: "8px 0 0", color: "#5b6470", lineHeight: 1.6 };
const stepRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };
const stepPill: CSSProperties = {
  padding: "8px 14px",
  borderRadius: 999,
  background: "rgba(7, 155, 200, 0.1)",
  color: "#0680a6",
  fontWeight: 800,
  fontSize: 13,
};
const publishBanner: CSSProperties = {
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(181, 88, 0, 0.35)",
  background: "rgba(255, 244, 233, 1)",
  color: "#5b3d12",
};
const publishList: CSSProperties = { margin: "10px 0 0", paddingLeft: 20, lineHeight: 1.6 };
const publishReady: CSSProperties = {
  padding: 12,
  borderRadius: 14,
  border: "1px solid rgba(23, 156, 107, 0.25)",
  background: "rgba(23, 156, 107, 0.08)",
  color: "#0f5e3d",
  fontWeight: 700,
};
const readOnlyBanner: CSSProperties = {
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(15, 17, 21, 0.14)",
  background: "rgba(15, 17, 21, 0.05)",
  color: "#3d4652",
  fontWeight: 700,
  lineHeight: 1.5,
};
const draftBanner: CSSProperties = {
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(7, 155, 200, 0.35)",
  background: "rgba(7, 155, 200, 0.1)",
  color: "#064f68",
  display: "grid",
  gap: 6,
};
const syncedBanner: CSSProperties = {
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(23, 156, 107, 0.25)",
  background: "rgba(23, 156, 107, 0.08)",
  color: "#0f5e3d",
  display: "grid",
  gap: 6,
};
const availabilityPanel: CSSProperties = { display: "grid", gap: 10 };
const availabilityGrid: CSSProperties = { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" };
const availabilityCard: CSSProperties = {
  display: "grid",
  gap: 6,
  textAlign: "left",
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "#fff",
  cursor: "pointer",
};
const availabilityCardActive: CSSProperties = {
  ...availabilityCard,
  borderColor: "rgba(7, 155, 200, 0.45)",
  background: "rgba(7, 155, 200, 0.1)",
  color: "#064f68",
};
const categoryCreateCard: CSSProperties = {
  padding: 16,
  borderRadius: 16,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
  display: "grid",
  gap: 10,
};
const categoryCreateHint: CSSProperties = { margin: 0, color: "#5b6470", lineHeight: 1.55, fontSize: "0.9rem" };
const quickPresetRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };
const quickPresetChip: CSSProperties = {
  padding: "8px 14px",
  borderRadius: 999,
  border: "1px solid rgba(15, 17, 21, 0.14)",
  background: "#fff",
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
};
const quickPresetChipActive: CSSProperties = {
  ...quickPresetChip,
  borderColor: "rgba(7, 155, 200, 0.45)",
  background: "rgba(7, 155, 200, 0.12)",
  color: "#064f68",
};
const categoryCreateRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(100px, 140px) auto",
  gap: 10,
  alignItems: "end",
};
const categoryCreateRowSimple: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(140px, 200px) minmax(0, 1fr) minmax(100px, 120px) auto",
  gap: 10,
  alignItems: "end",
};
const categorySelectField: CSSProperties = { display: "grid", gap: 6 };
const categoryNameField: CSSProperties = { display: "grid", gap: 6 };
const defaultPriceField: CSSProperties = { display: "grid", gap: 6 };
const pizzaTip: CSSProperties = {
  margin: "8px 0 0",
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(7, 155, 200, 0.08)",
  border: "1px solid rgba(7, 155, 200, 0.22)",
  color: "#064f68",
  fontSize: "0.84rem",
  lineHeight: 1.5,
};
const sizePriceNotice: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "rgba(7, 155, 200, 0.08)",
  border: "1px solid rgba(7, 155, 200, 0.2)",
  color: "#064f68",
  display: "grid",
  gap: 4,
};
const choicesSectionCopy: CSSProperties = { margin: "0 0 10px", color: "#5b6470", lineHeight: 1.55, fontSize: "0.88rem" };
const builderLayout: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(168px, 200px) minmax(0, 1fr)",
  gap: 14,
  alignItems: "start",
  minHeight: 420,
};
const builderWorkspace: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 280px)",
  gap: 14,
  alignItems: "start",
  minWidth: 0,
};
const staffLibraryEditor: CSSProperties = { gridColumn: "1 / -1", display: "grid", gap: 12, minWidth: 0 };
const categorySidebar: CSSProperties = {
  display: "grid",
  gap: 10,
  alignContent: "start",
  padding: 14,
  borderRadius: 16,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
  position: "sticky",
  top: 12,
  maxHeight: "min(72vh, 720px)",
  overflowY: "auto",
};
const sidebarTitle: CSSProperties = { margin: 0, fontWeight: 900, fontSize: "0.82rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#5b6470" };
const sidebarHint: CSSProperties = { margin: 0, fontSize: "0.78rem", color: "#7a8491", lineHeight: 1.4 };
const sidebarDivider: CSSProperties = { height: 1, background: "rgba(15, 17, 21, 0.1)", margin: "4px 0" };
const categoryNav: CSSProperties = { display: "grid", gap: 6 };
const categoryNavRow: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 4, alignItems: "stretch" };
const categoryMoveCol: CSSProperties = { display: "grid", gap: 4 };
const moveButton: CSSProperties = {
  width: 32,
  minHeight: 32,
  borderRadius: 8,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 14,
  padding: 0,
};
const categoryNavStaff: CSSProperties = {
  display: "grid",
  gap: 2,
  textAlign: "left",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(7, 155, 200, 0.2)",
  background: "rgba(7, 155, 200, 0.06)",
  cursor: "pointer",
  width: "100%",
};
const categoryNavStaffActive: CSSProperties = { ...categoryNavStaff, borderColor: "rgba(7, 155, 200, 0.45)", background: "rgba(7, 155, 200, 0.14)" };
const categoryNavMeal: CSSProperties = {
  ...categoryNavStaff,
  borderColor: "rgba(155, 74, 18, 0.22)",
  background: "rgba(255, 244, 232, 0.6)",
};
const categoryNavMealActive: CSSProperties = { ...categoryNavMeal, borderColor: "rgba(155, 74, 18, 0.45)", background: "rgba(255, 244, 232, 1)" };
const categoryNavButton: CSSProperties = {
  display: "grid",
  gap: 2,
  textAlign: "left",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fafbfc",
  cursor: "pointer",
  width: "100%",
};
const categoryNavButtonActive: CSSProperties = {
  ...categoryNavButton,
  borderColor: "rgba(7, 155, 200, 0.45)",
  background: "rgba(7, 155, 200, 0.12)",
  color: "#0680a6",
};
const categoryNavName: CSSProperties = { fontWeight: 800, fontSize: "0.92rem" };
const categoryNavMeta: CSSProperties = { fontSize: "0.78rem", opacity: 0.8 };
const leftTabRow: CSSProperties = { display: "grid", gap: 6 };
const leftTabButton: CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "#fff",
  fontWeight: 800,
  fontSize: "0.86rem",
  cursor: "pointer",
};
const leftTabActive: CSSProperties = {
  ...leftTabButton,
  borderColor: "rgba(7, 155, 200, 0.45)",
  background: "rgba(7, 155, 200, 0.12)",
  color: "#064f68",
};
const sidebarAddCategory: CSSProperties = {
  display: "grid",
  gap: 8,
  paddingTop: 10,
  marginTop: 6,
  borderTop: "1px solid rgba(15, 17, 21, 0.1)",
};
const builderMain: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(200px, 240px) minmax(0, 1fr)",
  gap: 14,
  alignItems: "start",
  minWidth: 0,
};
const itemSidebar: CSSProperties = {
  display: "grid",
  gap: 10,
  alignContent: "start",
  padding: 14,
  borderRadius: 16,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
  maxHeight: "min(72vh, 720px)",
  overflowY: "auto",
};
const itemSidebarHeader: CSSProperties = { display: "grid", gap: 10 };
const itemEditorColumn: CSSProperties = { display: "grid", gap: 14, alignContent: "start", minWidth: 0 };
const categorySettingsDetails: CSSProperties = { borderRadius: 14, border: "1px solid rgba(15, 17, 21, 0.1)", background: "#fff", padding: 12 };
const categoryOrderRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  margin: "10px 0 12px",
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(7, 155, 200, 0.06)",
  border: "1px solid rgba(7, 155, 200, 0.16)",
};
const categoryOrderButtons: CSSProperties = { gap: 8 };
const categorySettingsSummary: CSSProperties = { cursor: "pointer", fontWeight: 800, color: "#101216" };
const itemsPanel: CSSProperties = { display: "grid", gap: 12, padding: 16, borderRadius: 16, border: "1px solid rgba(15, 17, 21, 0.1)", background: "#fff" };
const itemsPanelHeader: CSSProperties = { display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "flex-start" };
const itemsPanelCopy: CSSProperties = { margin: "4px 0 0", color: "#5b6470", fontSize: "0.9rem" };
const itemRail: CSSProperties = { display: "grid", gap: 8 };
const itemRailButton: CSSProperties = {
  display: "grid",
  gap: 4,
  textAlign: "left",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fafbfc",
  cursor: "pointer",
};
const itemRailButtonActive: CSSProperties = { ...itemRailButton, borderColor: "rgba(7, 155, 200, 0.45)", background: "rgba(7, 155, 200, 0.1)" };
const newItemPanel: CSSProperties = {
  display: "grid",
  gap: 14,
  padding: 18,
  borderRadius: 16,
  border: "1px solid rgba(7, 155, 200, 0.35)",
  background: "linear-gradient(180deg, rgba(35, 205, 255, 0.08), #fff)",
};
const editItemPanel: CSSProperties = { display: "grid", gap: 16, padding: 18, borderRadius: 16, border: "1px solid rgba(15, 17, 21, 0.1)", background: "#fff" };
const choiceSetupPanel: CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 16,
  borderRadius: 16,
  border: "2px solid rgba(7, 155, 200, 0.35)",
  background: "rgba(7, 155, 200, 0.06)",
};
const choicesSection: CSSProperties = { display: "grid", gap: 12 };
const templateGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 };
const templateButton: CSSProperties = {
  display: "grid",
  gap: 6,
  textAlign: "left",
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(7, 155, 200, 0.25)",
  background: "#fff",
  cursor: "pointer",
};
const panelHeaderRow: CSSProperties = { display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "flex-start" };
const panelHeading: CSSProperties = { margin: "4px 0 0", fontSize: "1.35rem", fontFamily: "Georgia, serif" };
const sectionLabel: CSSProperties = { margin: 0, fontWeight: 900, color: "#101216", fontSize: "0.95rem" };
const inlineActions: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };
const field: CSSProperties = { display: "grid", gap: 8 };
const darkFieldLabel: CSSProperties = { color: "#3d4654", fontSize: 12, fontWeight: 800 };
const lightInput: CSSProperties = {
  minHeight: 44,
  borderRadius: 12,
  border: "1px solid rgba(15, 17, 21, 0.14)",
  background: "#fff",
  padding: "0 12px",
  flex: "1 1 160px",
  minWidth: 0,
};
const builderGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 };
const toggleRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 16 };
const toggleLabel: CSSProperties = { display: "flex", alignItems: "center", gap: 10, fontWeight: 700, color: "#3d4654" };
const primaryButton: CSSProperties = {
  minHeight: 44,
  padding: "0 18px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(180deg, #23cdff, #079bc8)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};
const primaryButtonCompact: CSSProperties = { ...primaryButton, minHeight: 40, padding: "0 14px", fontSize: 14, width: "100%" };
const secondaryButton: CSSProperties = {
  minHeight: 44,
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid rgba(7, 155, 200, 0.35)",
  background: "rgba(7, 155, 200, 0.08)",
  color: "#0680a6",
  fontWeight: 800,
  cursor: "pointer",
};
const secondaryButtonLink: CSSProperties = {
  ...secondaryButton,
  display: "inline-flex",
  alignItems: "center",
  textDecoration: "none",
};
const secondaryButtonSmall: CSSProperties = { ...secondaryButton, minHeight: 38, padding: "0 12px", fontSize: 14 };
const dangerButtonSmall: CSSProperties = {
  minHeight: 38,
  padding: "0 12px",
  borderRadius: 12,
  border: "1px solid rgba(255, 95, 95, 0.35)",
  background: "rgba(255, 95, 95, 0.1)",
  color: "#8a2121",
  fontWeight: 800,
  cursor: "pointer",
};
const emptyStateCard: CSSProperties = {
  padding: 14,
  borderRadius: 14,
  border: "1px dashed rgba(15, 17, 21, 0.2)",
  background: "rgba(255,255,255,0.7)",
  color: "#5b6470",
  lineHeight: 1.5,
};
