"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  ACTIVE_ORDER_STORAGE_KEY,
  clearActiveOrderSnapshot,
  loadActiveOrderSnapshot,
  type ActiveOrderSnapshot,
} from "../lib/customer-experience";

export function ActiveOrderStrip() {
  const [snap, setSnap] = useState<ActiveOrderSnapshot | null>(null);

  const refresh = useCallback(() => {
    setSnap(loadActiveOrderSnapshot());
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === ACTIVE_ORDER_STORAGE_KEY) {
        refresh();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("hull-eats-active-order-updated", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("hull-eats-active-order-updated", refresh);
    };
  }, [refresh]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    if (snap) {
      document.body.classList.add("he-has-active-order");
    } else {
      document.body.classList.remove("he-has-active-order");
    }
    return () => {
      document.body.classList.remove("he-has-active-order");
    };
  }, [snap]);

  if (!snap) {
    return null;
  }

  const eta =
    typeof snap.etaMinutesHint === "number" && snap.etaMinutesHint > 0
      ? `Typical prep around ${snap.etaMinutesHint} min — check live status for updates.`
      : "Track for live status from the kitchen and courier.";

  return (
    <div className="active-order-strip" role="region" aria-label="Active order">
      <div className="active-order-strip-inner">
        <div className="active-order-strip-pulse" aria-hidden="true" />
        <div className="active-order-strip-copy">
          <p className="active-order-strip-title">Order in progress</p>
          <p className="active-order-strip-detail">
            <strong>{snap.orderNumber}</strong>
            <span className="active-order-strip-dot">·</span>
            {snap.storeName}
          </p>
          <p className="active-order-strip-eta">{eta}</p>
        </div>
        <div className="active-order-strip-actions">
          <Link href={`/track/${encodeURIComponent(snap.orderNumber)}`} className="active-order-strip-link">
            Live tracking
          </Link>
          <button type="button" className="active-order-strip-dismiss" onClick={() => clearActiveOrderSnapshot()}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
