export type MarketplaceDeliveryMode = "collection" | "small_delivery" | "van_required";

export type MarketplaceItemCategory = {
  slug: string;
  label: string;
  imageUrl: string;
  keywords: string[];
};

export type MarketplaceListing = {
  id: string;
  title: string;
  categorySlug: string;
  price: number;
  location: string;
  condition: string;
  deliveryMode: MarketplaceDeliveryMode;
  imageUrl: string;
  sellerLabel: string;
  listedAtLabel: string;
  description: string;
};

export const marketplaceItemCategories: MarketplaceItemCategory[] = [
  {
    slug: "home-furniture",
    label: "Home & furniture",
    imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=82",
    keywords: ["sofa", "table", "chairs", "bed", "wardrobe", "home"],
  },
  {
    slug: "appliances",
    label: "Appliances",
    imageUrl: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=82",
    keywords: ["fridge", "freezer", "washer", "dryer", "appliance"],
  },
  {
    slug: "baby-kids",
    label: "Baby & kids",
    imageUrl: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=82",
    keywords: ["pram", "toys", "kids", "baby", "cot"],
  },
  {
    slug: "fashion",
    label: "Fashion",
    imageUrl: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=900&q=82",
    keywords: ["clothes", "shoes", "coats", "bags", "vinted"],
  },
  {
    slug: "tech",
    label: "Tech",
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=82",
    keywords: ["phone", "laptop", "tablet", "console", "tech"],
  },
  {
    slug: "garden-diy",
    label: "Garden & DIY",
    imageUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=82",
    keywords: ["tools", "garden", "diy", "shed", "outdoor"],
  },
];

export const marketplaceListings: MarketplaceListing[] = [
  {
    id: "listing-sofa-01",
    title: "Grey corner sofa",
    categorySlug: "home-furniture",
    price: 180,
    location: "Kingswood, Hull",
    condition: "Good condition",
    deliveryMode: "van_required",
    imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=82",
    sellerLabel: "Hull Eats+ member",
    listedAtLabel: "Listed today",
    description: "Large corner sofa ready for a local buyer. Van collection or arranged van delivery required.",
  },
  {
    id: "listing-fridge-01",
    title: "Tall fridge freezer",
    categorySlug: "appliances",
    price: 95,
    location: "Newland Avenue",
    condition: "Working, used",
    deliveryMode: "van_required",
    imageUrl: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=1200&q=82",
    sellerLabel: "Hull Eats+ member",
    listedAtLabel: "Listed yesterday",
    description: "Clean fridge freezer. Buyer can collect, or request van help when that option goes live.",
  },
  {
    id: "listing-pram-01",
    title: "Travel pram bundle",
    categorySlug: "baby-kids",
    price: 70,
    location: "Holderness Road",
    condition: "Very good",
    deliveryMode: "collection",
    imageUrl: "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?auto=format&fit=crop&w=1200&q=82",
    sellerLabel: "Hull Eats+ member",
    listedAtLabel: "Listed 2 days ago",
    description: "Compact pram with rain cover. Collection only from East Hull.",
  },
  {
    id: "listing-console-01",
    title: "Games console bundle",
    categorySlug: "tech",
    price: 140,
    location: "Anlaby Road",
    condition: "Used",
    deliveryMode: "small_delivery",
    imageUrl: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=1200&q=82",
    sellerLabel: "Hull Eats+ member",
    listedAtLabel: "Listed this week",
    description: "Console, two controllers, and games. Local collection or small-item delivery option.",
  },
];

export const getDeliveryModeLabel = (mode: MarketplaceDeliveryMode) => {
  if (mode === "van_required") {
    return "Van delivery option";
  }

  if (mode === "small_delivery") {
    return "Local delivery option";
  }

  return "Collection only";
};
