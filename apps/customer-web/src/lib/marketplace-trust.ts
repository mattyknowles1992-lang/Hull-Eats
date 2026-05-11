import {
  RESALE_REVIEW_RATING_MAX_TENTHS,
  RESALE_REVIEW_RATING_MIN_TENTHS,
  SELLER_TRUST_VERIFIED_MIN_RATED_SALES,
  SELLER_TRUST_VERIFIED_MIN_RATING_TENTHS,
} from "@hull-eats/types";

export {
  RESALE_REVIEW_RATING_MAX_TENTHS,
  RESALE_REVIEW_RATING_MIN_TENTHS,
  SELLER_TRUST_VERIFIED_MIN_RATED_SALES,
  SELLER_TRUST_VERIFIED_MIN_RATING_TENTHS,
};

/** Buyer review scores are stored in tenths (10 = 1.0 … 50 = 5.0), step 0.1. */
export function formatReviewStarsFromTenths(tenths: number): string {
  return (tenths / 10).toFixed(1);
}

export function tenthsToStarLabel(tenths: number): string {
  return `${formatReviewStarsFromTenths(tenths)} / 5`;
}
