import type { HubMenuSection, HubSettings } from "@hull-eats/types";

const DRAFT_KEY_PREFIX = "hull-eats-menu-draft-";

export type BrowserMenuDraft = {
  menuSections: HubMenuSection[];
  settings: HubSettings;
  savedAt: string;
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
    window.localStorage.setItem(browserMenuDraftKey(hubId), JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function loadBrowserMenuDraft(hubId: string): BrowserMenuDraft | null {
  if (typeof window === "undefined" || !hubId) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(browserMenuDraftKey(hubId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as BrowserMenuDraft;
  } catch {
    return null;
  }
}

export function clearBrowserMenuDraft(hubId: string): void {
  if (typeof window === "undefined" || !hubId) {
    return;
  }
  try {
    window.localStorage.removeItem(browserMenuDraftKey(hubId));
  } catch {
    // ignore
  }
}
