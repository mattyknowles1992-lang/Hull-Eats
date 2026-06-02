import type { MenuItem, StoreSummary } from "@hull-eats/types";

import type { MarketplaceMenuCategory } from "./marketplace";
import type { SeoLandingPage } from "./seo-landing-pages";
import { absoluteUrl, getSiteOrigin } from "./site-url";
import { siteConfig } from "./seo";

const MAX_MENU_ITEMS_IN_SCHEMA = 40;

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${getSiteOrigin()}/#organization`,
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    url: getSiteOrigin(),
    logo: absoluteUrl("/brand/hull-eats-logo.png"),
    email: siteConfig.contactEmail,
    areaServed: {
      "@type": "City",
      name: siteConfig.region,
      containedInPlace: {
        "@type": "Country",
        name: siteConfig.country,
      },
    },
    description: siteConfig.defaultDescription,
  };
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${getSiteOrigin()}/#website`,
    name: siteConfig.name,
    url: getSiteOrigin(),
    description: siteConfig.defaultDescription,
    inLanguage: siteConfig.languageTag,
    publisher: { "@id": `${getSiteOrigin()}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${getSiteOrigin()}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildBreadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildItemListJsonLd(input: {
  name: string;
  description: string;
  path: string;
  items: { name: string; url: string; description?: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    numberOfItems: input.items.length,
    itemListElement: input.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url,
      description: item.description,
    })),
  };
}

function buildMenuItemOffer(storeSlug: string, item: MenuItem) {
  return {
    "@type": "Offer",
    price: item.price.toFixed(2),
    priceCurrency: "GBP",
    availability: item.isActive && item.stockStatus !== "out_of_stock"
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    url: absoluteUrl(`/stores/${storeSlug}`),
  };
}

export function buildStoreMenuJsonLd(
  store: StoreSummary,
  categories: MarketplaceMenuCategory[],
  items: MenuItem[],
) {
  if (items.length === 0) {
    return null;
  }

  const activeItems = items.filter((item) => item.isActive).slice(0, MAX_MENU_ITEMS_IN_SCHEMA);
  const itemsByCategory = new Map<string, MenuItem[]>();

  for (const item of activeItems) {
    const list = itemsByCategory.get(item.categoryId) ?? [];
    list.push(item);
    itemsByCategory.set(item.categoryId, list);
  }

  const hasMenuSection = categories
    .filter((category) => (itemsByCategory.get(category.id)?.length ?? 0) > 0)
    .map((category) => ({
      "@type": "MenuSection",
      name: category.name,
      description: category.description,
      hasMenuItem: (itemsByCategory.get(category.id) ?? []).map((item) => ({
        "@type": "MenuItem",
        name: item.name,
        description: item.description || undefined,
        image: item.imageUrl,
        offers: buildMenuItemOffer(store.slug, item),
      })),
    }));

  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${absoluteUrl(`/stores/${store.slug}`)}#menu`,
    name: `${store.name} menu`,
    inLanguage: siteConfig.languageTag,
    hasMenuSection,
  };
}

export function buildStoreRestaurantJsonLd(store: StoreSummary, menuItemCount?: number) {
  const addressParts = [store.addressLine1, store.addressLine2, store.city, store.postcode].filter(Boolean);
  const storeUrl = absoluteUrl(`/stores/${store.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": ["Restaurant", "FoodEstablishment"],
    "@id": storeUrl,
    name: store.name,
    url: storeUrl,
    image: store.heroImageUrl ?? store.logoImageUrl ?? absoluteUrl("/brand/hull-eats-logo.png"),
    servesCuisine: store.cuisineLabel,
    priceRange: "£",
    address: {
      "@type": "PostalAddress",
      streetAddress: [store.addressLine1, store.addressLine2].filter(Boolean).join(", ") || undefined,
      addressLocality: store.city || siteConfig.regionShort,
      postalCode: store.postcode,
      addressCountry: "GB",
    },
    description: store.onboardingMessage ?? siteConfig.defaultDescription,
    ...(menuItemCount && menuItemCount > 0
      ? {
          hasMenu: {
            "@id": `${storeUrl}#menu`,
          },
        }
      : {}),
    ...(addressParts.length > 0
      ? {
          geo: {
            "@type": "GeoCoordinates",
            addressCountry: "GB",
            addressLocality: store.city || siteConfig.regionShort,
          },
          location: {
            "@type": "Place",
            name: store.name,
            address: addressParts.join(", "),
          },
        }
      : {}),
    potentialAction: {
      "@type": "OrderAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: storeUrl,
        inLanguage: siteConfig.languageTag,
      },
      deliveryMethod: "http://purl.org/goodrelations/v1#DeliveryModeOwnFleet",
    },
  };
}

export function buildStorePageJsonLd(
  store: StoreSummary,
  categories: MarketplaceMenuCategory[],
  items: MenuItem[],
) {
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Hull Eats", path: "/" },
    { name: store.name, path: `/stores/${store.slug}` },
  ]);
  const restaurant = buildStoreRestaurantJsonLd(store, items.length);
  const menu = buildStoreMenuJsonLd(store, categories, items);

  const graph = [breadcrumb, restaurant, ...(menu ? [menu] : [])];

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export function buildLandingPageJsonLd(page: SeoLandingPage, stores: StoreSummary[]) {
  const pageUrl = absoluteUrl(`/hull/${page.slug}`);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": pageUrl,
        name: page.title,
        description: page.description,
        url: pageUrl,
        inLanguage: siteConfig.languageTag,
        isPartOf: { "@id": `${getSiteOrigin()}/#website` },
        about: {
          "@type": "Thing",
          name: `Food delivery in ${siteConfig.regionShort}`,
        },
        primaryImageOfPage: absoluteUrl("/opengraph-image"),
      },
      buildItemListJsonLd({
        name: page.headline,
        description: page.description,
        path: `/hull/${page.slug}`,
        items: stores.slice(0, 50).map((store) => ({
          name: store.name,
          url: absoluteUrl(`/stores/${store.slug}`),
          description: store.cuisineLabel,
        })),
      }),
    ],
  };
}

export function buildCategoryPageJsonLd(input: {
  categoryName: string;
  categoryDescription: string;
  path: string;
  stores: StoreSummary[];
}) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: input.categoryName,
        description: input.categoryDescription,
        url: absoluteUrl(input.path),
        inLanguage: siteConfig.languageTag,
        isPartOf: { "@id": `${getSiteOrigin()}/#website` },
      },
      buildBreadcrumbJsonLd([
        { name: "Hull Eats", path: "/" },
        { name: input.categoryName, path: input.path },
      ]),
      buildItemListJsonLd({
        name: `${input.categoryName} in ${siteConfig.regionShort}`,
        description: input.categoryDescription,
        path: input.path,
        items: input.stores.map((store) => ({
          name: store.name,
          url: absoluteUrl(`/stores/${store.slug}`),
          description: store.cuisineLabel,
        })),
      }),
    ],
  };
}

export function buildHomepageBusinessIndexJsonLd(stores: StoreSummary[]) {
  return buildItemListJsonLd({
    name: `Food businesses delivering in ${siteConfig.regionShort}`,
    description: siteConfig.defaultDescription,
    path: "/",
    items: stores.map((store) => ({
      name: store.name,
      url: absoluteUrl(`/stores/${store.slug}`),
      description: store.cuisineLabel,
    })),
  });
}
