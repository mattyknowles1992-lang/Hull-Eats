/** Hull Marketplace (local resale) — contracts for API + apps. */

export const RESALE_LISTING_STATUSES = ["AVAILABLE", "RESERVED", "SOLD", "ARCHIVED"] as const;
export type ResaleListingStatus = (typeof RESALE_LISTING_STATUSES)[number];

export const RESALE_OFFER_STATUSES = ["PENDING", "ACCEPTED", "DECLINED", "WITHDRAWN"] as const;
export type ResaleOfferStatus = (typeof RESALE_OFFER_STATUSES)[number];

export const RESALE_PURCHASE_STATUSES = ["PENDING_PAYMENT", "PAID", "CANCELLED", "NOT_SOLD"] as const;
export type ResalePurchaseStatus = (typeof RESALE_PURCHASE_STATUSES)[number];

export const RESALE_MESSAGE_KINDS = ["TEXT", "SYSTEM"] as const;
export type ResaleMessageKind = (typeof RESALE_MESSAGE_KINDS)[number];

export const RESALE_DELIVERY_MODES = ["COLLECTION", "SMALL_DELIVERY", "VAN_REQUIRED"] as const;
export type ResaleDeliveryMode = (typeof RESALE_DELIVERY_MODES)[number];

/** Buyer review: 10 = 1.0 stars … 50 = 5.0 stars, step 1 (= 0.1 star). */
export const RESALE_REVIEW_RATING_MIN_TENTHS = 10;
export const RESALE_REVIEW_RATING_MAX_TENTHS = 50;

/** Seller “trust verified” badge: at least this many completed rated sales at min stars (see product rules). */
export const SELLER_TRUST_VERIFIED_MIN_RATED_SALES = 3;
export const SELLER_TRUST_VERIFIED_MIN_RATING_TENTHS = 50;

export const RESALE_RESOLUTION_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export type ResaleResolutionStatus = (typeof RESALE_RESOLUTION_STATUSES)[number];

export const RESALE_RESOLUTION_CATEGORIES = [
  "ITEM_NOT_AS_DESCRIBED",
  "PAYMENT_OR_PICKUP",
  "HARASSMENT_OR_SAFETY",
  "OTHER",
] as const;
export type ResaleResolutionCategory = (typeof RESALE_RESOLUTION_CATEGORIES)[number];
