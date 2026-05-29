import type { HubMenuSection, HubSettings } from "@hull-eats/types";

import { readBrowserStorage, removeBrowserStorage, writeBrowserStorage } from "./browser-storage";

const DRAFT_KEY_PREFIX = "hull-eats-menu-draft-";

export type BrowserMenuDraft = {
  menuSections: HubMenuSection[];
  settings: HubSettings;
  savedAt: string;
};

export type MenuWorkspaceSnapshot = {
  settings: HubSettings;
  menuSections: HubMenuSection[];
};

export function browserMenuDraftKey(hubId: string): string {
  return `${DRAFT_KEY_PREFIX}${hubId}`;
}

export function saveBrowserMenuDraft(hubId: string, menuSections: HubMenuSection[], settings: HubSettings): void {
  if (typeof window === "undefined" || !hubId) {
    return;
  }
  try {
    const payload: BrowserMenuDraft = {
      menuSections,
      settings,
      savedAt: new Date().toISOString(),
    };
    writeBrowserStorage(browserMenuDraftKey(hubId), JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

export function loadBrowserMenuDraft(hubId: string): BrowserMenuDraft | null {
  if (typeof window === "undefined" || !hubId) {
    return null;
  }
  try {
    const raw = readBrowserStorage(browserMenuDraftKey(hubId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as BrowserMenuDraft;
  } catch {
    return null;
  }
}

export function countMenuWorkspaceItems(menuSections: HubMenuSection[]): number {
  return menuSections.reduce((total, section) => total + section.items.length, 0);
}

/** Restore local draft after refresh when it differs from what the hub last saved successfully. */
export function browserDraftShouldAutoRestore(
  draft: BrowserMenuDraft,
  serverSnapshot: MenuWorkspaceSnapshot,
  snapshotsEqual: (left: MenuWorkspaceSnapshot, right: MenuWorkspaceSnapshot) => boolean,
): boolean {
  const draftSnapshot: MenuWorkspaceSnapshot = {
    settings: draft.settings,
    menuSections: draft.menuSections,
  };
  if (snapshotsEqual(draftSnapshot, serverSnapshot)) {
    return false;
  }
  const draftItems = countMenuWorkspaceItems(draft.menuSections);
  const serverItems = countMenuWorkspaceItems(serverSnapshot.menuSections);
  if (draftItems > serverItems) {
    return true;
  }
  if (draftItems > 0 && serverItems === 0) {
    return true;
  }
  return Number.isFinite(Date.parse(draft.savedAt));
}

export function clearBrowserMenuDraft(hubId: string): void {
  if (typeof window === "undefined" || !hubId) {
    return;
  }
  try {
    removeBrowserStorage(browserMenuDraftKey(hubId));
  } catch {
    // ignore
  }
}
