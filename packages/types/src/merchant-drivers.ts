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

export type MerchantDriverCashUpPeriod = z.infer<typeof merchantDriverCashUpPeriodSchema>;
export type MerchantDriverCashUpRow = z.infer<typeof merchantDriverCashUpRowSchema>;
export type MerchantDriverCashUpResponse = z.infer<typeof merchantDriverCashUpResponseSchema>;
export type MerchantDriverAssignment = z.infer<typeof merchantDriverAssignmentSchema>;
export type AddHubCourierAssignmentInput = z.infer<typeof addHubCourierAssignmentInputSchema>;
