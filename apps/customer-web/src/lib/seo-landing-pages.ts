import type { StoreSummary } from "@hull-eats/types";
import { deliveryFeeFromForStorefront } from "@hull-eats/types";

import {
  getMarketplaceCategory,
  marketplaceCategories,
  storeMatchesMarketplaceCategory,
  type MarketplaceCategory,
} from "./marketplace-categories";

export type SeoLandingPage = {
  slug: string;
  title: string;
  headline: string;
  description: string;
  intro: string;
  keywords: string[];
  /** Optional marketplace category slug to prioritise matching stores. */
  categorySlug?: string;
  /** Sort stores for this intent (default: alphabetical). */
  sort?: "alphabetical" | "cheapest" | "fastest";
  relatedCategorySlugs?: string[];
  relatedLandingSlugs?: string[];
};

export const seoLandingPages: SeoLandingPage[] = [
  {
    slug: "food-delivery",
    title: "Food delivery in Hull",
    headline: "Food delivery across Hull",
    description:
      "Order food delivery in Kingston upon Hull from local restaurants, takeaways, shops, and specialists. Hull Eats covers the city with clear delivery pricing.",
    intro:
      "From weekday dinners to weekend treats, Hull Eats brings together Hull's food scene in one place — takeaway, restaurant, grocery, and convenience delivery without hidden service charges.",
    keywords: ["food delivery Hull", "order food Hull", "Hull delivery food", "Kingston upon Hull food delivery"],
    relatedCategorySlugs: ["takeaways", "restaurants", "groceries"],
    relatedLandingSlugs: ["takeaway-delivery", "cheap-food-delivery", "luxury-food-hull"],
  },
  {
    slug: "takeaway-delivery",
    title: "Takeaway delivery in Hull",
    headline: "Hull takeaway delivery",
    description:
      "Order takeaway delivery in Hull — burgers, pizza, chicken, kebabs, curries, and late-night favourites from local kitchens.",
    intro:
      "Browse takeaway menus across Hull, customise your order, and track delivery. Hull Eats lists independent takeaways alongside household names across the city.",
    keywords: ["takeaway Hull", "takeaway delivery Hull", "order takeaway Hull", "best takeaway Hull"],
    categorySlug: "takeaways",
    relatedCategorySlugs: ["takeaways", "desserts"],
    relatedLandingSlugs: ["pizza-delivery-hull", "late-night-food-hull", "cheap-food-delivery"],
  },
  {
    slug: "cheap-food-delivery",
    title: "Cheap food delivery in Hull",
    headline: "Affordable food delivery in Hull",
    description:
      "Find cheap food delivery in Hull with low minimum orders and clear delivery fees. Compare local takeaways and shops on Hull Eats.",
    intro:
      "Looking for value? We surface businesses with competitive delivery fees and minimum spends so you can see the real cost before checkout — no surprise service charges on Hull Eats.",
    keywords: ["cheap food delivery Hull", "affordable takeaway Hull", "budget food Hull", "low delivery fee Hull"],
    sort: "cheapest",
    relatedLandingSlugs: ["food-delivery", "takeaway-delivery"],
    relatedCategorySlugs: ["takeaways", "convenience"],
  },
  {
    slug: "luxury-food-hull",
    title: "Luxury & premium food in Hull",
    headline: "Premium food & speciality delivery",
    description:
      "Discover luxury and premium food delivery in Hull — speciality shops, deli counters, quality restaurants, and treat boxes.",
    intro:
      "When you want something special, Hull Eats lists premium bakeries, speciality retailers, quality restaurants, and local makers delivering across Hull.",
    keywords: ["luxury food Hull", "premium delivery Hull", "speciality food Hull", "quality restaurants Hull"],
    categorySlug: "speciality",
    relatedCategorySlugs: ["speciality", "restaurants", "bakery"],
    relatedLandingSlugs: ["best-restaurants-hull", "food-delivery"],
  },
  {
    slug: "best-restaurants-hull",
    title: "Best restaurants in Hull — delivery & order online",
    headline: "Restaurant delivery in Hull",
    description:
      "Order from Hull restaurants online. Local kitchens, comfort food, lunch, dinner, and family meals delivered across the city.",
    intro:
      "Restaurant delivery in Hull is not only chains — Hull Eats highlights independent kitchens and sit-down favourites that deliver to your door.",
    keywords: ["restaurants Hull", "restaurant delivery Hull", "best restaurants Hull", "order restaurant Hull"],
    categorySlug: "restaurants",
    relatedCategorySlugs: ["restaurants"],
    relatedLandingSlugs: ["luxury-food-hull", "food-delivery"],
  },
  {
    slug: "pizza-delivery-hull",
    title: "Pizza delivery in Hull",
    headline: "Pizza delivery Hull",
    description:
      "Order pizza delivery in Hull from local takeaways and restaurants. Browse menus, deals, and sides on Hull Eats.",
    intro:
      "From classic margherita to loaded specials, find pizza delivery across Hull with live menus and clear delivery pricing.",
    keywords: ["pizza delivery Hull", "order pizza Hull", "pizza takeaway Hull", "pizza near me Hull"],
    categorySlug: "takeaways",
    relatedCategorySlugs: ["takeaways"],
    relatedLandingSlugs: ["takeaway-delivery", "late-night-food-hull"],
  },
  {
    slug: "grocery-delivery-hull",
    title: "Grocery delivery in Hull",
    headline: "Grocery & shop delivery Hull",
    description:
      "Grocery delivery in Hull — essentials, snacks, drinks, cupboard staples, and convenience from local shops.",
    intro:
      "Need milk, bread, or a full shop run? Hull Eats connects you with grocers, convenience stores, and local shops delivering across Hull.",
    keywords: ["grocery delivery Hull", "supermarket delivery Hull", "shop delivery Hull", "essentials Hull"],
    categorySlug: "groceries",
    relatedCategorySlugs: ["groceries", "convenience", "bakery"],
    relatedLandingSlugs: ["food-delivery"],
  },
  {
    slug: "late-night-food-hull",
    title: "Late night food delivery in Hull",
    headline: "Late night food in Hull",
    description:
      "Late night food delivery in Hull when kitchens are still open. Takeaways, desserts, and convenience from Hull Eats.",
    intro:
      "Hungry after hours? Browse businesses that are open now and order late-night takeaway or treats with live open/closed status on each store.",
    keywords: ["late night food Hull", "late night takeaway Hull", "food open late Hull", "midnight food Hull"],
    categorySlug: "takeaways",
    relatedLandingSlugs: ["takeaway-delivery", "pizza-delivery-hull"],
  },
  {
    slug: "order-food-online-hull",
    title: "Order food online in Hull",
    headline: "Order food online — Hull",
    description:
      "Order food online in Hull from 100+ local businesses. One checkout, clear delivery fees, and order tracking on Hull Eats.",
    intro:
      "Skip the phone queue. Order food online from Hull takeaways, restaurants, and shops with menus that match what businesses configure in their hub.",
    keywords: ["order food online Hull", "online takeaway Hull", "food ordering Hull", "Hull Eats order"],
    relatedLandingSlugs: ["food-delivery", "takeaway-delivery"],
  },
  {
    slug: "quality-food-hull",
    title: "Quality food delivery in Hull",
    headline: "Quality local food in Hull",
    description:
      "Quality food delivery in Hull from trusted local businesses — fresh ingredients, independent kitchens, and speciality retailers.",
    intro:
      "Hull has serious food talent. Hull Eats helps you find quality takeaways, restaurants, butchers, bakeries, and speciality shops with transparent reviews and live menus.",
    keywords: ["quality food Hull", "best food Hull", "local food Hull", "independent restaurants Hull"],
    relatedCategorySlugs: ["restaurants", "speciality", "butcher", "bakery"],
    relatedLandingSlugs: ["luxury-food-hull", "best-restaurants-hull"],
  },
];

export function getSeoLandingPage(slug: string): SeoLandingPage | undefined {
  return seoLandingPages.find((page) => page.slug === slug);
}

function getSearchableStoreText(store: StoreSummary): string {
  return [store.name, store.type, store.city, store.cuisineLabel, store.onboardingMessage]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function deliveryScore(store: StoreSummary): number {
  const fee = deliveryFeeFromForStorefront({
    legacyDeliveryFee: store.deliveryFee,
    pricing: store.deliveryPricing,
  });
  const minimum = store.minimumOrderAmount ?? 0;
  return fee * 10 + minimum;
}

export function filterStoresForLandingPage(stores: StoreSummary[], page: SeoLandingPage): StoreSummary[] {
  let filtered = stores;

  if (page.categorySlug) {
    const category = getMarketplaceCategory(page.categorySlug);
    if (category) {
      filtered = filtered.filter((store) =>
        storeMatchesMarketplaceCategory(store, category, getSearchableStoreText(store)),
      );
    }
  }

  if (page.slug === "pizza-delivery-hull") {
    filtered = filtered.filter((store) => getSearchableStoreText(store).includes("pizza"));
  }

  if (page.slug === "late-night-food-hull") {
    filtered = filtered.filter((store) => store.isOpen);
  }

  const sorted = [...filtered].sort((first, second) => {
    if (page.sort === "cheapest") {
      return deliveryScore(first) - deliveryScore(second);
    }

    if (page.sort === "fastest") {
      return (first.etaMinutes ?? 999) - (second.etaMinutes ?? 999);
    }

    return first.name.localeCompare(second.name, "en-GB");
  });

  return sorted.length > 0 ? sorted : [...stores].sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
}

export function relatedCategoriesForLanding(page: SeoLandingPage): MarketplaceCategory[] {
  const slugs = page.relatedCategorySlugs ?? [];
  return slugs
    .map((slug) => getMarketplaceCategory(slug))
    .filter((category): category is MarketplaceCategory => Boolean(category));
}

export function relatedLandingPagesFor(page: SeoLandingPage): SeoLandingPage[] {
  return (page.relatedLandingSlugs ?? [])
    .map((slug) => getSeoLandingPage(slug))
    .filter((entry): entry is SeoLandingPage => Boolean(entry));
}

export const seoLandingHubLinks = [
  { href: "/hull/food-delivery", label: "Food delivery Hull" },
  { href: "/hull/takeaway-delivery", label: "Takeaway delivery" },
  { href: "/hull/cheap-food-delivery", label: "Cheap food delivery" },
  { href: "/hull/luxury-food-hull", label: "Luxury & premium food" },
  { href: "/hull/best-restaurants-hull", label: "Restaurant delivery" },
  { href: "/hull/pizza-delivery-hull", label: "Pizza delivery" },
  { href: "/hull/grocery-delivery-hull", label: "Grocery delivery" },
  { href: "/hull/late-night-food-hull", label: "Late night food" },
  { href: "/hull/quality-food-hull", label: "Quality local food" },
  { href: "/hull/order-food-online-hull", label: "Order food online" },
] as const;

export const marketplaceCategoryLinks = marketplaceCategories.map((category) => ({
  href: `/categories/${category.slug}`,
  label: category.label,
}));
