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

const parseHm = (value: string) => {
  const parts = value.split(":");
  const hh = Number(parts[0]);
  const mm = Number(parts[1] ?? "0");
  return (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
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

const isWithinDayWindow = (nowMinutes: number, openMinutes: number, closeMinutes: number) => {
  if (closeMinutes > openMinutes) {
    return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
  }
  return nowMinutes >= openMinutes || nowMinutes < closeMinutes;
};

const isOvernightWindow = (openMinutes: number, closeMinutes: number) => closeMinutes <= openMinutes;

/** When no hours are saved yet, treat schedule as permissive (marketplace LIVE flag still applies). */
export const isStoreOpenInEuropeLondon = (
  openingHours: StoreOpeningHours | undefined,
  at?: Date,
): boolean => {
  const hours = normalizeOpeningHours(openingHours ?? []);
  const configured = hours.filter((day) => day.isOpen);
  if (configured.length === 0) {
    return true;
  }

  const { dayOfWeek, minutes } = getEuropeLondonNow(at);
  const today = hours.find((day) => day.dayOfWeek === dayOfWeek);
  if (today?.isOpen && isWithinDayWindow(minutes, parseHm(today.openTime), parseHm(today.closeTime))) {
    return true;
  }

  const previousDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const previousDay = hours.find((day) => day.dayOfWeek === previousDayOfWeek);
  if (!previousDay?.isOpen) {
    return false;
  }

  const previousOpenMinutes = parseHm(previousDay.openTime);
  const previousCloseMinutes = parseHm(previousDay.closeTime);
  if (!isOvernightWindow(previousOpenMinutes, previousCloseMinutes)) {
    return false;
  }

  return minutes < previousCloseMinutes;
};

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

  if (!isStoreOpenInEuropeLondon(openingHours, at)) {
    return "Closed";
  }

  return "Open now";
};
