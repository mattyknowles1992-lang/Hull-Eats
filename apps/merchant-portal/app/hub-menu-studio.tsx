"use client";

import type { CSSProperties } from "react";
import { useRef } from "react";

import type { HubMenuSection, MenuItem } from "@hull-eats/types";
import { HUB_MENU_CATEGORY_CUSTOM_ID, hubMenuCategorySelectOptions, isHubMenuSectionPizza } from "@hull-eats/types";

import { HubMenuCustomisationBuilder } from "./hub-menu-customisation";
import { HubMenuPublishDialog } from "./hub-menu-publish-dialog";
import {
  applyMenuAvailabilityMode,
  describeMenuAvailability,
  formatMenuMoney,
  getMenuAvailabilityMode,
  menuTemplateCards,
  type MenuAvailabilityMode,
  type MenuPublishSummary,
  type MenuTemplateKind,
} from "./menu-studio-core";
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
  showChoiceSetupForItemId: string | null;
  newCategory: CreateCategoryFormState;
  newItem: CreateItemFormState;
  pizzaSizeRows: PizzaSizeRow[];
  publishIssues: string[];
  hasUnsavedHubChanges: boolean;
  activeHubSlug: string;
  customerWebBaseUrl: string;
  categoryPresetOptions: ReturnType<typeof hubMenuCategorySelectOptions>;
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
  onApplyTemplate: (kind: MenuTemplateKind) => void;
  onDismissChoiceSetup: () => void;
  onRequestPublish: () => void;
  onOpenImport: () => void;
  publishDialogOpen: boolean;
  publishSummary: MenuPublishSummary;
  menuPublishing: boolean;
  onCancelPublish: () => void;
  onConfirmPublish: () => void;
  onUpdateSectionField: (field: "name" | "description" | "defaultPrice", value: string | number | null) => void;
  onApplyCategoryPrice: () => void;
  onUpdateItem: (updater: (item: MenuItem) => MenuItem) => void;
  saveButtonStyle: CSSProperties;
  readOnly?: boolean;
};

const moneyInput = (value: number) => (Number.isFinite(value) ? value : 0);

export function HubMenuStudio({
  menuSections,
  selectedCategory,
  selectedItem,
  isCreatingNewItem,
  showChoiceSetupForItemId,
  newCategory,
  newItem,
  pizzaSizeRows,
  publishIssues,
  hasUnsavedHubChanges,
  activeHubSlug,
  customerWebBaseUrl,
  categoryPresetOptions,
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
  onApplyTemplate,
  onDismissChoiceSetup,
  onRequestPublish,
  onOpenImport,
  publishDialogOpen,
  publishSummary,
  menuPublishing,
  onCancelPublish,
  onConfirmPublish,
  onUpdateSectionField,
  onApplyCategoryPrice,
  onUpdateItem,
  saveButtonStyle,
  readOnly = false,
}: HubMenuStudioProps) {
  const newItemDraftRef = useRef<HTMLElement | null>(null);
  const showChoiceSetup = Boolean(selectedItem && showChoiceSetupForItemId === selectedItem.id);
  const availabilityModes: MenuAvailabilityMode[] = ["live", "sold_out", "hidden"];
  const studioLocked = readOnly;

  return (
    <section className="hub-menu-studio" style={studioShell}>
      <div style={studioTopBar}>
        <div>
          <p style={eyebrow}>Menu studio</p>
          <h2 style={studioTitle}>Build your menu</h2>
          <p style={studioCopy}>
            Build in draft, then save &amp; publish once. Customers only see your live menu after you publish.
          </p>
        </div>
        <div className="he-btn-row" style={studioTopActions}>
          {activeHubSlug ? (
            <a href={`${customerWebBaseUrl}/stores/${activeHubSlug}`} target="_blank" rel="noreferrer" style={secondaryButtonLink}>
              Preview live menu
            </a>
          ) : null}
          {studioLocked ? null : (
            <button type="button" style={secondaryButton} onClick={onOpenImport}>
              Paste menu (advanced)
            </button>
          )}
          {studioLocked ? null : (
            <button type="button" className="he-portal-primary" style={saveButtonStyle} onClick={onRequestPublish}>
              {hasUnsavedHubChanges ? "Save & publish menu *" : "Save & publish menu"}
            </button>
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

      <div style={stepRow}>
        <span style={stepPill}>1. Categories</span>
        <span style={stepPill}>2. Items</span>
        <span style={stepPill}>3. Sizes, stock &amp; choices</span>
      </div>

      {publishIssues.length > 0 ? (
        <div style={publishBanner}>
          <strong>Publish checklist</strong>
          <ul style={publishList}>
            {publishIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div style={publishReady}>Ready to save &amp; publish to your live menu.</div>
      )}

      <section style={categoryCreateCard}>
        <p style={sectionLabel}>Add category</p>
        <div style={categoryCreateRow}>
          <select style={lightInput} value={newCategory.presetId} onChange={(event) => onNewCategoryPresetChange(event.target.value)}>
            {categoryPresetOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            style={lightInput}
            value={newCategory.name}
            onChange={(event) => onNewCategoryChange({ name: event.target.value })}
            placeholder="Category name, e.g. Pizzas"
          />
          <input
            type="number"
            step="0.01"
            style={{ ...lightInput, maxWidth: 120 }}
            value={newCategory.defaultPrice}
            onChange={(event) => onNewCategoryChange({ defaultPrice: event.target.value })}
            placeholder="Default £"
          />
          <button type="button" style={primaryButton} onClick={onCreateCategory}>
            Add category
          </button>
        </div>
      </section>

      {menuSections.length > 0 ? (
        <div className="hub-menu-category-tabs" style={categoryTabRow}>
          {menuSections.map((section) => (
            <button
              key={section.id}
              type="button"
              style={section.id === selectedCategory?.id ? categoryTabActive : categoryTab}
              onClick={() => onSelectCategory(section.id)}
            >
              {section.name}
              <small style={{ opacity: 0.75 }}>{section.items.length}</small>
            </button>
          ))}
        </div>
      ) : (
        <div style={emptyStateCard}>Create your first category above — e.g. Pizzas, Burgers, Drinks.</div>
      )}

      {selectedCategory ? (
        <section style={editorShell}>
          <details style={categorySettingsDetails}>
            <summary style={categorySettingsSummary}>Category settings — {selectedCategory.name}</summary>
            <div style={builderGrid}>
              <label style={field}>
                <span style={darkFieldLabel}>Category name</span>
                <input style={lightInput} value={selectedCategory.name} onChange={(event) => onUpdateSectionField("name", event.target.value)} />
              </label>
              <label style={field}>
                <span style={darkFieldLabel}>Note (optional)</span>
                <input
                  style={lightInput}
                  value={selectedCategory.description ?? ""}
                  onChange={(event) => onUpdateSectionField("description", event.target.value)}
                />
              </label>
              <label style={field}>
                <span style={darkFieldLabel}>Default price for new items</span>
                <input
                  type="number"
                  step="0.01"
                  style={lightInput}
                  value={selectedCategory.defaultPrice ?? ""}
                  onChange={(event) => onUpdateSectionField("defaultPrice", event.target.value ? Number(event.target.value) : null)}
                />
              </label>
            </div>
            <div style={inlineActions}>
              <button type="button" style={secondaryButton} onClick={onApplyCategoryPrice}>
                Apply default price to all items
              </button>
              <button type="button" style={dangerButtonSmall} onClick={onDeleteCategory}>
                Delete category
              </button>
            </div>
          </details>

          <div style={itemsPanel}>
            <div style={itemsPanelHeader}>
              <div>
                <p style={sectionLabel}>Items in {selectedCategory.name}</p>
                <p style={itemsPanelCopy}>Select an item to edit, or add a new one.</p>
              </div>
              <button type="button" style={primaryButton} onClick={() => onBeginCreateItem(selectedCategory.id)}>
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
                  <strong>{item.name}</strong>
                  <span>
                    {formatMenuMoney(item.price)} · {describeMenuAvailability(getMenuAvailabilityMode(item)).label}
                  </span>
                </button>
              ))}
              {selectedCategory.items.length === 0 ? (
                <div style={emptyStateCard}>No items yet. Tap Add item to create your first product.</div>
              ) : null}
            </div>
          </div>

          {isCreatingNewItem ? (
            <section ref={newItemDraftRef} style={newItemPanel}>
              <div style={panelHeaderRow}>
                <div>
                  <p style={eyebrow}>Step 2 — New item</p>
                  <h3 style={panelHeading}>{selectedCategory.name}</h3>
                </div>
                <button type="button" style={secondaryButtonSmall} onClick={onCancelCreateItem}>
                  Cancel
                </button>
              </div>
              <div style={builderGrid}>
                <label style={field}>
                  <span style={darkFieldLabel}>Item name</span>
                  <input
                    style={lightInput}
                    value={newItem.name}
                    onChange={(event) => onNewItemChange({ name: event.target.value })}
                    placeholder="e.g. Margherita"
                    autoFocus
                  />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Description</span>
                  <textarea
                    style={{ ...lightInput, minHeight: 88, paddingTop: 12, paddingBottom: 12, resize: "vertical" }}
                    value={newItem.description}
                    onChange={(event) => onNewItemChange({ description: event.target.value })}
                    placeholder="What customers see on the menu"
                  />
                </label>
                {isHubMenuSectionPizza(selectedCategory) ? (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <PizzaSizeDraftPanel rows={pizzaSizeRows} onChange={onPizzaSizeRowsChange} />
                  </div>
                ) : (
                  <label style={field}>
                    <span style={darkFieldLabel}>Price</span>
                    <input
                      type="number"
                      step="0.01"
                      style={lightInput}
                      value={newItem.price}
                      onChange={(event) => onNewItemChange({ price: event.target.value })}
                      placeholder={selectedCategory.defaultPrice != null ? formatMenuMoney(selectedCategory.defaultPrice) : "7.99"}
                    />
                  </label>
                )}
                <label style={field}>
                  <span style={darkFieldLabel}>Image URL (optional)</span>
                  <input
                    style={lightInput}
                    value={newItem.imageUrl}
                    onChange={(event) => onNewItemChange({ imageUrl: event.target.value })}
                    placeholder="https://..."
                  />
                </label>
              </div>
              <button type="button" style={primaryButton} onClick={onCreateItem}>
                Create item — then add sizes &amp; choices
              </button>
            </section>
          ) : null}

          {!isCreatingNewItem && selectedItem ? (
            <section style={editItemPanel}>
              <div style={panelHeaderRow}>
                <div>
                  <p style={eyebrow}>Step 2 &amp; 3 — Edit item</p>
                  <h3 style={panelHeading}>{selectedItem.name}</h3>
                </div>
                <div style={inlineActions}>
                  <button type="button" style={secondaryButtonSmall} onClick={() => onDuplicateItem(selectedItem)}>
                    Duplicate
                  </button>
                  <button type="button" style={dangerButtonSmall} onClick={onDeleteItem}>
                    Remove
                  </button>
                </div>
              </div>

              {showChoiceSetup ? (
                <section style={choiceSetupPanel}>
                  <div style={panelHeaderRow}>
                    <div>
                      <strong style={{ fontSize: "1.05rem" }}>What kind of item is this?</strong>
                      <p style={studioCopy}>Pick a starter layout for sizes, toppings, and extras. You can rename everything after.</p>
                    </div>
                    <button type="button" style={secondaryButtonSmall} onClick={onDismissChoiceSetup}>
                      Skip for now
                    </button>
                  </div>
                  <div style={templateGrid}>
                    {menuTemplateCards.map((template) => (
                      <button
                        key={template.kind}
                        type="button"
                        style={templateButton}
                        onClick={() => {
                          onApplyTemplate(template.kind);
                          onDismissChoiceSetup();
                        }}
                      >
                        <strong>{template.title}</strong>
                        <span>{template.copy}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              <div style={builderGrid}>
                <label style={field}>
                  <span style={darkFieldLabel}>Item name</span>
                  <input
                    style={lightInput}
                    value={selectedItem.name}
                    onChange={(event) => onUpdateItem((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <label style={field}>
                  <span style={darkFieldLabel}>Price (from)</span>
                  <input
                    type="number"
                    step="0.01"
                    style={lightInput}
                    value={moneyInput(selectedItem.price)}
                    onChange={(event) => onUpdateItem((current) => ({ ...current, price: Number(event.target.value) || 0 }))}
                  />
                </label>
                <label style={{ ...field, gridColumn: "1 / -1" }}>
                  <span style={darkFieldLabel}>Description</span>
                  <textarea
                    style={{ ...lightInput, minHeight: 88, paddingTop: 12, paddingBottom: 12, resize: "vertical" }}
                    value={selectedItem.description}
                    onChange={(event) => onUpdateItem((current) => ({ ...current, description: event.target.value }))}
                  />
                </label>
                <label style={{ ...field, gridColumn: "1 / -1" }}>
                  <span style={darkFieldLabel}>Image URL</span>
                  <input
                    style={lightInput}
                    value={selectedItem.imageUrl ?? ""}
                    onChange={(event) => onUpdateItem((current) => ({ ...current, imageUrl: event.target.value || undefined }))}
                  />
                </label>
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

              {!showChoiceSetup && selectedItem.optionGroups.length === 0 ? (
                <button type="button" style={secondaryButton} onClick={() => onApplyTemplate("custom")}>
                  Add customer choices
                </button>
              ) : null}

              <section style={choicesSection}>
                <p style={sectionLabel}>Sizes, toppings, salad &amp; extras</p>
                <HubMenuCustomisationBuilder
                  item={selectedItem}
                  onChangeComponents={(components) => onUpdateItem((current) => ({ ...current, components }))}
                  onChangeOptionGroups={(optionGroups) => onUpdateItem((current) => ({ ...current, optionGroups }))}
                />
              </section>
            </section>
          ) : null}

          {!isCreatingNewItem && !selectedItem ? (
            <div style={emptyStateCard}>Select an item from the list, or tap Add item to create one in {selectedCategory.name}.</div>
          ) : null}
        </section>
      ) : null}
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
};
const categoryCreateRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginTop: 10 };
const categoryTabRow: CSSProperties = { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 };
const categoryTab: CSSProperties = {
  border: "1px solid rgba(15, 17, 21, 0.12)",
  borderRadius: 12,
  background: "#fff",
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap",
  display: "grid",
  gap: 2,
  textAlign: "left",
};
const categoryTabActive: CSSProperties = { ...categoryTab, borderColor: "rgba(7, 155, 200, 0.4)", background: "rgba(7, 155, 200, 0.12)", color: "#0680a6" };
const editorShell: CSSProperties = { display: "grid", gap: 16 };
const categorySettingsDetails: CSSProperties = { borderRadius: 14, border: "1px solid rgba(15, 17, 21, 0.1)", background: "#fff", padding: 12 };
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
