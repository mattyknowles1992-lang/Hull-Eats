"use client";

import type { HubSettings, KitchenTicketBlockId, KitchenTicketSettings } from "@hull-eats/types";
import {
  composePartsLibrariesEnabled,
  defaultKitchenTicketBlockVisibility,
  isKitchenTicketBlockVisible,
  kitchenTicketBlockIds,
} from "@hull-eats/types";

import {
  HULL_EATS_TICKET_LOGO_PLACEHOLDER,
  OrderTicketVisualMockup,
  resolveTicketMockupLogo,
} from "./hub-kitchen-ticket-mockup";
import { HubTicketLogoField } from "./hub-ticket-logo-field";

type Props = {
  settings: KitchenTicketSettings;
  hubLogoUrl?: string;
  readOnly?: boolean;
  onChange: (next: KitchenTicketSettings) => void;
  onEnableComposePartsLibraries?: () => void;
};

const blockLabels: Record<KitchenTicketBlockId, string> = {
  headerBranding: "Header / branding",
  ticketLogo: "Ticket logo",
  ticketTitle: "Order title & flow line",
  orderNumber: "Order number",
  placedAt: "Placed time",
  prepTime: "Prep time",
  lineIndex: "Line numbers",
  itemQuantityName: "Item name & quantity",
  itemTotal: "Item line total",
  buildComponents: "Build checklist (buns, patties, salad…)",
  removedComponents: "Removed parts (NO:)",
  selectedOptions: "Extras, salad & sauce",
  lineNotes: "Per-item notes",
  orderNotes: "Order notes",
  customerBlock: "Customer name & contact",
  deliveryAddress: "Delivery address",
  totals: "Subtotal / delivery / total",
  payment: "Payment status",
  courierQr: "Courier QR / backup code",
};

const exampleModes = [
  {
    detailMode: "normal" as const,
    label: "Example 1 — Normal",
    description: "Extras, salad, and sauce on the ticket only.",
  },
  {
    detailMode: "in_depth" as const,
    label: "Example 2 — In depth",
    description: "Full build checklist with buns, patties, cheese, and more.",
  },
];

function patchBlock(
  settings: KitchenTicketSettings,
  blockId: KitchenTicketBlockId,
  visible: boolean,
): KitchenTicketSettings {
  return {
    ...settings,
    order: {
      blocks: {
        ...settings.order.blocks,
        [blockId]: visible,
      },
    },
  };
}

export function HubKitchenTicketSettings({
  settings,
  readOnly = false,
  onChange,
  onEnableComposePartsLibraries,
}: Props) {
  const composeEnabled = composePartsLibrariesEnabled(settings);
  const defaults = defaultKitchenTicketBlockVisibility();
  const { src: mockupLogoSrc, isPlaceholder: mockupLogoIsPlaceholder } = resolveTicketMockupLogo(settings.ticketLogoUrl);
  const visibleBlocks = kitchenTicketBlockIds.filter((blockId) => isKitchenTicketBlockVisible(settings, blockId));

  const setDetailMode = (detailMode: KitchenTicketSettings["detailMode"]) => {
    const next = { ...settings, detailMode };
    onChange(next);
    if (detailMode === "in_depth") {
      onEnableComposePartsLibraries?.();
    }
  };

  return (
    <section className="hub-kitchen-ticket-settings">
      <header className="hub-kitchen-ticket-settings__head">
        <h3 className="hub-kitchen-ticket-settings__title">Print tickets</h3>
        <p className="hub-kitchen-ticket-settings__copy">
          One ticket for the whole order — the kitchen cooks from the checklist, sticks it on the bag, and the courier
          scans the QR to deliver. Set up <strong>Extras, salad &amp; sauces</strong> per item as today, then pick your
          ticket style below.
        </p>
      </header>

      <HubTicketLogoField
        value={settings.ticketLogoUrl}
        placeholderLogoSrc={HULL_EATS_TICKET_LOGO_PLACEHOLDER}
        disabled={readOnly}
        onChange={(ticketLogoUrl) => onChange({ ...settings, ticketLogoUrl })}
      />

      <fieldset className="hub-kitchen-ticket-settings__examples" disabled={readOnly}>
        <legend className="hub-kitchen-ticket-settings__legend">Choose your ticket style</legend>
        <div className="hub-kitchen-ticket-settings__example-grid">
          {exampleModes.map((example) => {
            const selected = settings.detailMode === example.detailMode;
            return (
              <button
                key={example.detailMode}
                type="button"
                className={
                  selected
                    ? "hub-kitchen-ticket-settings__example hub-kitchen-ticket-settings__example--selected"
                    : "hub-kitchen-ticket-settings__example"
                }
                aria-pressed={selected}
                onClick={() => setDetailMode(example.detailMode)}
              >
                <span className="hub-kitchen-ticket-settings__example-label">{example.label}</span>
                <OrderTicketVisualMockup
                  detailMode={example.detailMode}
                  settings={settings}
                  logoSrc={mockupLogoSrc}
                  logoIsPlaceholder={mockupLogoIsPlaceholder}
                  compact
                />
                <span className="hub-kitchen-ticket-settings__example-copy">{example.description}</span>
                {selected ? <span className="hub-kitchen-ticket-settings__example-badge">Selected</span> : null}
              </button>
            );
          })}
        </div>
      </fieldset>

      {composeEnabled ? (
        <p className="hub-kitchen-ticket-settings__notice hub-kitchen-ticket-settings__notice--on">
          Burger parts and kebab parts are enabled in Menu Studio under <strong>Extras, salad &amp; sauces</strong>.
        </p>
      ) : (
        <p className="hub-kitchen-ticket-settings__notice">
          Burger and kebab part libraries stay hidden until you choose <strong>Example 2 — In depth</strong>.
        </p>
      )}

      <label className="hub-kitchen-ticket-settings__toggle">
        <input
          type="checkbox"
          disabled={readOnly}
          checked={settings.splitQuantityLines}
          onChange={(event) => onChange({ ...settings, splitQuantityLines: event.target.checked })}
        />
        <span>
          <strong>One line per unit</strong> — print <code>2 x 3oz smash patty</code> as two lines of{" "}
          <code>1 x 3oz smash patty</code> (easier to tick off).
        </span>
      </label>

      <div className="hub-kitchen-ticket-settings__ticket-panel">
        <h4 className="hub-kitchen-ticket-settings__ticket-panel-title">Order ticket</h4>
        <div className="hub-kitchen-ticket-settings__ticket-body">
          <div className="hub-kitchen-ticket-settings__blocks">
            <p className="hub-kitchen-ticket-settings__blocks-title">Show on ticket</p>
            <ul className="hub-kitchen-ticket-settings__block-list">
              {kitchenTicketBlockIds.map((blockId) => {
                const disabled =
                  readOnly ||
                  (settings.detailMode === "normal" &&
                    (blockId === "buildComponents" || blockId === "removedComponents"));
                const checked = isKitchenTicketBlockVisible(settings, blockId);
                const isDefault = defaults[blockId];
                return (
                  <li key={blockId}>
                    <label className="hub-kitchen-ticket-settings__block-toggle">
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={checked}
                        onChange={(event) => onChange(patchBlock(settings, blockId, event.target.checked))}
                      />
                      <span>
                        {blockLabels[blockId]}
                        {!isDefault && checked ? " (custom)" : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="hub-kitchen-ticket-preview">
            <p className="hub-kitchen-ticket-preview__label">Full order ticket preview</p>
            <OrderTicketVisualMockup
              detailMode={settings.detailMode}
              settings={settings}
              logoSrc={mockupLogoSrc}
              logoIsPlaceholder={mockupLogoIsPlaceholder}
            />
            <p className="hub-kitchen-ticket-preview__meta">{visibleBlocks.length} sections shown</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function patchHubKitchenTicketSettings(
  hubSettings: HubSettings,
  patch: Partial<KitchenTicketSettings>,
): HubSettings {
  return {
    ...hubSettings,
    kitchenTicket: {
      ...hubSettings.kitchenTicket,
      ...patch,
    },
  };
}
