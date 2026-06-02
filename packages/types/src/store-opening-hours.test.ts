import { describe, expect, it } from "vitest";

import {
  OPENING_HOURS_UI_DAYS,
  getStoreOpeningSession,
  isStoreOpenInEuropeLondon,
} from "./store-opening-hours.js";

const hoursForDays = (
  openDays: number[],
  openTime: string,
  closeTime: string,
) =>
  OPENING_HOURS_UI_DAYS.map(({ dayOfWeek }) => ({
    dayOfWeek,
    isOpen: openDays.includes(dayOfWeek),
    openTime,
    closeTime,
  }));

describe("store opening hours (Europe/London)", () => {
  const mondayOnly = hoursForDays([1], "16:00", "01:00");

  it("treats 16:00–01:00 as open on Monday evening", () => {
    const monday11pm = new Date("2026-06-01T22:00:00.000Z");
    expect(isStoreOpenInEuropeLondon(mondayOnly, monday11pm)).toBe(true);
  });

  it("keeps Monday 16:00–01:00 open after midnight into Tuesday morning", () => {
    const tuesdayHalfPastMidnight = new Date("2026-06-01T23:30:00.000Z");
    expect(isStoreOpenInEuropeLondon(mondayOnly, tuesdayHalfPastMidnight)).toBe(true);
    const session = getStoreOpeningSession(mondayOnly, tuesdayHalfPastMidnight);
    expect(session.minutesUntilClose).toBe(30);
    expect(session.closesAtTime).toBe("01:00");
  });

  it("closes after the early-morning end time", () => {
    const tuesday2am = new Date("2026-06-02T01:00:00.000Z");
    expect(isStoreOpenInEuropeLondon(mondayOnly, tuesday2am)).toBe(false);
  });

  it("does not treat Tuesday morning before open as open when only Monday is configured", () => {
    const tuesday10am = new Date("2026-06-02T09:00:00.000Z");
    expect(isStoreOpenInEuropeLondon(mondayOnly, tuesday10am)).toBe(false);
  });

  it("treats 00:00 close as end of the same calendar day, not 1am next day", () => {
    const untilMidnight = hoursForDays([1], "12:00", "00:00");
    const monday11pm = new Date("2026-06-01T22:00:00.000Z");
    const tuesdayHalfPastMidnight = new Date("2026-06-01T23:30:00.000Z");
    expect(isStoreOpenInEuropeLondon(untilMidnight, monday11pm)).toBe(true);
    expect(isStoreOpenInEuropeLondon(untilMidnight, tuesdayHalfPastMidnight)).toBe(false);
  });

  it("counts down to 01:00 close on Monday night, not midnight", () => {
    const monday11pm = new Date("2026-06-01T22:00:00.000Z");
    const session = getStoreOpeningSession(mondayOnly, monday11pm);
    expect(session.isOpen).toBe(true);
    expect(session.minutesUntilClose).toBe(120);
    expect(session.closesAtTime).toBe("01:00");
  });

  it("supports classic evening trade 22:00–02:00", () => {
    const friSat = hoursForDays([5, 6], "22:00", "02:00");
    const saturday1am = new Date("2026-06-06T00:00:00.000Z");
    expect(isStoreOpenInEuropeLondon(friSat, saturday1am)).toBe(true);
  });
});
