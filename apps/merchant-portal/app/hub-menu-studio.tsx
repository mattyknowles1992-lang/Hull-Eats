"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { HubMenuSection, HubSettings, MenuItem } from "@hull-eats/types";
import {
  HUB_MENU_CATEGORY_CUSTOM_ID,
  hubMenuCategorySelectOptions,
  isHubMenuStaffLibrarySection,
  getCategoryCustomerDescription,
  isHubMenuOrderTicketCategory,
  isHubMenuMealDealsCategory,
  isHubMenuSectionPizza,
  writeCategoryCustomerDescriptionOnSection,
  type HubMenuCategoryPresetChoice,
} from "@hull-eats/types";

import { HubMenuCategoryTabs, isMenuStudioStaffSection } from "./hub-menu-category-tabs";
import { HubMenuExtrasLibrary } from "./hub-menu-extras-library";
import { HubMenuSaladLibrary } from "./hub-menu-salad-library";
import { HubMenuSaucesLibrary } from "./hub-menu-sauces-library";
import { HubMenuOrderTicketBuilder } from "./hub-menu-order-ticket-builder";
import { HubMenuPizzaOrderBuilder } from "./hub-menu-pizza-order-builder";
import { HubMenuItemSubGroupField } from "./hub-menu-item-subgroup-field";
import { HubMenuPublishDialog } from "./hub-menu-publish-dialog";
import { MenuItemVisibilitySelect } from "./hub-menu-item-visibility-select";
import { MenuItemImageField } from "./menu-item-image-field";
import {
  applyMenuAvailabilityMode,
  customerFacingMenuSections,
  describeCategoryItemBuilder,
  describeMenuAvailability,
  formatMenuMoney,
  getCategoryItemBuilderMode,
  getHubExtraToppingsFromSection,
  getHubSaucesFromSection,
  getHubSaladsFromSection,
  getHubMealTemplatesFromSection,
  getMenuAvailabilityMode,
  getMenuItemPriceLabel,
  itemUsesSizePricing,
  type MenuAvailabilityMode,
  type HubMenuBoardKind,
  type HubMenuBoardPublishMode,
  type HubMenuBoardRecord,
  type MenuPublishIssue,
  type MenuPublishSummary,
  getPublishIssueDomTargetId,
  itemHasPublishIssue,
} from "./menu-studio-core";
import { HubMenuItemIngredients } from "./hub-menu-item-ingredients";
import { HubMenuItemOptionsPanel } from "./hub-menu-item-options-panel";
import { HubMenuBoardsBar } from "./hub-menu-boards-bar";
import { HubMenuMealDealBundlePicker } from "./hub-menu-meal-deal-bundle-picker";
import { HubMenuMealLibrary } from "./hub-menu-meal-library";
import { HubMenuPreview } from "./hub-menu-preview";
import {
  PizzaSizeDraftPanel,
  applyPizzaSizesOrClearItem,
  createInitialPizzaSizeRows,
  pizzaSizeRowsForItem,
  readPizzaSizeColumnsFromSection,
  simplifyPizzaMenuItem,
  type PizzaSizeRow,
} from "./pizza-size-draft";

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
  menuSubGroup: string;
  requiresIdVerification: boolean;
};

type HubMenuStudioProps = {
  menuSections: HubMenuSection[];
  selectedCategory: HubMenuSection | null;
  selectedItem: MenuItem | null;
  selectedItemId: string;
  isCreatingNewItem: boolean;
  newCategory: CreateCategoryFormState;
  newItem: CreateItemFormState;
  pizzaSizeRows: PizzaSizeRow[];
  newItemComponents: MenuItem["components"];
  onNewItemComponentsChange: (components: MenuItem["components"]) => void;
  newItemOptionGroups: MenuItem["optionGroups"];
  onNewItemOptionGroupsChange: (optionGroups: MenuItem["optionGroups"]) => void;
  hasUnsavedHubChanges: boolean;
  menuHubPersistState?: "idle" | "saving" | "saved" | "error";
  hubSettings: HubSettings;
  menuPreviewOpen: boolean;
  onOpenMenuPreview: () => void;
  onCloseMenuPreview: () => void;
  storeSlug?: string;
  customerWebBaseUrl?: string;
  categoryPresetOptions: HubMenuCategoryPresetChoice[];
  onReorderCategory: (sectionId: string, toIndex: number) => void;
  onNewCategoryPresetChange: (presetId: string) => void;
  onNewCategoryChange: (patch: Partial<CreateCategoryFormState>) => void;
  onNewItemChange: (patch: Partial<CreateItemFormState>) => void;
  onPizzaSizeRowsChange: (rows: PizzaSizeRow[]) => void;
  onSelectCategory: (sectionId: string) => void;
  onSelectItem: (itemId: string) => void;
  onBeginCreateItem: (sectionId: string, menuSubGroup?: string) => void;
  onCancelCreateItem: () => void;
  onCreateItem: (availabilityMode?: MenuAvailabilityMode) => void;
  onCreateCategory: () => void;
  onDuplicateItem: (item: MenuItem) => void;
  onDeleteCategory: () => void;
  onDeleteItem: () => void;
  onSaveDraft: () => void;
  onRequestPublish: () => void;
  onOpenImport: () => void;
  extrasSection: HubMenuSection | null;
  saucesSection: HubMenuSection | null;
  saladSection: HubMenuSection | null;
  mealSection: HubMenuSection | null;
  onAddExtraTopping: (item: MenuItem) => void;
  onUpdateExtraToppingPrice: (itemId: string, price: number) => void;
  onRemoveExtraTopping: (itemId: string) => void;
  onAddSauce: (item: MenuItem) => void;
  onUpdateSaucePrice: (itemId: string, extraPrice: number) => void;
  onRemoveSauce: (itemId: string) => void;
  onAddSalad: (item: MenuItem) => void;
  onUpdateSaladPrice: (itemId: string, extraPrice: number) => void;
  onRemoveSalad: (itemId: string) => void;
  onAddMealTemplate: (item: MenuItem) => void;
  onUpdateMealTemplate: (itemId: string, updater: (item: MenuItem) => MenuItem) => void;
  onRemoveMealTemplate: (itemId: string) => void;
  publishDialogOpen: boolean;
  publishSummary: MenuPublishSummary;
  publishIssues: MenuPublishIssue[];
  focusedPublishIssueId: string | null;
  publishWithKnownIssues: boolean;
  onPublishWithKnownIssuesChange: (checked: boolean) => void;
  onNavigateToPublishIssue: (issue: MenuPublishIssue) => void;
  menuPublishing: boolean;
  onCancelPublish: () => void;
  onConfirmPublish: () => void;
  menuBoards: HubMenuBoardRecord[];
  editingMenuBoardId: string | null;
  onSelectMainMenu: () => void;
  onSelectMenuBoard: (boardId: string) => void;
  onCreateMenuBoard: (kind: HubMenuBoardKind) => void;
  onUpdateMenuBoardPublishMode: (boardId: string, mode: HubMenuBoardPublishMode) => void;
  onRenameMenuBoard: (boardId: string, name: string) => void;
  onUpdateSectionField: (field: "name" | "description", value: string | number | null) => void;
  onPatchSelectedCategory: (updater: (section: HubMenuSection) => HubMenuSection) => void;
  onUpdateItem: (updater: (item: MenuItem) => MenuItem) => void;
  onOpenPartsOptionSettings?: () => void;
  saveButtonStyle: CSSProperties;
  readOnly?: boolean;
};

const moneyInput = (value: number) => (Number.isFinite(value) ? value : 0);

export function HubMenuStudio({
  menuSections,
  selectedCategory,
  selectedItem,
  selectedItemId,
  isCreatingNewItem,
  newCategory,
  newItem,
  pizzaSizeRows,
  newItemComponents,
  onNewItemComponentsChange,
  newItemOptionGroups,
  onNewItemOptionGroupsChange,
  hasUnsavedHubChanges,
  menuHubPersistState = "idle",
  hubSettings,
  menuPreviewOpen,
  onOpenMenuPreview,
  onCloseMenuPreview,
  storeSlug = "",
  customerWebBaseUrl = "",
  categoryPresetOptions,
  onReorderCategory,
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
  saucesSection,
  saladSection,
  mealSection,
  onAddExtraTopping,
  onUpdateExtraToppingPrice,
  onRemoveExtraTopping,
  onAddSauce,
  onUpdateSaucePrice,
  onRemoveSauce,
  onAddSalad,
  onUpdateSaladPrice,
  onRemoveSalad,
  onAddMealTemplate,
  onUpdateMealTemplate,
  onRemoveMealTemplate,
  publishDialogOpen,
  publishSummary,
  publishIssues,
  focusedPublishIssueId,
  publishWithKnownIssues,
  onPublishWithKnownIssuesChange,
  onNavigateToPublishIssue,
  menuPublishing,
  onCancelPublish,
  onConfirmPublish,
  menuBoards,
  editingMenuBoardId,
  onSelectMainMenu,
  onSelectMenuBoard,
  onCreateMenuBoard,
  onUpdateMenuBoardPublishMode,
  onRenameMenuBoard,
  onUpdateSectionField,
  onPatchSelectedCategory,
  onUpdateItem,
  onOpenPartsOptionSettings,
  saveButtonStyle,
  readOnly = false,
}: HubMenuStudioProps) {
  const newItemDraftRef = useRef<HTMLElement | null>(null);
  const studioLocked = readOnly;
  const visibleSections = customerFacingMenuSections(menuSections);
  const hasCustomerMenu = visibleSections.length > 0;
  const categoryIsPizza = isHubMenuSectionPizza(selectedCategory);
  const creatingItemSection = menuSections.find((section) => section.id === newItem.sectionId) ?? null;
  const editingPizzaItem = Boolean(selectedItem && (categoryIsPizza || isHubMenuSectionPizza(creatingItemSection)));
  const [editPizzaSizeRows, setEditPizzaSizeRows] = useState<PizzaSizeRow[]>(() => createInitialPizzaSizeRows());
  const mealTemplates = getHubMealTemplatesFromSection(mealSection, menuSections);
  const creatingItemIsPizza = isHubMenuSectionPizza(creatingItemSection);
  const creatingItemBuilderMode = getCategoryItemBuilderMode(creatingItemSection ?? selectedCategory);

  const newItemDraft = useMemo(
    (): MenuItem => ({
      id: "new-item-draft",
      categoryId: newItem.sectionId,
      name: newItem.name,
      description: newItem.description,
      price: Number(newItem.price) || 0,
      imageUrl: newItem.imageUrl.trim() || undefined,
      menuSubGroup: newItem.menuSubGroup.trim() || undefined,
      isActive: true,
      trackStock: false,
      stockQuantity: null,
      stockStatus: "in_stock",
      allowBackorder: false,
      maxPerOrder: null,
      requiresIdVerification: newItem.requiresIdVerification,
      sortOrder: 0,
      components: newItemComponents,
      optionGroups: newItemOptionGroups,
    }),
    [newItem, newItemComponents, newItemOptionGroups],
  );

  const patchNewItemDraft = (updater: (item: MenuItem) => MenuItem) => {
    const next = updater(newItemDraft);
    onNewItemComponentsChange(next.components);
    onNewItemOptionGroupsChange(next.optionGroups);
    onNewItemChange({ description: next.description });
  };
  const selectedBuilderHint = describeCategoryItemBuilder(selectedCategory);
  const usesPizzaOrderBuilder = isHubMenuSectionPizza(selectedCategory);
  const usesOrderTicketBuilder = isHubMenuOrderTicketCategory(selectedCategory);
  const creatingOrderTicketItem = isHubMenuOrderTicketCategory(creatingItemSection);
  const editingOrderTicketItem = isHubMenuOrderTicketCategory(selectedCategory);

  useEffect(() => {
    if (!focusedPublishIssueId) {
      return;
    }
    const issue = publishIssues.find((entry) => entry.id === focusedPublishIssueId);
    if (!issue) {
      return;
    }
    const targetId = getPublishIssueDomTargetId(issue);
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [focusedPublishIssueId, publishIssues, selectedCategory?.id, selectedItemId, isCreatingNewItem]);
  const hubExtraToppings = getHubExtraToppingsFromSection(extrasSection);
  const hubSauces = getHubSaucesFromSection(saucesSection);
  const hubSalads = getHubSaladsFromSection(saladSection);
  useEffect(() => {
    if (selectedItem && editingPizzaItem && itemUsesSizePricing(selectedItem) && selectedCategory) {
      setEditPizzaSizeRows(
        pizzaSizeRowsForItem(selectedItem, readPizzaSizeColumnsFromSection(selectedCategory)),
      );
    }
  }, [selectedItem?.id, editingPizzaItem, selectedCategory?.description, selectedCategory?.presetKey]);

  const showExtrasPanel = Boolean(extrasSection && selectedCategory?.id === extrasSection.id);

  const showMealsPanel = Boolean(mealSection && selectedCategory?.id === mealSection.id);
  const selectedIsMealDealsCategory = isHubMenuMealDealsCategory(selectedCategory);
  const creatingIsMealDealsCategory = isHubMenuMealDealsCategory(creatingItemSection);
  const editingMenuBoard = menuBoards.find((board) => board.id === editingMenuBoardId) ?? null;
  const showCategoryBuilder = Boolean(selectedCategory && !isMenuStudioStaffSection(selectedCategory));
  const staffPanelOnly = (showExtrasPanel || showMealsPanel) && !showCategoryBuilder;

  return (
    <section className="hub-menu-studio" style={studioShell}>
      <HubMenuPreview
        open={menuPreviewOpen}
        onClose={onCloseMenuPreview}
        settings={hubSettings}
        menuSections={menuSections}
        hasUnsavedChanges={hasUnsavedHubChanges}
        storeSlug={storeSlug}
        customerWebBaseUrl={customerWebBaseUrl}
      />
      <div className={menuHubPersistState === "saving" ? "hub-menu-studio__top-bar is-saving" : "hub-menu-studio__top-bar"} style={studioTopBar}>
        <div>
          <p style={eyebrow}>Menu studio</p>
          <h2 style={studioTitle}>Menu builder</h2>
          <p style={studioCopy}>
            Set up extras, salad, and sauces first, then add products. Changes save automatically in the background.
            {menuHubPersistState === "saving" ? " Saving now…" : null}
          </p>
        </div>
        <div className="he-btn-row" style={studioTopActions}>
          <button type="button" style={secondaryButton} onClick={onOpenMenuPreview}>
            Preview menu
          </button>
          {studioLocked ? null : (
            <>
              <button type="button" style={secondaryButton} onClick={onSaveDraft} disabled={menuPublishing}>
                {menuHubPersistState === "saving" ? "Saving…" : hasUnsavedHubChanges ? "Save draft now *" : "Save draft"}
              </button>
              <button type="button" className="he-portal-primary" style={saveButtonStyle} onClick={onRequestPublish} disabled={menuPublishing}>
                Publish to customers
              </button>
            </>
          )}
        </div>
      </div>

      {studioLocked ? (
        <div className="he-hub-banner" role="status">
          View-only account — you can preview the menu but cannot edit or publish.
        </div>
      ) : null}

      <div style={studioLocked ? { pointerEvents: "none", opacity: 0.92 } : undefined}>
      {menuHubPersistState === "error" ? (
        <div className="he-hub-banner" role="alert">
          <strong>Could not save to your hub</strong>
          <p>Check your connection and use Save draft now. Your work is still on this page until you refresh.</p>
        </div>
      ) : null}

      <HubMenuBoardsBar
        boards={menuBoards}
        editingBoardId={editingMenuBoardId}
        readOnly={studioLocked}
        onSelectMain={onSelectMainMenu}
        onSelectBoard={onSelectMenuBoard}
        onCreateBoard={onCreateMenuBoard}
        onUpdateBoardPublishMode={onUpdateMenuBoardPublishMode}
        onRenameBoard={onRenameMenuBoard}
      />

      {editingMenuBoard ? (
        <div className="he-hub-banner" role="status">
          <strong>Editing {editingMenuBoard.name}</strong>
          <p>
            Publish will{" "}
            {editingMenuBoard.publishMode === "replace"
              ? "replace your main live menu with this draft."
              : "add these categories alongside your existing live menu."}
          </p>
        </div>
      ) : null}

      {studioLocked ? null : (
        <div className="he-hub-banner" role="status">
          <strong>Build your menu faster</strong>
          <p>
            Set up <strong>Extras, salad &amp; sauces</strong> on the left first. Add <strong>Make it a meal</strong> on
            individual items when needed. Then create customer categories and tick extras, salad, and sauces per product.
            Work saves automatically; use <strong>Publish</strong> when customers should see it live.
          </p>
        </div>
      )}

      <div className="hub-menu-builder-layout">
          <aside className="hub-menu-tab-column">
            <HubMenuCategoryTabs
              customerSections={visibleSections}
              extrasSection={extrasSection}
              mealSection={mealSection}
              selectedSectionId={selectedCategory?.id ?? null}
              readOnly={studioLocked}
              onSelectSection={onSelectCategory}
              onReorderCategory={onReorderCategory}
            />
            <section id="publish-issue-no-categories" className="hub-menu-tab-add-category" style={sidebarAddCategory}>
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
          </aside>

          <div className="hub-menu-builder-workspace hub-menu-builder-panel" style={builderWorkspace}>
            <div
              className={`hub-menu-builder-main${staffPanelOnly ? " hub-menu-builder-main--staff-only" : ""}`}
              style={staffPanelOnly ? staffBuilderMain : builderMain}
            >
              {showExtrasPanel && extrasSection ? (
                <div className="hub-menu-staff-library-editor" style={{ display: "grid", gap: 24 }}>
                  <HubMenuExtrasLibrary
                    section={extrasSection}
                    onAddTopping={onAddExtraTopping}
                    onUpdateToppingPrice={onUpdateExtraToppingPrice}
                    onRemoveTopping={onRemoveExtraTopping}
                    readOnly={studioLocked}
                  />
                  {saladSection ? (
                    <HubMenuSaladLibrary
                      section={saladSection}
                      onAddSalad={onAddSalad}
                      onUpdateSaladPrice={onUpdateSaladPrice}
                      onRemoveSalad={onRemoveSalad}
                      readOnly={studioLocked}
                    />
                  ) : null}
                  {saucesSection ? (
                    <HubMenuSaucesLibrary
                      section={saucesSection}
                      onAddSauce={onAddSauce}
                      onUpdateSaucePrice={onUpdateSaucePrice}
                      onRemoveSauce={onRemoveSauce}
                      readOnly={studioLocked}
                    />
                  ) : null}
                </div>
              ) : null}

              {showMealsPanel && mealSection ? (
                <div className="hub-menu-staff-library-editor">
                  <HubMenuMealLibrary
                    menuSections={menuSections}
                    section={mealSection}
                    onAddTemplate={onAddMealTemplate}
                    onUpdateTemplate={onUpdateMealTemplate}
                    onRemoveTemplate={onRemoveMealTemplate}
                    readOnly={studioLocked}
                  />
                </div>
              ) : null}

              {showCategoryBuilder && selectedCategory ? (
                <>
              {usesPizzaOrderBuilder ? (
                <div className="hub-menu-drinks-builder-layout">
                  <div className="hub-menu-drinks-builder-layout__head">
                    <div>
                      <p style={sectionLabel}>{selectedCategory.name}</p>
                      <p style={itemsPanelCopy}>{selectedBuilderHint}</p>
                    </div>
                  </div>
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
                        <span style={darkFieldLabel}>Category note (optional)</span>
                        <input
                          style={lightInput}
                          value={getCategoryCustomerDescription(selectedCategory)}
                          onChange={(event) =>
                            onPatchSelectedCategory((section) =>
                              writeCategoryCustomerDescriptionOnSection(section, event.target.value),
                            )
                          }
                          placeholder="Optional note shown to customers under this category"
                        />
                      </label>
                    </div>
                    <div style={inlineActions}>
                      <button type="button" style={dangerButtonSmall} onClick={onDeleteCategory}>
                        Delete category
                      </button>
                    </div>
                  </details>
                  <HubMenuPizzaOrderBuilder
                    section={selectedCategory}
                    readOnly={studioLocked}
                    onPatchSection={onPatchSelectedCategory}
                  />
                </div>
              ) : usesOrderTicketBuilder ? (
                <div className="hub-menu-drinks-builder-layout">
                  <div className="hub-menu-drinks-builder-layout__head">
                    <div>
                      <p style={sectionLabel}>{selectedCategory.name}</p>
                      <p style={itemsPanelCopy}>{selectedBuilderHint}</p>
                    </div>
                  </div>
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
                        <span style={darkFieldLabel}>Category note (optional)</span>
                        <input
                          style={lightInput}
                          value={getCategoryCustomerDescription(selectedCategory)}
                          onChange={(event) =>
                            onPatchSelectedCategory((section) =>
                              writeCategoryCustomerDescriptionOnSection(section, event.target.value),
                            )
                          }
                          placeholder="Optional note shown to customers under this category"
                        />
                      </label>
                    </div>
                    <div style={inlineActions}>
                      <button type="button" style={dangerButtonSmall} onClick={onDeleteCategory}>
                        Delete category
                      </button>
                    </div>
                  </details>
                  <HubMenuOrderTicketBuilder
                    section={selectedCategory}
                    readOnly={studioLocked}
                    publishIssues={publishIssues}
                    onPatchSection={onPatchSelectedCategory}
                  />
                </div>
              ) : (
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
                  {selectedCategory.items.map((item) => {
                    const itemHasIssue =
                      selectedCategory && itemHasPublishIssue(publishIssues, selectedCategory.id, item.id);
                    return (
                    <button
                      key={item.id}
                      type="button"
                      id={`publish-issue-item-row-${item.id}`}
                      className={itemHasIssue ? "hub-menu-publish-issue-row" : undefined}
                      style={item.id === selectedItem?.id && !isCreatingNewItem ? itemRailButtonActive : itemRailButton}
                      onClick={() => onSelectItem(item.id)}
                    >
                      <strong>{item.name || "Untitled"}</strong>
                      <span>
                        {getMenuItemPriceLabel(item)} · {describeMenuAvailability(getMenuAvailabilityMode(item)).label}
                      </span>
                    </button>
                    );
                  })}
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
                      <span style={darkFieldLabel}>Category note (optional)</span>
                      <input
                        style={lightInput}
                        value={getCategoryCustomerDescription(selectedCategory)}
                        onChange={(event) =>
                          onPatchSelectedCategory((section) =>
                            writeCategoryCustomerDescriptionOnSection(section, event.target.value),
                          )
                        }
                        placeholder="Optional note shown to customers under this category"
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
                        : creatingItemSection?.presetKey === "drinks"
                          ? "e.g. Coke Can"
                          : creatingItemSection?.presetKey === "chicken"
                            ? "e.g. 6 Chicken Wings"
                            : "e.g. Cheeseburger"
                    }
                    autoFocus
                  />
                </label>
                {creatingItemSection ? (
                  <HubMenuItemSubGroupField
                    section={creatingItemSection}
                    value={newItem.menuSubGroup || undefined}
                    readOnly={studioLocked}
                    onChange={(menuSubGroup) => onNewItemChange({ menuSubGroup: menuSubGroup ?? "" })}
                  />
                ) : null}
                {creatingItemBuilderMode === "pizza-sizes" ? (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <PizzaSizeDraftPanel rows={pizzaSizeRows} onChange={onPizzaSizeRowsChange} />
                  </div>
                ) : (
                  <label style={field}>
                    <span style={darkFieldLabel}>Price (£)</span>
                    <input
                      type="number"
                      step="0.1"
                      style={lightInput}
                      value={newItem.price}
                      onChange={(event) => onNewItemChange({ price: event.target.value })}
                      placeholder="e.g. 1.99"
                    />
                  </label>
                )}
                <div style={{ gridColumn: "1 / -1" }}>
                  <MenuItemImageField
                    value={newItem.imageUrl || undefined}
                    onChange={(imageUrl) => onNewItemChange({ imageUrl: imageUrl ?? "" })}
                    disabled={studioLocked}
                  />
                </div>
                {creatingOrderTicketItem ? null : (
                  <>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <HubMenuItemIngredients item={newItemDraft} readOnly={studioLocked} onUpdateItem={patchNewItemDraft} />
                    </div>
                    <label style={{ ...field, gridColumn: "1 / -1" }}>
                      <span style={darkFieldLabel}>Description (customer sees)</span>
                      <textarea
                        style={{ ...lightInput, minHeight: 72, paddingTop: 10, paddingBottom: 10, resize: "vertical" }}
                        value={newItem.description}
                        onChange={(event) => onNewItemChange({ description: event.target.value })}
                        placeholder="Marketing copy — ingredients can be added automatically above"
                      />
                    </label>
                  </>
                )}
              </div>
              {creatingIsMealDealsCategory ? (
                <section style={{ ...choicesSection, gridColumn: "1 / -1" }}>
                  <p style={sectionLabel}>Meal deal contents</p>
                  <HubMenuMealDealBundlePicker
                    item={newItemDraft}
                    menuSections={menuSections}
                    readOnly={studioLocked}
                    onUpdateItem={patchNewItemDraft}
                  />
                </section>
              ) : creatingOrderTicketItem ? null : (
                <section style={{ ...choicesSection, gridColumn: "1 / -1" }}>
                  <HubMenuItemOptionsPanel
                    item={newItemDraft}
                    toppings={hubExtraToppings}
                    sauces={hubSauces}
                    salads={hubSalads}
                    mealTemplates={mealTemplates}
                    readOnly={studioLocked}
                    onUpdateItem={patchNewItemDraft}
                  />
                </section>
              )}
              <section style={availabilityPanel}>
                <p style={sectionLabel}>Save as</p>
                <p style={itemsPanelCopy}>
                  Defaults to <strong>Live</strong>. Choose <strong>Hidden</strong> if this should stay off the menu for now.
                </p>
                <MenuItemVisibilitySelect
                  item={newItemDraft}
                  readOnly={studioLocked}
                  onChange={(next) => patchNewItemDraft(() => next)}
                />
              </section>
              <button type="button" style={primaryButton} onClick={() => onCreateItem(getMenuAvailabilityMode(newItemDraft))}>
                Save item
              </button>
            </section>
          ) : null}

          {!isCreatingNewItem && selectedItem && selectedCategory ? (
            <section
              style={editItemPanel}
              className={
                itemHasPublishIssue(publishIssues, selectedCategory.id, selectedItem.id)
                  ? "hub-menu-publish-issue-panel"
                  : undefined
              }
            >
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
                    id={`publish-issue-item-name-${selectedItem.id}`}
                    className={
                      itemHasPublishIssue(publishIssues, selectedCategory.id, selectedItem.id, "item_name")
                        ? "hub-menu-publish-issue-field"
                        : undefined
                    }
                    style={lightInput}
                    value={selectedItem.name}
                    onChange={(event) => onUpdateItem((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                {selectedCategory ? (
                  <HubMenuItemSubGroupField
                    section={selectedCategory}
                    value={selectedItem.menuSubGroup}
                    readOnly={studioLocked}
                    onChange={(menuSubGroup) => onUpdateItem((current) => ({ ...current, menuSubGroup }))}
                  />
                ) : null}
                {itemUsesSizePricing(selectedItem) ? (
                  <div className="he-hub-banner" style={{ gridColumn: "1 / -1" }}>
                    <strong>Prices are on each size</strong>
                    <p>Set each size price in the table below.</p>
                  </div>
                ) : (
                  <label style={field}>
                    <span style={darkFieldLabel}>Price (£)</span>
                    <input
                      id={`publish-issue-item-price-${selectedItem.id}`}
                      type="number"
                      step="0.1"
                      className={
                        itemHasPublishIssue(publishIssues, selectedCategory.id, selectedItem.id, "item_price")
                          ? "hub-menu-publish-issue-field"
                          : undefined
                      }
                      style={lightInput}
                      value={moneyInput(selectedItem.price)}
                      onChange={(event) => onUpdateItem((current) => ({ ...current, price: Number(event.target.value) || 0 }))}
                    />
                  </label>
                )}
                <div style={{ gridColumn: "1 / -1" }}>
                  <MenuItemImageField
                    key={selectedItemId}
                    value={selectedItem.imageUrl}
                    onChange={(imageUrl) => onUpdateItem((current) => ({ ...current, imageUrl }))}
                    disabled={studioLocked}
                  />
                </div>
                {editingOrderTicketItem ? null : (
                  <>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <HubMenuItemIngredients item={selectedItem} readOnly={studioLocked} onUpdateItem={onUpdateItem} />
                    </div>
                    <label style={{ ...field, gridColumn: "1 / -1" }}>
                      <span style={darkFieldLabel}>Description (customer sees)</span>
                      <textarea
                        style={{ ...lightInput, minHeight: 88, paddingTop: 12, paddingBottom: 12, resize: "vertical" }}
                        value={selectedItem.description}
                        onChange={(event) => onUpdateItem((current) => ({ ...current, description: event.target.value }))}
                      />
                    </label>
                  </>
                )}
              </div>

              {editingPizzaItem && itemUsesSizePricing(selectedItem) ? (
                <section style={choicesSection}>
                  <div style={panelHeaderRow}>
                    <p style={sectionLabel}>Pizza sizes</p>
                    {selectedItem.optionGroups.some((group) => /^Crust \(/i.test(group.name)) ? (
                      <button
                        type="button"
                        style={secondaryButtonSmall}
                        disabled={studioLocked}
                        onClick={() =>
                          onUpdateItem((current) => simplifyPizzaMenuItem(current))
                        }
                      >
                        Remove old crust groups
                      </button>
                    ) : null}
                  </div>
                  <PizzaSizeDraftPanel
                    rows={editPizzaSizeRows}
                    onChange={(rows) => {
                      setEditPizzaSizeRows(rows);
                      onUpdateItem((current) => {
                        const next = applyPizzaSizesOrClearItem(current, rows);
                        return "error" in next ? current : next;
                      });
                    }}
                  />
                </section>
              ) : null}

              <section
                style={availabilityPanel}
                className={
                  publishIssues.some((issue) => issue.field === "live_items" && issue.itemId === selectedItem.id)
                    ? "hub-menu-publish-issue-panel"
                    : undefined
                }
                id={
                  publishIssues.some((issue) => issue.field === "live_items" && issue.itemId === selectedItem.id)
                    ? "publish-issue-no-live-items"
                    : undefined
                }
              >
                <p style={sectionLabel}>Save as</p>
                <p style={itemsPanelCopy}>
                  New items save as <strong>Live</strong> when you add them. Choose <strong>Hidden</strong> only if you
                  are not ready for customers to see it yet — then publish when the menu is ready.
                </p>
                <MenuItemVisibilitySelect
                  item={selectedItem}
                  readOnly={studioLocked}
                  onChange={(next) => onUpdateItem(() => next)}
                />
              </section>

              <label style={{ ...toggleLabel, marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={selectedItem.requiresIdVerification ?? false}
                  onChange={(event) => onUpdateItem((current) => ({ ...current, requiresIdVerification: event.target.checked }))}
                />
                <span>Age-restricted (ID check at delivery)</span>
              </label>

              {selectedIsMealDealsCategory ? (
                <section
                  style={choicesSection}
                  id={`publish-issue-meal-deal-${selectedItem.id}`}
                  className={
                    itemHasPublishIssue(publishIssues, selectedCategory.id, selectedItem.id, "meal_deal_bundle")
                      ? "hub-menu-publish-issue-panel"
                      : undefined
                  }
                >
                  <p style={sectionLabel}>Meal deal contents</p>
                  <HubMenuMealDealBundlePicker
                    item={selectedItem}
                    menuSections={menuSections}
                    readOnly={studioLocked}
                    onUpdateItem={onUpdateItem}
                  />
                </section>
              ) : editingOrderTicketItem ? null : (
                <section
                  style={choicesSection}
                  id={`publish-issue-item-options-${selectedItem.id}`}
                  className={
                    itemHasPublishIssue(publishIssues, selectedCategory.id, selectedItem.id, "option_group")
                      ? "hub-menu-publish-issue-panel"
                      : undefined
                  }
                >
                  <HubMenuItemOptionsPanel
                    item={selectedItem}
                    toppings={hubExtraToppings}
                    sauces={hubSauces}
                    salads={hubSalads}
                    mealTemplates={mealTemplates}
                    readOnly={studioLocked}
                    onUpdateItem={onUpdateItem}
                  />
                </section>
              )}
            </section>
          ) : null}

          {showCategoryBuilder && selectedCategory && !usesPizzaOrderBuilder && !usesOrderTicketBuilder && !isCreatingNewItem && !selectedItem ? (
            <div style={emptyStateCard}>
              Select a product from the list, or tap <strong>+ Add item</strong> to add one to {selectedCategory.name}.
            </div>
          ) : null}
              </div>
                </>
              )}
                </>
              ) : !hasCustomerMenu && !staffPanelOnly ? (
                <div className="hub-menu-customer-empty" style={customerEmptyPanel}>
                  <h3 style={customerEmptyTitle}>Your customer menu</h3>
                  <p style={customerEmptyCopy}>
                    No categories yet. Use <strong>New category</strong> on the left to add your first (e.g. Burgers,
                    Sides, Pizzas). Until then, set up <strong>Added extras</strong> and <strong>Burger parts</strong> /
                    <strong> Kebab parts</strong> under Hub setup.
                  </p>
                </div>
              ) : !showExtrasPanel && !showMealsPanel ? (
                <div style={emptyStateCard}>
                  Pick a customer category tab, or add one under <strong>New category</strong> on the left.
                </div>
              ) : null}
            </div>
          </div>
      </div>
      </div>

      {studioLocked ? null : (
      <HubMenuPublishDialog
        open={publishDialogOpen}
        summary={publishSummary}
        publishing={menuPublishing}
        publishingBoard={editingMenuBoard}
        publishWithKnownIssues={publishWithKnownIssues}
        onPublishWithKnownIssuesChange={onPublishWithKnownIssuesChange}
        onNavigateToIssue={onNavigateToPublishIssue}
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
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: 14,
  alignItems: "start",
  minWidth: 0,
};
const staffBuilderMain: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: 14,
  alignItems: "start",
  minWidth: 0,
};
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
  gridTemplateColumns: "minmax(220px, 280px) minmax(0, 1fr)",
  gap: 16,
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
const itemOptionsPanel: CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 16,
  borderRadius: 16,
  border: "1px solid rgba(7, 155, 200, 0.28)",
  background: "rgba(7, 155, 200, 0.04)",
};
const itemOptionsHeading: CSSProperties = {
  margin: 0,
  fontWeight: 900,
  fontSize: "1rem",
  color: "#064f68",
};
const itemOptionsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12,
  alignItems: "start",
};
const extrasTopCard: CSSProperties = {
  display: "grid",
  gap: 8,
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(7, 155, 200, 0.22)",
  background: "#fff",
};
const mealOptionCard: CSSProperties = {
  display: "grid",
  gap: 8,
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(155, 74, 18, 0.22)",
  background: "#fff",
};
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
  width: "100%",
  minHeight: 44,
  borderRadius: 12,
  border: "1px solid rgba(15, 17, 21, 0.14)",
  background: "#fff",
  padding: "10px 12px",
  minWidth: 0,
  boxSizing: "border-box",
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
const customerEmptyPanel: CSSProperties = {
  padding: 28,
  borderRadius: 16,
  border: "1px dashed rgba(7, 155, 200, 0.4)",
  background: "rgba(35, 205, 255, 0.06)",
  textAlign: "center",
  display: "grid",
  gap: 10,
};
const customerEmptyTitle: CSSProperties = { margin: 0, fontSize: "1.2rem", fontFamily: "Georgia, serif", color: "#064f68" };
const customerEmptyCopy: CSSProperties = { margin: 0, color: "#5b6470", lineHeight: 1.55, fontSize: "0.92rem", maxWidth: 520, justifySelf: "center" };
const emptyStateCard: CSSProperties = {
  padding: 14,
  borderRadius: 14,
  border: "1px dashed rgba(15, 17, 21, 0.2)",
  background: "rgba(255,255,255,0.7)",
  color: "#5b6470",
  lineHeight: 1.5,
};
