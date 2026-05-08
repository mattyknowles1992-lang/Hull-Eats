export type ServiceCategory = {
  slug: string;
  label: string;
  description: string;
  imageUrl: string;
  keywords: string[];
};

export type ServiceBusiness = {
  id: string;
  slug: string;
  businessName: string;
  categorySlug: string;
  description: string;
  coverageArea: string;
  rating: number;
  reviewCount: number;
  priceFrom: number;
  imageUrl: string;
  availability: string;
};

const createServiceCategory = (
  label: string,
  description: string,
  imageUrl: string,
  keywords: string[],
): ServiceCategory => ({
  slug: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  label,
  description,
  imageUrl,
  keywords,
});

export const serviceCategories: ServiceCategory[] = [
  createServiceCategory(
    "Gardening",
    "Garden maintenance, hedge trimming, lawn care, and outdoor tidy-ups.",
    "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80",
    ["garden", "gardening", "lawn", "hedge", "outdoor"],
  ),
  createServiceCategory(
    "Plumbing",
    "Local plumbing businesses offering repairs, installs, and call-outs.",
    "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=800&q=80",
    ["plumber", "plumbing", "tap", "pipe", "bathroom"],
  ),
  createServiceCategory(
    "Joinery",
    "Joinery, woodwork, fitted storage, repairs, and home improvements.",
    "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80",
    ["joinery", "joiner", "wood", "carpentry"],
  ),
  createServiceCategory(
    "Car Detailing",
    "Mobile and local vehicle cleaning, detailing, valeting, and finish work.",
    "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80",
    ["car", "detailing", "valet", "clean"],
  ),
  createServiceCategory(
    "Cleaning",
    "Home cleaning, deep cleans, end-of-tenancy cleans, and regular visits.",
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80",
    ["cleaning", "cleaner", "deep clean", "home"],
  ),
  createServiceCategory(
    "Home Barbers",
    "Local barbers offering home appointments and mobile grooming services.",
    "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&q=80",
    ["barber", "haircut", "grooming", "home barber"],
  ),
  createServiceCategory(
    "Handyman",
    "Repairs, flat-pack builds, small fixes, and general practical jobs.",
    "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=800&q=80",
    ["handyman", "repair", "flat pack", "maintenance"],
  ),
  createServiceCategory(
    "Electrical",
    "Electrical businesses offering installs, checks, repairs, and fittings.",
    "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80",
    ["electrician", "electrical", "lighting", "socket"],
  ),
  createServiceCategory(
    "Painting",
    "Painters and decorators for rooms, touch-ups, and full property refreshes.",
    "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=800&q=80",
    ["painting", "decorating", "painter", "decorator"],
  ),
  createServiceCategory(
    "Moving Help",
    "Local moving help, bulky item moves, clear-outs, and transport support.",
    "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=800&q=80",
    ["moving", "removal", "van", "clearance"],
  ),
];

export const serviceBusinesses: ServiceBusiness[] = [
  {
    id: "svc-garden-1",
    slug: "hull-garden-care",
    businessName: "Hull Garden Care",
    categorySlug: "gardening",
    description: "Garden maintenance, hedge trimming, and seasonal tidy-ups across Hull.",
    coverageArea: "Hull and surrounding areas",
    rating: 4.8,
    reviewCount: 42,
    priceFrom: 25,
    imageUrl: "https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=900&q=80",
    availability: "Taking enquiries",
  },
  {
    id: "svc-plumb-1",
    slug: "humber-plumbing-services",
    businessName: "Humber Plumbing Services",
    categorySlug: "plumbing",
    description: "Local plumbing enquiries for taps, leaks, bathroom fixes, and small installs.",
    coverageArea: "Hull, Hessle, Cottingham",
    rating: 4.7,
    reviewCount: 35,
    priceFrom: 45,
    imageUrl: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=900&q=80",
    availability: "Request availability",
  },
  {
    id: "svc-detail-1",
    slug: "east-hull-detailing",
    businessName: "East Hull Detailing",
    categorySlug: "car-detailing",
    description: "Mobile car wash, interior valets, and detailing packages.",
    coverageArea: "Hull and East Yorkshire",
    rating: 4.9,
    reviewCount: 28,
    priceFrom: 30,
    imageUrl: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=900&q=80",
    availability: "Mobile appointments",
  },
  {
    id: "svc-clean-1",
    slug: "sparkle-hull-cleaning",
    businessName: "Sparkle Hull Cleaning",
    categorySlug: "cleaning",
    description: "Regular home cleans, deep cleans, and move-out cleaning enquiries.",
    coverageArea: "Hull citywide",
    rating: 4.6,
    reviewCount: 31,
    priceFrom: 20,
    imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80",
    availability: "Taking enquiries",
  },
];

export function getServiceCategory(slug: string) {
  return serviceCategories.find((category) => category.slug === slug);
}
