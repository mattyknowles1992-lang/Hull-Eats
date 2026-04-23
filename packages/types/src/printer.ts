import { z } from "zod";

export const printerAdapterTypes = ["mock", "network_esc_pos", "cloud_bridge"] as const;
export const printJobStatuses = ["queued", "processing", "completed", "failed"] as const;

export type PrinterAdapterType = (typeof printerAdapterTypes)[number];
export type PrintJobStatus = (typeof printJobStatuses)[number];

export const printerAdapterTypeSchema = z.enum(printerAdapterTypes);
export const printJobStatusSchema = z.enum(printJobStatuses);

export const printJobPayloadSchema = z.object({
  orderId: z.string().min(1),
  storeId: z.string().min(1),
  printerId: z.string().min(1),
  orderNumber: z.string().min(1),
  customerName: z.string().min(1),
  placedAtIso: z.string().datetime(),
  prepTimeMinutes: z.number().int().nullable(),
  lines: z.array(
    z.object({
      name: z.string().min(1),
      quantity: z.number().int().positive(),
      notes: z.string().optional(),
    }),
  ),
  notes: z.string().optional(),
});

export type PrintJobPayload = z.infer<typeof printJobPayloadSchema>;

