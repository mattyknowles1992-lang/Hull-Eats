import { z } from "zod";

export const contactMessageOriginSchema = z.enum(["merchant_hub", "customer_web", "customer_app_via_web"]);
export const contactMessageStatusSchema = z.enum(["new", "in_progress", "resolved"]);

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

export const publicContactMessageInputSchema = z.object({
  origin: z.enum(["customer_web", "customer_app_via_web"]).default("customer_web"),
  senderName: z.string().trim().min(1).max(120),
  senderEmail: z.string().trim().email(),
  senderPhone: optionalTrimmedString,
  subject: z.string().trim().min(1).max(140),
  message: z.string().trim().min(1).max(4000),
  orderNumber: optionalTrimmedString,
  sourcePath: optionalTrimmedString,
});

export const merchantContactMessageInputSchema = z.object({
  senderPhone: optionalTrimmedString,
  subject: z.string().trim().min(1).max(140),
  message: z.string().trim().min(1).max(4000),
  orderNumber: optionalTrimmedString,
  sourcePath: optionalTrimmedString,
});

export const adminUpdateContactMessageStatusInputSchema = z.object({
  status: contactMessageStatusSchema,
});

export const contactMessageRecordSchema = z.object({
  id: z.string().min(1),
  origin: contactMessageOriginSchema,
  status: contactMessageStatusSchema,
  senderName: z.string().min(1),
  senderEmail: z.string().email(),
  senderPhone: z.string().default(""),
  subject: z.string().min(1),
  message: z.string().min(1),
  orderNumber: z.string().nullable(),
  sourcePath: z.string().nullable(),
  hubId: z.string().nullable(),
  hubName: z.string().nullable(),
  customerProfileId: z.string().nullable(),
  resolvedAt: z.string().datetime().nullable(),
  resolvedByEmail: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ContactMessageOrigin = z.infer<typeof contactMessageOriginSchema>;
export type ContactMessageStatus = z.infer<typeof contactMessageStatusSchema>;
export type PublicContactMessageInput = z.infer<typeof publicContactMessageInputSchema>;
export type MerchantContactMessageInput = z.infer<typeof merchantContactMessageInputSchema>;
export type AdminUpdateContactMessageStatusInput = z.infer<typeof adminUpdateContactMessageStatusInputSchema>;
export type ContactMessageRecord = z.infer<typeof contactMessageRecordSchema>;
