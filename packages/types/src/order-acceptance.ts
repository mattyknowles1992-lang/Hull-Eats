import { z } from "zod";

export const orderAcceptanceModes = ["manual", "standard_auto", "smart_auto"] as const;
export type OrderAcceptanceMode = (typeof orderAcceptanceModes)[number];

export const DEFAULT_SMART_PREP_BASELINE_MINUTES = 40;
export const DEFAULT_SMART_PREP_WINDOW_MINUTES = 45;
export const PREP_TIME_STEP_MINUTES = 10;

/** Extra minutes added by how many orders are still in the kitchen pipeline within the window. */
export const SMART_PREP_EXTRA_BY_ACTIVE_COUNT = [0, 0, 10, 20, 30, 40, 50, 60, 70] as const;

export const orderAcceptanceSettingsSchema = z.object({
  mode: z.enum(orderAcceptanceModes).default("manual"),
  /** Cap for auto-accept quoted prep (standard and smart). */
  standardMaxPrepMinutes: z.number().int().min(10).max(180).default(60),
  /** Starting point for smart/manual suggestions when the kitchen is quiet. */
  smartPrepBaselineMinutes: z.number().int().min(10).max(180).default(DEFAULT_SMART_PREP_BASELINE_MINUTES),
  /** Rolling window for counting active orders (minutes). */
  smartPrepWindowMinutes: z.number().int().min(15).max(180).default(DEFAULT_SMART_PREP_WINDOW_MINUTES),
});

export type OrderAcceptanceSettings = z.infer<typeof orderAcceptanceSettingsSchema>;

export function defaultOrderAcceptanceSettings(): OrderAcceptanceSettings {
  return orderAcceptanceSettingsSchema.parse({});
}

export function normalizeOrderAcceptanceSettings(
  value: Partial<OrderAcceptanceSettings> | null | undefined,
): OrderAcceptanceSettings {
  if (!value || typeof value !== "object") {
    return defaultOrderAcceptanceSettings();
  }
  return orderAcceptanceSettingsSchema.parse({ ...defaultOrderAcceptanceSettings(), ...value });
}

export function orderAcceptanceUsesAutoAccept(mode: OrderAcceptanceMode): boolean {
  return mode === "standard_auto" || mode === "smart_auto";
}

export function deriveOrderAcceptanceModeFromLegacy(autoAcceptOrders: boolean): OrderAcceptanceMode {
  return autoAcceptOrders ? "standard_auto" : "manual";
}

export function roundPrepToStep(minutes: number, step = PREP_TIME_STEP_MINUTES): number {
  const rounded = Math.round(minutes / step) * step;
  return Math.max(step, Math.min(180, rounded));
}

export function listPrepTimeOptions(step = PREP_TIME_STEP_MINUTES, max = 180): number[] {
  const options: number[] = [];
  for (let value = step; value <= max; value += step) {
    options.push(value);
  }
  return options;
}

export function computeSmartPrepExtraMinutes(activeOrderCount: number): number {
  const count = Math.max(1, Math.floor(activeOrderCount));
  const index = Math.min(count, SMART_PREP_EXTRA_BY_ACTIVE_COUNT.length - 1);
  return SMART_PREP_EXTRA_BY_ACTIVE_COUNT[index] ?? SMART_PREP_EXTRA_BY_ACTIVE_COUNT.at(-1)!;
}

export function computeQuotedPrepMinutes(args: {
  mode: OrderAcceptanceMode;
  etaMinutes: number;
  settings: OrderAcceptanceSettings;
  activeOrdersInWindow: number;
}): number {
  const cap = args.settings.standardMaxPrepMinutes;
  const baseline = Math.max(args.settings.smartPrepBaselineMinutes, args.etaMinutes);

  if (args.mode === "standard_auto") {
    return Math.min(Math.max(args.etaMinutes, PREP_TIME_STEP_MINUTES), cap);
  }

  const extra = computeSmartPrepExtraMinutes(args.activeOrdersInWindow);
  const smart = baseline + extra;
  return roundPrepToStep(Math.min(smart, cap));
}

export function readOrderAcceptanceFromDeliveryConfig(deliveryConfig: unknown): OrderAcceptanceSettings {
  if (!deliveryConfig || typeof deliveryConfig !== "object") {
    return defaultOrderAcceptanceSettings();
  }
  const raw = (deliveryConfig as { orderAcceptance?: Partial<OrderAcceptanceSettings> }).orderAcceptance;
  return normalizeOrderAcceptanceSettings(raw);
}
