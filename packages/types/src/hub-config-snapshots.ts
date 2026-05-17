import { z } from "zod";

import { hubMenuSectionUpdateSchema, hubSettingsSchema, prepareMerchantWorkspaceUpdateBody } from "./hubs";

export const HUB_CONFIG_SNAPSHOT_LIMIT = 5;

export const hubConfigSnapshotPayloadSchema = z.object({
  settings: hubSettingsSchema,
  menuSections: z.array(hubMenuSectionUpdateSchema),
});

export type HubConfigSnapshotPayload = z.infer<typeof hubConfigSnapshotPayloadSchema>;

export const hubConfigSnapshotSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  createdAt: z.string().min(1),
  payload: hubConfigSnapshotPayloadSchema,
});

export type HubConfigSnapshot = z.infer<typeof hubConfigSnapshotSchema>;

const createHubConfigSnapshotBodySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  settings: hubSettingsSchema,
  menuSections: z.array(hubMenuSectionUpdateSchema),
});

export const createHubConfigSnapshotInputSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== "object") {
    return raw;
  }
  const body = raw as { name?: string; settings?: unknown; menuSections?: unknown };
  const prepared = prepareMerchantWorkspaceUpdateBody({
    settings: body.settings,
    menuSections: body.menuSections,
  }) as { settings: unknown; menuSections: unknown };
  return { name: body.name, settings: prepared.settings, menuSections: prepared.menuSections };
}, createHubConfigSnapshotBodySchema);

export const renameHubConfigSnapshotInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export type CreateHubConfigSnapshotInput = z.infer<typeof createHubConfigSnapshotInputSchema>;
export type RenameHubConfigSnapshotInput = z.infer<typeof renameHubConfigSnapshotInputSchema>;
