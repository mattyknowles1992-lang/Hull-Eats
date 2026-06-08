import { z } from "zod";

import type { PrintJobPayload } from "./printer";

export const kitchenTicketDetailModes = ["normal", "in_depth"] as const;
export type KitchenTicketDetailMode = (typeof kitchenTicketDetailModes)[number];

/** @deprecated Single order ticket only — kind is ignored. */
export const kitchenTicketKinds = ["order"] as const;
/** @deprecated Use unified order ticket settings instead. */
export type KitchenTicketKind = (typeof kitchenTicketKinds)[number];

export const kitchenTicketBlockIds = [
  "headerBranding",
  "ticketLogo",
  "ticketTitle",
  "orderNumber",
  "placedAt",
  "prepTime",
  "lineIndex",
  "itemQuantityName",
  "itemTotal",
  "buildComponents",
  "removedComponents",
  "selectedOptions",
  "lineNotes",
  "orderNotes",
  "customerBlock",
  "deliveryAddress",
  "totals",
  "payment",
  "courierQr",
] as const;

export type KitchenTicketBlockId = (typeof kitchenTicketBlockIds)[number];

export type KitchenTicketLineComponent = {
  label: string;
  quantity: number;
  removed?: boolean;
};

export type KitchenTicketLineOption = {
  groupName: string;
  valueName: string;
  quantity: number;
  priceDelta: number;
};

export type KitchenTicketLine = {
  name: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  notes?: string;
  components?: KitchenTicketLineComponent[];
  selectedOptions?: KitchenTicketLineOption[];
};

export type KitchenTicketOrderSnapshot = {
  paymentStatus?: string;
  paymentMethod?: string;
  customerPhone?: string;
  customerEmail?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postcode?: string | null;
  subtotalAmount?: unknown;
  deliveryFee?: unknown;
  totalAmount?: unknown;
  currency?: string;
};

export type KitchenTicketPayload = {
  orderNumber: string;
  storeName?: string;
  customerName: string;
  placedAtIso: string;
  prepTimeMinutes?: number | null;
  notes?: string;
  qrCodeData?: string;
  lines: KitchenTicketLine[];
};

const kitchenTicketLayoutSchema = z.object({
  blocks: z.record(z.boolean()).optional().default({}),
});

/** Max uploaded ticket logo payload — keeps PATCH bodies reasonable. */
export const MAX_TICKET_LOGO_DATA_URL_CHARS = 200_000;

export const hubTicketLogoUrlSchema = z.preprocess((value) => {
  if (value == null) {
    return "";
  }
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }
  try {
    // eslint-disable-next-line no-new
    new URL(trimmed);
    return trimmed;
  } catch {
    return "";
  }
}, z.string().max(MAX_TICKET_LOGO_DATA_URL_CHARS, "Ticket logo is too large. Use a smaller image.")).default("");

const legacyKitchenTicketLayoutSchema = kitchenTicketLayoutSchema.optional();

export const kitchenTicketSettingsSchema = z.object({
  /** Normal = extras, salad, sauce on ticket only. In-depth = include burger/kebab build parts. */
  detailMode: z.enum(kitchenTicketDetailModes).default("normal"),
  /** Print 2 x patty as two lines of 1 x patty (easier to tick off). */
  splitQuantityLines: z.boolean().default(false),
  /** Optional logo printed on the order ticket (upload in merchant portal). */
  ticketLogoUrl: hubTicketLogoUrlSchema,
  /** One ticket for the whole order — kitchen checklist, bag label, and courier scan. */
  order: kitchenTicketLayoutSchema.default({}),
  /** @deprecated Migrated into `order` on read. */
  kitchen: legacyKitchenTicketLayoutSchema,
  /** @deprecated Migrated into `order` on read. */
  delivery: legacyKitchenTicketLayoutSchema,
});

export type KitchenTicketSettings = z.infer<typeof kitchenTicketSettingsSchema>;

export const LINE_CUSTOMISATION_PREFIX = "__HULL_LINE_CUSTOMISATION:";

export type PersistedLineCustomisation = {
  components?: KitchenTicketLineComponent[];
  selectedOptions?: KitchenTicketLineOption[];
};

export function defaultKitchenTicketBlockVisibility(): Record<KitchenTicketBlockId, boolean> {
  return {
    headerBranding: true,
    ticketLogo: true,
    ticketTitle: true,
    orderNumber: true,
    placedAt: true,
    prepTime: true,
    lineIndex: true,
    itemQuantityName: true,
    itemTotal: false,
    buildComponents: true,
    removedComponents: true,
    selectedOptions: true,
    lineNotes: true,
    orderNotes: true,
    customerBlock: true,
    deliveryAddress: true,
    totals: true,
    payment: true,
    courierQr: true,
  };
}

function mergeLegacyTicketBlocks(
  value: Partial<KitchenTicketSettings> | null | undefined,
): Record<string, boolean> {
  const defaults = defaultKitchenTicketBlockVisibility();
  const merged: Record<string, boolean> = { ...defaults };

  for (const blockId of kitchenTicketBlockIds) {
    const orderOverride = value?.order?.blocks?.[blockId];
    const deliveryOverride = value?.delivery?.blocks?.[blockId];
    const kitchenOverride = value?.kitchen?.blocks?.[blockId];

    if (orderOverride !== undefined) {
      merged[blockId] = orderOverride;
    } else if (deliveryOverride !== undefined) {
      merged[blockId] = deliveryOverride;
    } else if (kitchenOverride !== undefined) {
      merged[blockId] = kitchenOverride;
    }
  }

  return merged;
}

export function defaultKitchenTicketSettings(): KitchenTicketSettings {
  return kitchenTicketSettingsSchema.parse({
    order: { blocks: defaultKitchenTicketBlockVisibility() },
  });
}

export function normalizeKitchenTicketSettings(
  value: Partial<KitchenTicketSettings> | null | undefined,
): KitchenTicketSettings {
  const defaults = defaultKitchenTicketSettings();
  if (!value || typeof value !== "object") {
    return defaults;
  }

  return kitchenTicketSettingsSchema.parse({
    detailMode: value.detailMode ?? defaults.detailMode,
    splitQuantityLines: value.splitQuantityLines ?? defaults.splitQuantityLines,
    ticketLogoUrl: value.ticketLogoUrl ?? defaults.ticketLogoUrl,
    order: { blocks: mergeLegacyTicketBlocks(value) },
  });
}

export function composePartsLibrariesEnabled(settings: KitchenTicketSettings): boolean {
  return settings.detailMode === "in_depth";
}

export function isKitchenTicketBlockVisible(
  settings: KitchenTicketSettings,
  blockIdOrKind: KitchenTicketBlockId | KitchenTicketKind,
  maybeBlockId?: KitchenTicketBlockId,
): boolean {
  const blockId = maybeBlockId ?? (blockIdOrKind as KitchenTicketBlockId);
  const defaults = defaultKitchenTicketBlockVisibility();
  const override = settings.order.blocks?.[blockId];
  if (override === undefined) {
    return defaults[blockId];
  }
  return override;
}

export function encodeLineCustomisationMarker(snapshot: PersistedLineCustomisation): string {
  return `${LINE_CUSTOMISATION_PREFIX}${JSON.stringify(snapshot)}__`;
}

export function parseLineCustomisationFromNotes(notes?: string | null): {
  customerNotes: string[];
  snapshot: PersistedLineCustomisation | null;
} {
  if (!notes?.trim()) {
    return { customerNotes: [], snapshot: null };
  }

  const customerNotes: string[] = [];
  let snapshot: PersistedLineCustomisation | null = null;

  for (const chunk of notes.split("|")) {
    const trimmed = chunk.trim();
    if (!trimmed) {
      continue;
    }
    if (trimmed.startsWith(LINE_CUSTOMISATION_PREFIX)) {
      const raw = trimmed.slice(LINE_CUSTOMISATION_PREFIX.length).replace(/__$/, "");
      try {
        const parsed = JSON.parse(raw) as PersistedLineCustomisation;
        if (parsed && typeof parsed === "object") {
          snapshot = {
            components: Array.isArray(parsed.components) ? parsed.components : undefined,
            selectedOptions: Array.isArray(parsed.selectedOptions) ? parsed.selectedOptions : undefined,
          };
        }
      } catch {
        snapshot = null;
      }
      continue;
    }
    customerNotes.push(trimmed);
  }

  return { customerNotes, snapshot };
}

export function mergeLineFromOrderNotes(
  line: KitchenTicketLine,
  settings: KitchenTicketSettings,
): KitchenTicketLine {
  const { customerNotes, snapshot } = parseLineCustomisationFromNotes(line.notes);
  const merged: KitchenTicketLine = {
    ...line,
    notes: customerNotes.length > 0 ? customerNotes.join(" | ") : undefined,
    components: snapshot?.components ?? line.components,
    selectedOptions: snapshot?.selectedOptions ?? line.selectedOptions,
  };

  if (settings.detailMode === "normal") {
    return {
      ...merged,
      components: undefined,
    };
  }

  return merged;
}

function expandComponentLines(
  components: KitchenTicketLineComponent[],
  splitQuantityLines: boolean,
): string[] {
  const lines: string[] = [];
  for (const component of components) {
    if (splitQuantityLines && component.quantity > 1) {
      for (let index = 0; index < component.quantity; index += 1) {
        lines.push(`[x] ${component.label} x1`);
      }
      continue;
    }
    lines.push(`[x] ${component.label} x${component.quantity}`);
  }
  return lines;
}

function formatReceiptMoney(value: unknown): string {
  return `${String.fromCharCode(163)}${Number(value).toFixed(2)}`;
}

function formatReceiptTime(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAddressLines(order?: KitchenTicketOrderSnapshot): string[] {
  const addressLines = [
    order?.addressLine1,
    order?.addressLine2,
    [order?.city, order?.postcode].filter(Boolean).join(" "),
  ].filter(Boolean) as string[];

  return addressLines.length > 0 ? addressLines : ["Collection / no delivery address"];
}

function formatLineChecklist(
  line: KitchenTicketLine,
  settings: KitchenTicketSettings,
  options: { showComponents: boolean },
): string[] {
  const buildParts = options.showComponents
    ? (line.components ?? []).filter((component) => !component.removed)
    : [];
  const noParts = options.showComponents ? (line.components ?? []).filter((component) => component.removed) : [];

  const itemLines: string[] = [];
  if (settings.splitQuantityLines && line.quantity > 1) {
    for (let index = 0; index < line.quantity; index += 1) {
      itemLines.push(`1 x ${line.name}`);
    }
  } else {
    itemLines.push(`${line.quantity} x ${line.name}`);
  }

  const rows: string[] = [...itemLines];

  if (line.totalPrice !== undefined) {
    rows.push(`    Item total: ${formatReceiptMoney(line.totalPrice)}`);
  }

  if (line.notes?.trim()) {
    rows.push(`    NOTE: ${line.notes.trim()}`);
  }

  if (noParts.length > 0) {
    rows.push("    NO:");
    rows.push(...noParts.map((component) => `    [ ] ${component.label} x${component.quantity}`));
  }

  if (buildParts.length > 0) {
    rows.push("    BUILD:");
    rows.push(...expandComponentLines(buildParts, settings.splitQuantityLines).map((entry) => `    ${entry}`));
  }

  rows.push(
    ...(line.selectedOptions ?? []).map(
      (option) =>
        `    [x] ${option.groupName}: ${option.valueName} x${option.quantity}${
          option.priceDelta > 0 ? ` +${formatReceiptMoney(option.priceDelta)}` : ""
        }`,
    ),
  );

  return rows.filter((entry) => entry.trim().length > 0);
}

/** One ticket for cook → bag → courier scan → delivery. */
export function formatOrderTicketPreview(
  settings: KitchenTicketSettings,
  payload: KitchenTicketPayload,
  order?: KitchenTicketOrderSnapshot,
  options?: { hubLogoUrl?: string },
): string {
  const show = (blockId: KitchenTicketBlockId) => isKitchenTicketBlockVisible(settings, blockId);
  const showComponents = settings.detailMode === "in_depth" && show("buildComponents");
  const lines = payload.lines.map((line) => mergeLineFromOrderNotes(line, settings));

  const receiptDivider = "--------------------------------";
  const logoUrl = settings.ticketLogoUrl.trim() || options?.hubLogoUrl?.trim() || "";
  const body: string[] = [];

  if (show("ticketLogo") && logoUrl) {
    body.push(`[LOGO] ${logoUrl}`);
  }

  if (show("headerBranding")) {
    body.push("          HULL EATS", " Anything you want. Delivered.");
    if (payload.storeName) {
      body.push(`          ${payload.storeName}`);
    }
  }

  body.push(receiptDivider);

  if (show("ticketTitle")) {
    body.push("          ORDER TICKET");
    body.push("   Cook · stick on bag · scan to deliver");
  }

  if (show("placedAt")) {
    body.push(`Placed: ${formatReceiptTime(payload.placedAtIso)}`);
  }

  if (show("orderNumber")) {
    body.push(`# ${payload.orderNumber}`);
  }

  if (show("prepTime") && payload.prepTimeMinutes) {
    body.push(`PREP TIME: ${payload.prepTimeMinutes} minutes`);
  }

  body.push(receiptDivider, "CHECKLIST", "");

  lines.forEach((line, index) => {
    const formatted = formatLineChecklist(line, settings, { showComponents });
    const firstLine = formatted[0] ?? "";
    const head = show("lineIndex") ? `${index + 1}. ${firstLine}` : firstLine;
    if (head) {
      body.push(head, ...formatted.slice(1), "");
    }
  });

  if (show("orderNotes") && payload.notes?.trim()) {
    body.push(`ORDER NOTES: ${payload.notes.trim()}`);
  }

  body.push(receiptDivider);

  if (show("totals") && order?.subtotalAmount !== undefined) {
    body.push(`Subtotal: ${formatReceiptMoney(order.subtotalAmount)}`);
  }
  if (show("totals") && order?.deliveryFee !== undefined) {
    body.push(`Delivery charge: ${formatReceiptMoney(order.deliveryFee)}`);
  }
  if (show("totals") && order?.totalAmount !== undefined) {
    body.push(`Total due: ${formatReceiptMoney(order.totalAmount)} ${order.currency ?? "GBP"}`);
  }

  if (show("totals")) {
    body.push(receiptDivider);
  }

  if (show("payment")) {
    body.push(
      String(order?.paymentStatus ?? "pending").toLowerCase() === "paid"
        ? "       ORDER HAS BEEN PAID"
        : "          PAYMENT PENDING",
    );
    body.push(`Payment method: ${String(order?.paymentMethod ?? "dojo_card").replaceAll("_", " ").toUpperCase()}`);
    body.push(receiptDivider);
  }

  if (show("customerBlock")) {
    body.push("Customer details:", payload.customerName);
    if (order?.customerPhone) {
      body.push(`Phone: ${order.customerPhone}`);
    }
    if (order?.customerEmail) {
      body.push(`Email: ${order.customerEmail}`);
    }
    body.push("");
  }

  if (show("deliveryAddress")) {
    body.push("Delivery address:", ...formatAddressLines(order));
    body.push(receiptDivider);
  }

  if (show("courierQr")) {
    body.push(
      "Scan the QR code below to start",
      "courier tracking for this order.",
      `Backup order number: ${payload.orderNumber}`,
    );
  }

  return body.filter((line) => line !== "").join("\n");
}

/** @deprecated Kind is ignored — use `formatOrderTicketPreview`. */
export function formatKitchenTicketPreview(
  _kind: KitchenTicketKind | "kitchen" | "delivery",
  settings: KitchenTicketSettings,
  payload: KitchenTicketPayload,
  order?: KitchenTicketOrderSnapshot,
  options?: { hubLogoUrl?: string },
): string {
  return formatOrderTicketPreview(settings, payload, order, options);
}

export function sampleKitchenTicketPayload(): KitchenTicketPayload {
  return {
    orderNumber: "HE-482910-42",
    storeName: "Smash Bros",
    customerName: "Alex Customer",
    placedAtIso: new Date().toISOString(),
    prepTimeMinutes: 25,
    notes: "Ring doorbell",
    qrCodeData: "https://hull-eats.example/track/HE-482910-42",
    lines: [
      {
        name: "Classic Smash",
        quantity: 1,
        totalPrice: 8.5,
        components: [
          { label: "Brioche bun", quantity: 1 },
          { label: "3oz smash patty", quantity: 2 },
          { label: "Cheese", quantity: 2 },
          { label: "Onion", quantity: 1 },
          { label: "Lettuce", quantity: 1 },
          { label: "Gherkin", quantity: 1 },
          { label: "Burger sauce", quantity: 1 },
        ],
        selectedOptions: [{ groupName: "Extra sauce", valueName: "Garlic mayo", quantity: 1, priceDelta: 0.5 }],
      },
    ],
  };
}

export function readKitchenTicketFromDeliveryConfig(deliveryConfig: unknown): KitchenTicketSettings {
  if (!deliveryConfig || typeof deliveryConfig !== "object") {
    return defaultKitchenTicketSettings();
  }
  const kitchenTicket = (deliveryConfig as { kitchenTicket?: Partial<KitchenTicketSettings> }).kitchenTicket;
  return normalizeKitchenTicketSettings(kitchenTicket);
}

export function printPayloadLineToKitchenLine(line: PrintJobPayload["lines"][number]): KitchenTicketLine {
  return {
    name: line.name,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    totalPrice: line.totalPrice,
    notes: line.notes,
    components: line.components,
    selectedOptions: line.selectedOptions,
  };
}
