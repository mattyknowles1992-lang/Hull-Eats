"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  RESALE_REVIEW_RATING_MAX_TENTHS,
  RESALE_REVIEW_RATING_MIN_TENTHS,
} from "@hull-eats/types";

import { formatReviewStarsFromTenths } from "../../src/lib/marketplace-trust";

const STORAGE_KEY = "hull_marketplace_pending_review";

export type PendingMarketplaceReview = {
  purchaseId: string;
  listingTitle: string;
  listingId?: string;
};

function readPending(): PendingMarketplaceReview | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as PendingMarketplaceReview;
  } catch {
    return null;
  }
}

/**
 * After the seller marks a sale paid, the API should tell the client there is a mandatory review.
 * Until then, you can set localStorage key `hull_marketplace_pending_review` with JSON
 * `{ "purchaseId": "…", "listingTitle": "…" }` to preview the gate.
 */
export function MarketplaceReviewGate() {
  const [pending, setPending] = useState<PendingMarketplaceReview | null>(null);
  const [ratingTenths, setRatingTenths] = useState(40);
  const [comment, setComment] = useState("");

  const sync = useCallback(() => {
    setPending(readPending());
  }, []);

  useEffect(() => {
    sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        sync();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [sync]);

  const starLabel = useMemo(() => formatReviewStarsFromTenths(ratingTenths), [ratingTenths]);

  if (!pending) {
    return null;
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    window.localStorage.removeItem(STORAGE_KEY);
    setPending(null);
    setComment("");
    // TODO: POST /v1/marketplace/reviews { purchaseId, ratingTenths, comment }
  };

  const handleDismiss = () => {
    /* Blocked until review exists — only dev escape */
    if (process.env.NODE_ENV === "development") {
      window.localStorage.removeItem(STORAGE_KEY);
      setPending(null);
    }
  };

  return (
    <div className="marketplace-review-overlay" role="dialog" aria-modal="true" aria-labelledby="marketplace-review-title">
      <div className="marketplace-review-modal">
        <h2 id="marketplace-review-title">Rate your purchase</h2>
        <p className="form-helper">
          You bought <strong>{pending.listingTitle}</strong>. A star rating is required (0.1 steps). Comments are optional
          and help sellers build trust.
        </p>
        <form className="marketplace-review-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Your rating: {starLabel} / 5</span>
            <input
              type="range"
              min={RESALE_REVIEW_RATING_MIN_TENTHS}
              max={RESALE_REVIEW_RATING_MAX_TENTHS}
              step={1}
              value={ratingTenths}
              onChange={(event) => setRatingTenths(Number(event.target.value))}
            />
          </label>
          <label className="form-field">
            <span>Comment (optional)</span>
            <textarea
              className="form-input form-textarea"
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Condition, communication, pickup experience…"
            />
          </label>
          <div className="marketplace-review-actions">
            <button type="submit" className="primary-button">
              Submit review
            </button>
            {process.env.NODE_ENV === "development" ? (
              <button type="button" className="secondary-button" onClick={handleDismiss}>
                Skip (dev only)
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
