"use client";

import type { CSSProperties } from "react";
import type { StoreOpeningHours, StoreOpeningHoursDay } from "@hull-eats/types";
import { OPENING_HOURS_UI_DAYS } from "@hull-eats/types";
import { useHubPortalI18n } from "@hull-eats/i18n";

type HubOpeningHoursEditorProps = {
  openingHours: StoreOpeningHours;
  onChange: (openingHours: StoreOpeningHours) => void;
  readOnly?: boolean;
  /** When true, the page shell already shows the section title — hide duplicate header. */
  embedded?: boolean;
};

const patchDay = (hours: StoreOpeningHours, dayOfWeek: number, patch: Partial<StoreOpeningHoursDay>): StoreOpeningHours =>
  hours.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day));

export function HubOpeningHoursEditor({
  openingHours,
  onChange,
  readOnly = false,
  embedded = false,
}: HubOpeningHoursEditorProps) {
  const { t } = useHubPortalI18n();

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
    <section className={`he-opening-hours${embedded ? " he-opening-hours--embedded" : ""}`}>
      {!embedded ? (
        <div className="he-opening-hours__header">
          <div>
            <h3 className="he-opening-hours__title">{t("delivery.openingTimesTitle")}</h3>
            <p className="he-opening-hours__hint">{t("delivery.openingTimesHint")}</p>
          </div>
          <div className="he-opening-hours__bulk">
            <button type="button" className="he-opening-hours__bulk-btn" disabled={readOnly} onClick={setEveryDayOpen}>
              {t("delivery.openEveryDay")}
            </button>
          </div>
        </div>
      ) : (
        <div className="he-opening-hours__toolbar">
          <button type="button" className="he-opening-hours__bulk-btn" disabled={readOnly} onClick={setEveryDayOpen}>
            {t("delivery.openEveryDay")}
          </button>
        </div>
      )}

      <div className="he-opening-hours__cards" role="list" aria-label={t("delivery.weeklyScheduleAria")}>
        {OPENING_HOURS_UI_DAYS.map(({ dayOfWeek, label }, index) => {
          const day = openingHours.find((entry) => entry.dayOfWeek === dayOfWeek);
          if (!day) {
            return null;
          }

          const showBulkCopyButtons = index === 0;

          return (
            <article
              key={dayOfWeek}
              className={`he-opening-hours__day-card${day.isOpen ? " is-open" : " is-closed"}`}
              role="listitem"
            >
              <div className="he-opening-hours__day-head">
                <span className="he-opening-hours__day">{label}</span>
                <label className="he-opening-hours__toggle">
                  <input
                    type="checkbox"
                    checked={day.isOpen}
                    disabled={readOnly}
                    onChange={(event) => onChange(patchDay(openingHours, dayOfWeek, { isOpen: event.target.checked }))}
                  />
                  <span>{day.isOpen ? t("delivery.openLabel") : t("delivery.closedLabel")}</span>
                </label>
              </div>

              {day.isOpen ? (
                <div className="he-opening-hours__times">
                  <label className="he-opening-hours__time-field">
                    <span className="he-opening-hours__field-label">{t("delivery.opens")}</span>
                    <div className="he-opening-hours__time-control">
                      <input
                        type="time"
                        value={day.openTime}
                        disabled={readOnly}
                        onChange={(event) => onChange(patchDay(openingHours, dayOfWeek, { openTime: event.target.value }))}
                      />
                      {showBulkCopyButtons ? (
                        <button
                          type="button"
                          className="he-opening-hours__copy-btn"
                          disabled={readOnly}
                          onClick={() => copyOpenTimeToAllOpenDays(day.openTime)}
                        >
                          {t("settings.copyToAll")}
                        </button>
                      ) : null}
                    </div>
                  </label>

                  <label className="he-opening-hours__time-field">
                    <span className="he-opening-hours__field-label">{t("delivery.closes")}</span>
                    <div className="he-opening-hours__time-control">
                      <input
                        type="time"
                        value={day.closeTime}
                        disabled={readOnly}
                        onChange={(event) => onChange(patchDay(openingHours, dayOfWeek, { closeTime: event.target.value }))}
                      />
                      {showBulkCopyButtons ? (
                        <button
                          type="button"
                          className="he-opening-hours__copy-btn"
                          disabled={readOnly}
                          onClick={() => copyCloseTimeToAllOpenDays(day.closeTime)}
                        >
                          {t("settings.copyToAll")}
                        </button>
                      ) : null}
                    </div>
                  </label>
                </div>
              ) : (
                <p className="he-opening-hours__closed-copy">{t("delivery.closedThisDay")}</p>
              )}
            </article>
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
