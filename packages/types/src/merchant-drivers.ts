import { z } from "zod";

export const merchantDriverCashUpPeriodSchema = z.enum(["today", "yesterday", "last_7_days"]);

export const merchantDriverCashUpRowSchema = z.object({
  courierProfileId: z.string().min(1),
  courierName: z.string().min(1),
  paidOrderCount: z.number().int().nonnegative(),
  paidOrderTotal: z.number().nonnegative(),
  cashOrderCount: z.number().int().nonnegative(),
  cashOrderTotal: z.number().nonnegative(),
});

export const merchantDriverCashUpResponseSchema = z.object({
  period: merchantDriverCashUpPeriodSchema,
  rangeLabel: z.string().min(1),
  rangeStartIso: z.string().min(1),
  rangeEndIso: z.string().min(1),
  drivers: z.array(merchantDriverCashUpRowSchema),
  totals: z.object({
    paidOrderCount: z.number().int().nonnegative(),
    paidOrderTotal: z.number().nonnegative(),
    cashOrderCount: z.number().int().nonnegative(),
    cashOrderTotal: z.number().nonnegative(),
  }),
});

export const merchantDriverAssignmentSchema = z.object({
  id: z.string().min(1),
  courierProfileId: z.string().min(1),
  courierEmail: z.string().email(),
  courierName: z.string().min(1),
  storeId: z.string().min(1),
  storeName: z.string().min(1),
  createdAt: z.string().min(1),
});

export const addHubCourierAssignmentInputSchema = z.object({
  email: z.string().email(),
});

/** Create a Hull Eats Courier login for this hub (owner/manager). */
export const createHubCourierInputSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().default(""),
  /** Login username; defaults to email when omitted. */
  username: z.string().min(3).optional(),
  /** Temporary password for the courier app; generated server-side when omitted. */
  password: z.string().min(8).optional(),
  vehicleType: z.string().optional().default("car"),
  vehicleRegistration: z.string().optional(),
});

export const createHubCourierResponseSchema = z.object({
  courierProfileId: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(1),
  temporaryPassword: z.string().min(1).optional(),
  alreadyExisted: z.boolean().optional(),
  message: z.string().optional(),
  assignments: z.array(merchantDriverAssignmentSchema),
});

export type MerchantDriverCashUpPeriod = z.infer<typeof merchantDriverCashUpPeriodSchema>;
export type MerchantDriverCashUpRow = z.infer<typeof merchantDriverCashUpRowSchema>;
export type MerchantDriverCashUpResponse = z.infer<typeof merchantDriverCashUpResponseSchema>;
export type MerchantDriverAssignment = z.infer<typeof merchantDriverAssignmentSchema>;
export type AddHubCourierAssignmentInput = z.infer<typeof addHubCourierAssignmentInputSchema>;
export type CreateHubCourierInput = z.infer<typeof createHubCourierInputSchema>;
export type CreateHubCourierResponse = z.infer<typeof createHubCourierResponseSchema>;
