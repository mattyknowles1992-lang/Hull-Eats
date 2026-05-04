export type HubStatus = "live" | "setup" | "paused";
export type BusinessType = "restaurant" | "takeaway" | "shop";
export type CourierStatus = "active" | "offline" | "break";
export type PlatformRole = "platform_admin" | "platform_staff" | "business_owner" | "business_manager";

export type ActiveOrder = {
  id: string;
  customerName: string;
  status: string;
  total: string;
  placedAgo: string;
};

export type HubRecord = {
  id: string;
  businessName: string;
  slug: string;
  type: BusinessType;
  hubUsername: string;
  deliveryLeadTime: string;
  status: HubStatus;
  ownerName: string;
  orderVolumeToday: number;
  orderVolumeWeek: number;
  grossSalesWeek: string;
  averageOrderValue: string;
  activeOrders: ActiveOrder[];
  notes: string[];
};

export type PlatformUserRecord = {
  id: string;
  fullName: string;
  email: string;
  role: PlatformRole;
  hub: string;
  loginType: "platform" | "hub";
};

export type CourierRecord = {
  id: string;
  fullName: string;
  phone: string;
  rating: number;
  completedDeliveries: number;
  activeOrderId?: string;
  status: CourierStatus;
  zone: string;
};

export const initialHubs: HubRecord[] = [
  {
    id: "hub_loaded_munch",
    businessName: "Loaded Munch",
    slug: "loaded-munch-hull",
    type: "takeaway",
    hubUsername: "loaded-munch-admin",
    deliveryLeadTime: "25 min",
    status: "live",
    ownerName: "Loaded Munch Owner",
    orderVolumeToday: 27,
    orderVolumeWeek: 186,
    grossSalesWeek: "£3,244",
    averageOrderValue: "£17.44",
    activeOrders: [
      { id: "HE-2033", customerName: "Tia L", status: "preparing", total: "£24.98", placedAgo: "3 min ago" },
      { id: "HE-2034", customerName: "Ben R", status: "assigned", total: "£31.47", placedAgo: "6 min ago" },
      { id: "HE-2035", customerName: "Ava J", status: "pending", total: "£18.76", placedAgo: "1 min ago" },
    ],
    notes: [
      "Launch partner hub for Hull Eats rollout and live testing.",
      "Menu is seeded from current takeaway data but long-term edits still belong in the merchant hub only.",
    ],
  },
];

export const initialUsers: PlatformUserRecord[] = [
  {
    id: "user_admin_1",
    fullName: "Matty Knowles",
    email: "admin@hulleats.local",
    role: "platform_admin",
    hub: "Hull Eats HQ",
    loginType: "platform",
  },
  {
    id: "user_hub_loaded_munch",
    fullName: "Loaded Munch Owner",
    email: "owner@loadedmunch.local",
    role: "business_owner",
    hub: "Loaded Munch",
    loginType: "hub",
  },
];

export const initialCouriers: CourierRecord[] = [
  {
    id: "courier_1",
    fullName: "Liam Foster",
    phone: "07400 555111",
    rating: 4.9,
    completedDeliveries: 482,
    activeOrderId: "HE-2034",
    status: "active",
    zone: "Hull Central",
  },
  {
    id: "courier_2",
    fullName: "Sana Rahman",
    phone: "07400 555222",
    rating: 4.8,
    completedDeliveries: 361,
    status: "break",
    zone: "West Hull",
  },
  {
    id: "courier_3",
    fullName: "Tom Bentley",
    phone: "07400 555333",
    rating: 4.7,
    completedDeliveries: 289,
    status: "offline",
    zone: "East Hull",
  },
];
