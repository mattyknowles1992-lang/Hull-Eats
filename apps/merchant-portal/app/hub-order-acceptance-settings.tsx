"use client";

import type { HubSettings, OrderAcceptanceMode } from "@hull-eats/types";
import { orderAcceptanceUsesAutoAccept } from "@hull-eats/types";

import { HubFreeTypeNumberInput } from "./hub-free-type-number-input";

type Props = {
  settings: HubSettings;
  readOnly?: boolean;
  onChange: (patch: Partial<HubSettings>) => void;
};

const modes: Array<{
  mode: OrderAcceptanceMode;
  title: string;
  description: string;
  detail: string;
}> = [
  {
    mode: "manual",
    title: "Manual confirm",
    description: "Every new order waits for you in Live orders.",
    detail:
      "Hull Eats alerts the hub when an order arrives. You confirm it and set the prep time in 10-minute steps. We suggest a smart starting time (40 min baseline, rising when more orders are cooking).",
  },
  {
    mode: "standard_auto",
    title: "Auto-accept — standard",
    description: "Accept every order immediately with your delivery ETA.",
    detail:
      "New orders are accepted straight away and quoted using your standard delivery time, capped by the max prep below. Best when your kitchen time stays steady.",
  },
  {
    mode: "smart_auto",
    title: "Auto-accept — smart kitchen load",
    description: "Auto-accept, but add time when the kitchen is busy.",
    detail:
      "One order on its own keeps your baseline prep time. When 2, 3, 4 or more orders are still being prepared inside a short window (default 45 minutes), Hull Eats automatically adds extra minutes so customers get a realistic wait.",
  },
];

export function HubOrderAcceptanceSettings({ settings, readOnly = false, onChange }: Props) {
  const setMode = (orderAcceptanceMode: OrderAcceptanceMode) => {
    onChange({
      orderAcceptanceMode,
      autoAcceptOrders: orderAcceptanceUsesAutoAccept(orderAcceptanceMode),
    });
  };

  return (
    <div className="he-order-acceptance-settings">
      <fieldset className="he-order-acceptance-settings__modes" disabled={readOnly}>
        <legend className="he-order-acceptance-settings__legend">How new orders are handled</legend>
        <div className="he-order-acceptance-settings__grid">
          {modes.map((entry) => {
            const selected = settings.orderAcceptanceMode === entry.mode;
            return (
              <button
                key={entry.mode}
                type="button"
                className={
                  selected
                    ? "he-order-acceptance-settings__card he-order-acceptance-settings__card--selected"
                    : "he-order-acceptance-settings__card"
                }
                aria-pressed={selected}
                onClick={() => setMode(entry.mode)}
              >
                <span className="he-order-acceptance-settings__card-title">{entry.title}</span>
                <span className="he-order-acceptance-settings__card-copy">{entry.description}</span>
                <span className="he-order-acceptance-settings__card-detail">{entry.detail}</span>
                {selected ? <span className="he-order-acceptance-settings__badge">Selected</span> : null}
              </button>
            );
          })}
        </div>
      </fieldset>

      {settings.orderAcceptanceMode !== "manual" ? (
        <label className="he-order-acceptance-settings__field">
          <span className="he-order-acceptance-settings__field-label">Max quoted prep when auto-accepting (minutes)</span>
          <HubFreeTypeNumberInput
            integer
            min={10}
            max={180}
            className="he-order-acceptance-settings__input"
            value={settings.orderAcceptanceMaxPrepMinutes}
            disabled={readOnly}
            onCommit={(orderAcceptanceMaxPrepMinutes) =>
              onChange({
                orderAcceptanceMaxPrepMinutes,
                autoAcceptMaxPrepMinutes: orderAcceptanceMaxPrepMinutes,
              })
            }
          />
        </label>
      ) : null}

      {settings.orderAcceptanceMode === "manual" || settings.orderAcceptanceMode === "smart_auto" ? (
        <div className="he-order-acceptance-settings__smart-grid">
          <label className="he-order-acceptance-settings__field">
            <span className="he-order-acceptance-settings__field-label">Smart baseline prep (minutes)</span>
            <HubFreeTypeNumberInput
              integer
              min={10}
              max={180}
              className="he-order-acceptance-settings__input"
              value={settings.smartPrepBaselineMinutes}
              disabled={readOnly}
              onCommit={(smartPrepBaselineMinutes) => onChange({ smartPrepBaselineMinutes })}
            />
            <span className="he-order-acceptance-settings__hint">
              Starting suggestion when the kitchen is quiet (default 40 min).
            </span>
          </label>
          <label className="he-order-acceptance-settings__field">
            <span className="he-order-acceptance-settings__field-label">Busy-kitchen window (minutes)</span>
            <HubFreeTypeNumberInput
              integer
              min={15}
              max={180}
              className="he-order-acceptance-settings__input"
              value={settings.smartPrepWindowMinutes}
              disabled={readOnly}
              onCommit={(smartPrepWindowMinutes) => onChange({ smartPrepWindowMinutes })}
            />
            <span className="he-order-acceptance-settings__hint">
              How far back we look for orders still being prepared (default 45 min).
            </span>
          </label>
        </div>
      ) : null}
    </div>
  );
}
