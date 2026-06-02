import { z } from "zod";

/** Postgres `EXTRACT(DOW … Europe/London)`: 0 = Sunday … 6 = Saturday. */
export const STORE_OPENING_DAY_OF_WEEK = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
} as const;

export const OPENING_HOURS_UI_DAYS: ReadonlyArray<{ dayOfWeek: number; label: string }> = [
  { dayOfWeek: STORE_OPENING_DAY_OF_WEEK.monday, label: "Monday" },
  { dayOfWeek: STORE_OPENING_DAY_OF_WEEK.tuesday, label: "Tuesday" },
  { dayOfWeek: STORE_OPENING_DAY_OF_WEEK.wednesday, label: "Wednesday" },
  { dayOfWeek: STORE_OPENING_DAY_OF_WEEK.thursday, label: "Thursday" },
  { dayOfWeek: STORE_OPENING_DAY_OF_WEEK.friday, label: "Friday" },
  { dayOfWeek: STORE_OPENING_DAY_OF_WEEK.saturday, label: "Saturday" },
  { dayOfWeek: STORE_OPENING_DAY_OF_WEEK.sunday, label: "Sunday" },
];

export const storeOpeningHoursDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isOpen: z.boolean(),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const storeOpeningHoursSchema = z.array(storeOpeningHoursDaySchema).length(7);

export type StoreOpeningHoursDay = z.infer<typeof storeOpeningHoursDaySchema>;
export type StoreOpeningHours = z.infer<typeof storeOpeningHoursSchema>;

const MINUTES_PER_DAY = 24 * 60;
const DEFAULT_OPEN_TIME = "00:00";
const DEFAULT_CLOSE_TIME = "23:59";

export const createDefaultOpeningHours = (): StoreOpeningHours =>
  OPENING_HOURS_UI_DAYS.map(({ dayOfWeek }) => ({
    dayOfWeek,
    isOpen: true,
    openTime: DEFAULT_OPEN_TIME,
    closeTime: DEFAULT_CLOSE_TIME,
  }));

export const normalizeTimeHm = (value: string): string => {
  const trimmed = value.trim();
  const match = /^(\d{1,2}):(\d{2})/.exec(trimmed);
  if (!match) {
    return DEFAULT_OPEN_TIME;
  }
  const hours = Math.min(23, Math.max(0, Number(match[1]) || 0));
  const minutes = Math.min(59, Math.max(0, Number(match[2]) || 0));
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export const normalizeOpeningHours = (value: unknown): StoreOpeningHours => {
  const defaults = createDefaultOpeningHours();
  const byDay = new Map<number, StoreOpeningHoursDay>();

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const row = entry as Partial<StoreOpeningHoursDay> & { isClosed?: boolean };
      const dayOfWeek = Number(row.dayOfWeek);
      if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        continue;
      }
      const isOpen =
        typeof row.isOpen === "boolean" ? row.isOpen : typeof row.isClosed === "boolean" ? !row.isClosed : true;
      byDay.set(dayOfWeek, {
        dayOfWeek,
        isOpen,
        openTime: normalizeTimeHm(String(row.openTime ?? DEFAULT_OPEN_TIME)),
        closeTime: normalizeTimeHm(String(row.closeTime ?? DEFAULT_CLOSE_TIME)),
      });
    }
  }

  return defaults.map((fallback) => byDay.get(fallback.dayOfWeek) ?? fallback);
};

export const parseHm = (value: string): number => {
  const parts = value.split(":");
  const hh = Number(parts[0]);
  const mm = Number(parts[1] ?? "0");
  return (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
};

export const formatHm = (minutes: number): string => {
  const clamped = Math.max(0, Math.min(MINUTES_PER_DAY - 1, Math.floor(minutes)));
  const hh = Math.floor(clamped / 60);
  const mm = clamped % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

/**
 * `00:00` close with an afternoon/evening open means "until midnight" on the same calendar day,
 * not 1am the next day. Times like `01:00`–`06:00` after a later open are next-morning close.
 */
export const effectiveCloseMinutes = (openMinutes: number, closeMinutes: number): number => {
  if (closeMinutes === 0 && openMinutes > 0) {
    return MINUTES_PER_DAY;
  }
  return closeMinutes;
};

/** Service runs past midnight into the early hours of the next calendar day. */
export const isOvernightServiceWindow = (openMinutes: number, closeMinutes: number): boolean => {
  if (closeMinutes === 0 && openMinutes > 0) {
    return false;
  }
  return closeMinutes <= openMinutes;
};

const getEuropeLondonNow = (at?: Date) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at ?? new Date());

  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  const weekdayToDow: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    dayOfWeek: weekdayToDow[weekday] ?? 0,
    minutes: hour * 60 + minute,
  };
};

const previousDayOfWeek = (dayOfWeek: number) => (dayOfWeek === 0 ? 6 : dayOfWeek - 1);

const isOpenOnSameCalendarDay = (nowMinutes: number, openMinutes: number, closeMinutes: number) => {
  const close = effectiveCloseMinutes(openMinutes, closeMinutes);
  return nowMinutes >= openMinutes && nowMinutes < close;
};

/** Evening segment for today's row (e.g. Monday 16:00 → midnight when close is 01:00). */
const isOpenDuringTodayEvening = (nowMinutes: number, openMinutes: number, closeMinutes: number) => {
  if (!isOvernightServiceWindow(openMinutes, closeMinutes)) {
    return isOpenOnSameCalendarDay(nowMinutes, openMinutes, closeMinutes);
  }
  return nowMinutes >= openMinutes;
};

/** Early-hours segment carried over from yesterday's row (e.g. Tuesday 00:30 still Monday's 01:00 close). */
const isOpenFromPreviousDayOvernight = (nowMinutes: number, openMinutes: number, closeMinutes: number) => {
  if (!isOvernightServiceWindow(openMinutes, closeMinutes)) {
    return false;
  }
  return nowMinutes < closeMinutes;
};

export type StoreOpeningSession = {
  isOpen: boolean;
  minutesUntilClose: number | null;
  closesAtTime: string | null;
};

const minutesUntilCloseForSession = (
  nowMinutes: number,
  openMinutes: number,
  closeMinutes: number,
  fromPreviousDay: boolean,
): number => {
  if (!isOvernightServiceWindow(openMinutes, closeMinutes)) {
    const close = effectiveCloseMinutes(openMinutes, closeMinutes);
    return Math.max(0, close - nowMinutes);
  }

  if (fromPreviousDay) {
    return Math.max(0, closeMinutes - nowMinutes);
  }

  return Math.max(0, MINUTES_PER_DAY - nowMinutes + closeMinutes);
};

export const getStoreOpeningSession = (
  openingHours: StoreOpeningHours | undefined,
  at?: Date,
): StoreOpeningSession => {
  if (!openingHours || openingHours.length === 0) {
    return { isOpen: false, minutesUntilClose: null, closesAtTime: null };
  }

  const hours = normalizeOpeningHours(openingHours);
  const configured = hours.filter((day) => day.isOpen);
  if (configured.length === 0) {
    return { isOpen: false, minutesUntilClose: null, closesAtTime: null };
  }

  const { dayOfWeek, minutes } = getEuropeLondonNow(at);
  const today = hours.find((day) => day.dayOfWeek === dayOfWeek);
  const previousDay = hours.find((day) => day.dayOfWeek === previousDayOfWeek(dayOfWeek));

  if (today?.isOpen) {
    const openMinutes = parseHm(today.openTime);
    const closeMinutes = parseHm(today.closeTime);
    if (isOpenDuringTodayEvening(minutes, openMinutes, closeMinutes)) {
      return {
        isOpen: true,
        minutesUntilClose: minutesUntilCloseForSession(minutes, openMinutes, closeMinutes, false),
        closesAtTime: today.closeTime,
      };
    }
  }

  if (previousDay?.isOpen) {
    const openMinutes = parseHm(previousDay.openTime);
    const closeMinutes = parseHm(previousDay.closeTime);
    if (isOpenFromPreviousDayOvernight(minutes, openMinutes, closeMinutes)) {
      return {
        isOpen: true,
        minutesUntilClose: minutesUntilCloseForSession(minutes, openMinutes, closeMinutes, true),
        closesAtTime: previousDay.closeTime,
      };
    }
  }

  return { isOpen: false, minutesUntilClose: null, closesAtTime: null };
};

/** Customer-facing availability should only show open when a real schedule is configured. */
export const isStoreOpenInEuropeLondon = (
  openingHours: StoreOpeningHours | undefined,
  at?: Date,
): boolean => getStoreOpeningSession(openingHours, at).isOpen;

export const isStoreTakingOrdersNow = (
  openingHours: StoreOpeningHours | undefined,
  marketplaceLive: boolean,
  acceptingOrders: boolean,
  at?: Date,
): boolean => {
  if (!marketplaceLive || !acceptingOrders) {
    return false;
  }

  return isStoreOpenInEuropeLondon(openingHours, at);
};

export const formatClosesInLabel = (minutesUntilClose: number | null | undefined): string | null => {
  if (minutesUntilClose === null || minutesUntilClose === undefined) {
    return null;
  }
  if (minutesUntilClose <= 0) {
    return "Closing now";
  }
  if (minutesUntilClose < 60) {
    return `Closes in ${minutesUntilClose} min`;
  }
  const hours = Math.floor(minutesUntilClose / 60);
  const mins = minutesUntilClose % 60;
  if (mins === 0) {
    return `Closes in ${hours} hr`;
  }
  return `Closes in ${hours} hr ${mins} min`;
};

export const formatClosesAtLabel = (closesAtTime: string | null | undefined): string | null => {
  if (!closesAtTime) {
    return null;
  }
  const [hhRaw, mmRaw] = closesAtTime.split(":");
  const hh = Number(hhRaw ?? 0);
  const mm = Number(mmRaw ?? 0);
  const hour12 = ((hh + 11) % 12) + 1;
  const suffix = hh >= 12 ? "pm" : "am";
  const time = `${hour12}:${String(mm).padStart(2, "0")}${suffix}`;
  return `Closes at ${time}`;
};

export const describeStoreOpeningStatus = (
  openingHours: StoreOpeningHours | undefined,
  marketplaceLive: boolean,
  acceptingOrders: boolean,
  at?: Date,
): string => {
  if (!marketplaceLive) {
    return "Setup";
  }

  if (!acceptingOrders) {
    return "Paused";
  }

  const session = getStoreOpeningSession(openingHours, at);
  if (!session.isOpen) {
    return "Closed";
  }

  return formatClosesInLabel(session.minutesUntilClose) ?? "Open now";
};
