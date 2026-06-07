import { z } from "zod";

/** Matches customer `.store-card-media` (~430×250 mobile cards). */
export const STOREFRONT_HERO_CARD_ASPECT = 17 / 10;

export const storefrontHeroCropSchema = z.object({
  /** Horizontal focal point for background-position (0–100). */
  focusX: z.number().min(0).max(100).default(50),
  /** Vertical focal point for background-position (0–100). */
  focusY: z.number().min(0).max(100).default(50),
  /** Zoom multiplier: 1 = cover baseline, lower shows more of the image, higher crops tighter. */
  zoom: z.number().min(0.5).max(3).default(1),
});

export type StorefrontHeroCrop = z.infer<typeof storefrontHeroCropSchema>;

/** Max uploaded storefront hero payload (~440KB base64) — keeps PATCH bodies under API limits. */
export const MAX_STOREFRONT_HERO_DATA_URL_CHARS = 600_000;

export const hubStorefrontImageUrlSchema = z.preprocess((value) => {
  if (value == null) {
    return "";
  }
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }
  try {
    // eslint-disable-next-line no-new
    new URL(trimmed);
    return trimmed;
  } catch {
    return "";
  }
}, z.string().max(MAX_STOREFRONT_HERO_DATA_URL_CHARS, "Storefront image is too large. Use a smaller photo.")).default("");

export const defaultStorefrontHeroCrop = (): StorefrontHeroCrop =>
  storefrontHeroCropSchema.parse({});

export function normalizeStorefrontHeroCrop(raw: unknown): StorefrontHeroCrop {
  const parsed = storefrontHeroCropSchema.safeParse(raw);
  return parsed.success ? parsed.data : defaultStorefrontHeroCrop();
}

export function readStorefrontHeroCropFromDeliveryConfig(deliveryConfig: unknown): StorefrontHeroCrop {
  if (!deliveryConfig || typeof deliveryConfig !== "object") {
    return defaultStorefrontHeroCrop();
  }
  return normalizeStorefrontHeroCrop((deliveryConfig as { heroImageCrop?: unknown }).heroImageCrop);
}

export const STOREFRONT_HERO_CARD_GRADIENT =
  "linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0) 42%, rgba(8, 14, 24, 0.28))";

export function storefrontHeroBackgroundSize(crop?: StorefrontHeroCrop | null): string {
  const zoom = Math.max(0.5, Math.min(3, crop?.zoom ?? 1));
  if (zoom < 1) {
    return "contain";
  }
  if (zoom === 1) {
    return "cover";
  }
  return `${(zoom * 100).toFixed(2)}% auto`;
}

export function storefrontHeroBackgroundPosition(crop?: StorefrontHeroCrop | null): string {
  const focusX = crop?.focusX ?? 50;
  const focusY = crop?.focusY ?? 50;
  return `${focusX.toFixed(2)}% ${focusY.toFixed(2)}%`;
}

export type StorefrontHeroMediaStyle = {
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  backgroundRepeat: "no-repeat";
};

export function storefrontHeroMediaStyle(
  heroImageUrl?: string | null,
  crop?: StorefrontHeroCrop | null,
  gradient: string = STOREFRONT_HERO_CARD_GRADIENT,
): StorefrontHeroMediaStyle | undefined {
  const url = heroImageUrl?.trim();
  if (!url) {
    return undefined;
  }
  return {
    backgroundImage: `${gradient}, url(${url})`,
    backgroundSize: storefrontHeroBackgroundSize(crop),
    backgroundPosition: storefrontHeroBackgroundPosition(crop),
    backgroundRepeat: "no-repeat",
  };
}
