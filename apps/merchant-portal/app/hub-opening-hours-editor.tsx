"use client";

import type { CSSProperties } from "react";
import type { HubSettings, StoreOpeningHours, StoreOpeningHoursDay } from "@hull-eats/types";
import { OPENING_HOURS_UI_DAYS } from "@hull-eats/types";

type HubOpeningHoursEditorProps = {
  openingHours: StoreOpeningHours;
  onChange: (openingHours: StoreOpeningHours) => void;
  readOnly?: boolean;
};

const patchDay = (hours: StoreOpeningHours, dayOfWeek: number, patch: Partial<StoreOpeningHoursDay>): StoreOpeningHours =>
  hours.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day));

export function HubOpeningHoursEditor({ openingHours, onChange, readOnly = false }: HubOpeningHoursEditorProps) {
  const setEveryDayOpen = () => {
    onChange(openingHours.map((day) => ({ ...day, isOpen: true })));
  };

  const copyOpenTimeToAllOpenDays = (sourceTime: string) => {
    onChange(openingHours.map((day) => (day.isOpen ? { ...day, openTime: sourceTime } : day)));
  };

  const copyCloseTimeToAllOpenDays = (sourceTime: string) => {
    onChange(openingHours.map((day) => (day.isOpen ? { ...day, closeTime: sourceTime } : day)));
  };

  return (
    <section className="he-opening-hours">
      <div className="he-opening-hours__header">
        <div>
          <h3 className="he-opening-hours__title">Opening times</h3>
          <p className="he-opening-hours__hint">
            Customers see open or closed on Hull Eats using these times in UK local time (Europe/London, GMT/BST).
          </p>
        </div>
        <div className="he-opening-hours__bulk">
          <button type="button" className="he-opening-hours__bulk-btn" disabled={readOnly} onClick={setEveryDayOpen}>
            Open every day
          </button>
        </div>
      </div>

      <div className="he-opening-hours__table" role="table" aria-label="Weekly opening schedule">
        <div className="he-opening-hours__row he-opening-hours__row--head" role="row">
          <span role="columnheader">Day</span>
          <span role="columnheader">Open</span>
          <span role="columnheader">Opens</span>
          <span role="columnheader">Closes</span>
        </div>

        {OPENING_HOURS_UI_DAYS.map(({ dayOfWeek, label }) => {
          const day = openingHours.find((entry) => entry.dayOfWeek === dayOfWeek);
          if (!day) {
            return null;
          }

          return (
            <div key={dayOfWeek} className="he-opening-hours__row" role="row">
              <span className="he-opening-hours__day" role="rowheader">
                {label}
              </span>
              <label className="he-opening-hours__open-toggle">
                <input
                  type="checkbox"
                  checked={day.isOpen}
                  disabled={readOnly}
                  onChange={(event) => onChange(patchDay(openingHours, dayOfWeek, { isOpen: event.target.checked }))}
                />
                <span>Open</span>
              </label>
              <label className="he-opening-hours__time-field">
                <div className="he-opening-hours__time-control">
                  <input
                    type="time"
                    value={day.openTime}
                    disabled={readOnly || !day.isOpen}
                    onChange={(event) => onChange(patchDay(openingHours, dayOfWeek, { openTime: event.target.value }))}
                  />
                  <button
                    type="button"
                    className="he-opening-hours__copy-btn"
                    disabled={readOnly || !day.isOpen}
                    onClick={() => copyOpenTimeToAllOpenDays(day.openTime)}
                  >
                    Copy to all
                  </button>
                </div>
              </label>
              <label className="he-opening-hours__time-field">
                <div className="he-opening-hours__time-control">
                  <input
                    type="time"
                    value={day.closeTime}
                    disabled={readOnly || !day.isOpen}
                    onChange={(event) => onChange(patchDay(openingHours, dayOfWeek, { closeTime: event.target.value }))}
                  />
                  <button
                    type="button"
                    className="he-opening-hours__copy-btn"
                    disabled={readOnly || !day.isOpen}
                    onClick={() => copyCloseTimeToAllOpenDays(day.closeTime)}
                  >
                    Copy to all
                  </button>
                </div>
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export const hubOpeningHoursEditorStyles = {
  section: {
    marginTop: 24,
    paddingTop: 24,
    borderTop: "1px solid rgba(15, 17, 21, 0.1)",
  } satisfies CSSProperties,
};
