/** Local persistence for “live order” strip and optional sensory feedback. */

export const ACTIVE_ORDER_STORAGE_KEY = "hull-eats-active-order-snapshot";
export const SENSORY_DELIGHTS_STORAGE_KEY = "hull-eats-sensory-delights";

export type ActiveOrderSnapshot = {
  orderNumber: string;
  storeName: string;
  storeSlug: string;
  placedAt: string;
  etaMinutesHint: number | null;
};

export function dispatchActiveOrderUpdated() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent("hull-eats-active-order-updated"));
}

export function saveActiveOrderSnapshot(snap: ActiveOrderSnapshot) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(snap));
  } catch {
    /* ignore quota */
  }
  dispatchActiveOrderUpdated();
}

export function clearActiveOrderSnapshot() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  dispatchActiveOrderUpdated();
}

export function loadActiveOrderSnapshot(): ActiveOrderSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ActiveOrderSnapshot;
    if (!parsed?.orderNumber || !parsed?.storeName) {
      return null;
    }
    const placed = Date.parse(parsed.placedAt);
    if (Number.isNaN(placed) || Date.now() - placed > 36 * 60 * 60 * 1000) {
      window.localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isSensoryDelightsEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(SENSORY_DELIGHTS_STORAGE_KEY) === "1";
}

export function setSensoryDelightsEnabled(enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(SENSORY_DELIGHTS_STORAGE_KEY, enabled ? "1" : "0");
  window.dispatchEvent(new CustomEvent("hull-eats-sensory-changed"));
}

/** Very short success tone + light vibration (when enabled). */
export function playOrderSuccessDelight() {
  if (typeof window === "undefined" || !isSensoryDelightsEnabled()) {
    return;
  }

  try {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(784, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(988, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    void ctx.resume().catch(() => {});
  } catch {
    /* ignore */
  }

  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([10, 36, 14]);
    }
  } catch {
    /* ignore */
  }
}
