"use client";

import { useMemo } from "react";

import type { HubSettings, KitchenTicketBlockId, KitchenTicketKind, KitchenTicketSettings } from "@hull-eats/types";
import {
  composePartsLibrariesEnabled,
  defaultKitchenTicketBlockVisibility,
  formatKitchenTicketPreview,
  isKitchenTicketBlockVisible,
  kitchenTicketBlockIds,
  sampleKitchenTicketPayload,
} from "@hull-eats/types";

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
  ticketTitle: "Ticket title",
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

const ticketKindLabels: Record<KitchenTicketKind, string> = {
  kitchen: "Kitchen checklist ticket",
  delivery: "Delivery / bag ticket",
};

function patchBlock(
  settings: KitchenTicketSettings,
  kind: KitchenTicketKind,
  blockId: KitchenTicketBlockId,
  visible: boolean,
): KitchenTicketSettings {
  const layoutKey = kind === "kitchen" ? "kitchen" : "delivery";
  return {
    ...settings,
    [layoutKey]: {
      blocks: {
        ...settings[layoutKey].blocks,
        [blockId]: visible,
      },
    },
  };
}

function TicketPreview({
  kind,
  settings,
  hubLogoUrl,
}: {
  kind: KitchenTicketKind;
  settings: KitchenTicketSettings;
  hubLogoUrl?: string;
}) {
  const preview = useMemo(
    () =>
      formatKitchenTicketPreview(kind, settings, sampleKitchenTicketPayload(), {
        paymentStatus: "paid",
        paymentMethod: "dojo_card",
        customerPhone: "01482 000000",
        addressLine1: "12 Example Street",
        city: "Hull",
        postcode: "HU1 1AA",
        subtotalAmount: 8.5,
        deliveryFee: 2.5,
        totalAmount: 11,
        currency: "GBP",
      }, { hubLogoUrl }),
    [kind, settings, hubLogoUrl],
  );

  const visibleBlocks = kitchenTicketBlockIds.filter((blockId) => isKitchenTicketBlockVisible(settings, kind, blockId));

  return (
    <div className="hub-kitchen-ticket-preview">
      <p className="hub-kitchen-ticket-preview__label">{ticketKindLabels[kind]}</p>
      <pre className="hub-kitchen-ticket-preview__paper" aria-label={`${ticketKindLabels[kind]} preview`}>
        {preview}
      </pre>
      <p className="hub-kitchen-ticket-preview__meta">{visibleBlocks.length} sections shown</p>
    </div>
  );
}

export function HubKitchenTicketSettings({
  settings,
  hubLogoUrl,
  readOnly = false,
  onChange,
  onEnableComposePartsLibraries,
}: Props) {
  const composeEnabled = composePartsLibrariesEnabled(settings);
  const defaults = defaultKitchenTicketBlockVisibility();

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
          Set up <strong>Extras, salad &amp; sauces</strong> and assign them per item as today. Choose how kitchen and
          delivery tickets print. <strong>In-depth</strong> adds burger and kebab parts libraries so you can build
          items like brioche bun, patties, and cheese — those appear on the kitchen checklist.
        </p>
      </header>

      <fieldset className="hub-kitchen-ticket-settings__mode" disabled={readOnly}>
        <legend className="hub-kitchen-ticket-settings__legend">Ticket detail</legend>
        <label className="hub-kitchen-ticket-settings__radio">
          <input
            type="radio"
            name="kitchen-ticket-detail"
            checked={settings.detailMode === "normal"}
            onChange={() => setDetailMode("normal")}
          />
          <span>
            <strong>Normal</strong> — extras, salad, and sauce on the ticket only (no build parts).
          </span>
        </label>
        <label className="hub-kitchen-ticket-settings__radio">
          <input
            type="radio"
            name="kitchen-ticket-detail"
            checked={settings.detailMode === "in_depth"}
            onChange={() => setDetailMode("in_depth")}
          />
          <span>
            <strong>In-depth checklist</strong> — lists each burger/kebab part (bun, patty, cheese, onion…) plus extras.
          </span>
        </label>
      </fieldset>

      {composeEnabled ? (
        <p className="hub-kitchen-ticket-settings__notice hub-kitchen-ticket-settings__notice--on">
          Burger parts and kebab parts are enabled in Menu Studio under <strong>Extras, salad &amp; sauces</strong>.
        </p>
      ) : (
        <p className="hub-kitchen-ticket-settings__notice">
          Burger and kebab part libraries stay hidden until you choose <strong>In-depth checklist</strong>.
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

      <label className="hub-kitchen-ticket-settings__field">
        <span>Ticket logo URL (optional)</span>
        <input
          type="url"
          disabled={readOnly}
          value={settings.ticketLogoUrl}
          placeholder={hubLogoUrl?.trim() ? "Uses hub logo when empty" : "https://…"}
          onChange={(event) => onChange({ ...settings, ticketLogoUrl: event.target.value })}
        />
        <span className="hub-kitchen-ticket-settings__hint">
          Shown when <strong>Ticket logo</strong> is ticked below. Leave blank to use your hub logo from Business profile.
        </span>
      </label>

      {( ["kitchen", "delivery"] as const).map((kind) => (
        <details key={kind} className="hub-kitchen-ticket-settings__ticket-panel" open={kind === "kitchen"}>
          <summary>{ticketKindLabels[kind]}</summary>
          <div className="hub-kitchen-ticket-settings__ticket-body">
            <div className="hub-kitchen-ticket-settings__blocks">
              <p className="hub-kitchen-ticket-settings__blocks-title">Show on ticket</p>
              <ul className="hub-kitchen-ticket-settings__block-list">
                {kitchenTicketBlockIds.map((blockId) => {
                  const disabled =
                    readOnly ||
                    (settings.detailMode === "normal" &&
                      (blockId === "buildComponents" || blockId === "removedComponents"));
                  const checked = isKitchenTicketBlockVisible(settings, kind, blockId);
                  const isDefault = defaults[blockId];
                  return (
                    <li key={`${kind}-${blockId}`}>
                      <label className="hub-kitchen-ticket-settings__block-toggle">
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={checked}
                          onChange={(event) => onChange(patchBlock(settings, kind, blockId, event.target.checked))}
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
            <TicketPreview kind={kind} settings={settings} hubLogoUrl={hubLogoUrl || settings.ticketLogoUrl} />
          </div>
        </details>
      ))}
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
