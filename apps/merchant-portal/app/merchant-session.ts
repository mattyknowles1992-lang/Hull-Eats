import type { HubUser, MerchantWorkspace } from "@hull-eats/types";

import { removeBrowserStorage, writeBrowserStorage } from "./browser-storage";

export const merchantSessionStorageKey = "hull-eats-merchant-session";
export const merchantLastLoginEmailKey = "hull-eats-merchant-last-login-email";

export type StoredMerchantSession = {
  token: string;
  hubId: string;
  user: HubUser;
};

export function resolveActiveHubUser(workspace: MerchantWorkspace, fallbackUser: HubUser | null): HubUser | null {
  if (!fallbackUser) {
    return null;
  }
  return workspace.users.find((entry) => entry.id === fallbackUser.id) ?? fallbackUser;
}

export function persistMerchantSessionToBrowser(session: StoredMerchantSession): boolean {
  return writeBrowserStorage(merchantSessionStorageKey, JSON.stringify(session));
}

export function clearMerchantSessionFromBrowser(): void {
  removeBrowserStorage(merchantSessionStorageKey);
}
