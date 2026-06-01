import type { Metadata } from "next";

import type { StoreSummary } from "@hull-eats/types";

import { getMarketplaceCategory, type MarketplaceCategory } from "./marketplace-categories";
import { absoluteUrl, getSiteOrigin } from "./site-url";

export const siteConfig = {
  name: "Hull Eats",
  legalName: "Hull Eats",
  locale: "en_GB",
  region: "Kingston upon Hull",
  regionShort: "Hull",
  defaultTitle: "Hull Eats — Food delivery & takeaway in Hull",
  defaultDescription:
    "Order food delivery in Hull from 100+ local restaurants, takeaways, shops, and specialists. Cheap bites to luxury treats — pizza, kebabs, groceries, bakery, alcohol, and more with clear delivery pricing.",
  keywords: [
    "food delivery Hull",
    "takeaway Hull",
    "order food Hull",
    "Hull takeaway delivery",
    "restaurant delivery Hull",
    "cheap food delivery Hull",
    "grocery delivery Hull",
    "pizza delivery Hull",
    "late night food Hull",
    "Kingston upon Hull food",
    "Hull Eats",
    "local food Hull",
    "best takeaway Hull",
    "food near me Hull",
  ],
  twitterHandle: "@HullEats",
} as const;

const defaultOgImagePath = "/icons/icon-512.png";

export function getDefaultOgImageUrl(): string {
  return absoluteUrl(defaultOgImagePath);
}

function buildOpenGraph(input: {
  title: string;
  description: string;
  path: string;
  imageUrl?: string;
  type?: "website" | "article";
}): Metadata["openGraph"] {
  const url = absoluteUrl(input.path);
  const image = input.imageUrl ?? getDefaultOgImageUrl();

  return {
    type: input.type ?? "website",
    locale: siteConfig.locale,
    url,
    siteName: siteConfig.name,
    title: input.title,
    description: input.description,
    images: [
      {
        url: image,
        width: 512,
        height: 512,
        alt: `${siteConfig.name} — ${siteConfig.regionShort} food delivery`,
      },
    ],
  };
}

function buildTwitter(input: { title: string; description: string; imageUrl?: string }): Metadata["twitter"] {
  return {
    card: "summary_large_image",
    title: input.title,
    description: input.description,
    images: input.imageUrl ? [input.imageUrl] : [getDefaultOgImageUrl()],
  };
}

function baseMetadata(partial: Metadata): Metadata {
  return {
    metadataBase: new URL(getSiteOrigin()),
    authors: [{ name: siteConfig.name, url: getSiteOrigin() }],
    creator: siteConfig.name,
    publisher: siteConfig.name,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    ...partial,
  };
}

export function buildRootMetadata(): Metadata {
  const title = siteConfig.defaultTitle;
  const description = siteConfig.defaultDescription;

  return baseMetadata({
    title: {
      default: siteConfig.defaultTitle,
      template: `%s | ${siteConfig.name}`,
    },
    description,
    keywords: [...siteConfig.keywords],
    alternates: {
      canonical: "/",
    },
    openGraph: buildOpenGraph({ title, description, path: "/" }),
    twitter: buildTwitter({ title, description }),
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    category: "food",
  });
}

export function buildHomeMetadata(): Metadata {
  const title = "Food delivery in Hull — takeaways, restaurants & local shops";
  const description =
    "Browse 100+ Hull businesses on Hull Eats. Order takeaway, restaurant meals, groceries, bakery, butcher, alcohol, desserts, and convenience delivery across Kingston upon Hull with transparent fees.";

  return baseMetadata({
    title,
    description,
    keywords: [
      ...siteConfig.keywords,
      "Hull food marketplace",
      "order takeaway online Hull",
      "Hull restaurant delivery",
    ],
    alternates: { canonical: "/" },
    openGraph: buildOpenGraph({ title, description, path: "/" }),
    twitter: buildTwitter({ title, description }),
  });
}

export function buildStoreMetadata(store: StoreSummary): Metadata {
  const cuisine = store.cuisineLabel?.trim();
  const title = cuisine
    ? `${store.name} — ${cuisine} delivery in Hull`
    : `${store.name} — order delivery in Hull`;
  const description = [
    `Order from ${store.name} in ${siteConfig.regionShort}.`,
    cuisine ? `${cuisine} available for delivery and collection.` : null,
    store.onboardingMessage?.trim() || null,
    store.menuSetupComplete
      ? "Browse the live menu, customise your order, and checkout on Hull Eats."
      : "View store details on Hull Eats — menu publishing in progress.",
  ]
    .filter(Boolean)
    .join(" ");

  const path = `/stores/${store.slug}`;

  return baseMetadata({
    title,
    description,
    keywords: [
      store.name,
      `${store.name} Hull`,
      `${store.name} delivery`,
      cuisine ?? "",
      store.type,
      "food delivery Hull",
      store.postcode,
    ].filter(Boolean),
    alternates: { canonical: path },
    openGraph: buildOpenGraph({
      title,
      description,
      path,
      imageUrl: store.heroImageUrl ?? store.logoImageUrl,
    }),
    twitter: buildTwitter({
      title,
      description,
      imageUrl: store.heroImageUrl ?? store.logoImageUrl,
    }),
  });
}

export function buildCategoryMetadata(category: MarketplaceCategory, storeCount: number): Metadata {
  const title = `${category.label} delivery in Hull — order online`;
  const description = `${category.description} Discover ${storeCount > 0 ? `${storeCount}+ ` : ""}${category.label.toLowerCase()} businesses delivering across ${siteConfig.regionShort} on Hull Eats.`;
  const path = `/categories/${category.slug}`;

  return baseMetadata({
    title,
    description,
    keywords: [
      `${category.label} Hull`,
      `${category.label} delivery Hull`,
      ...category.keywords,
      "Hull Eats",
      "food delivery Hull",
    ],
    alternates: { canonical: path },
    openGraph: buildOpenGraph({
      title,
      description,
      path,
      imageUrl: category.heroImages[0] ?? category.imageUrl,
    }),
    twitter: buildTwitter({
      title,
      description,
      imageUrl: category.heroImages[0] ?? category.imageUrl,
    }),
  });
}

export function buildSeoLandingMetadata(input: {
  title: string;
  description: string;
  path: string;
  keywords: string[];
  imageUrl?: string;
}): Metadata {
  return baseMetadata({
    title: input.title,
    description: input.description,
    keywords: input.keywords,
    alternates: { canonical: input.path },
    openGraph: buildOpenGraph({
      title: input.title,
      description: input.description,
      path: input.path,
      imageUrl: input.imageUrl,
    }),
    twitter: buildTwitter({
      title: input.title,
      description: input.description,
      imageUrl: input.imageUrl,
    }),
  });
}

export function buildNoIndexMetadata(title: string): Metadata {
  return baseMetadata({
    title,
    robots: { index: false, follow: false },
  });
}

export function getCategoryForMetadata(slug: string) {
  return getMarketplaceCategory(slug);
}
