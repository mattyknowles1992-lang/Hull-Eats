import {
  CustomerAddressType,
  DeliveryStatus,
  DriverStatus,
  FulfillmentType,
  InventoryAdjustmentReason,
  MembershipRole,
  OrderSource,
  OrderStatus,
  PaymentMethodType,
  PaymentProvider,
  PaymentRecordStatus,
  PaymentStatus,
  PrintJobStatus,
  PrinterAdapterType,
  Prisma,
  StockStatus,
  StoreType,
  UserRole,
} from "@prisma/client";

import { prisma } from "../src/client";

const money = (value: number): Prisma.Decimal => new Prisma.Decimal(value.toFixed(2));

async function main(): Promise<void> {
  const admin = await prisma.user.upsert({
    where: { email: "admin@hulleats.local" },
    update: {},
    create: {
      email: "admin@hulleats.local",
      fullName: "Platform Admin",
      role: UserRole.PLATFORM_ADMIN,
    },
  });

  const merchantUser = await prisma.user.upsert({
    where: { email: "manager@firebrick.local" },
    update: {},
    create: {
      email: "manager@firebrick.local",
      fullName: "Firebrick Manager",
      role: UserRole.MERCHANT_MANAGER,
    },
  });

  const courierOneUser = await prisma.user.upsert({
    where: { email: "courier.one@hulleats.local" },
    update: {},
    create: {
      email: "courier.one@hulleats.local",
      fullName: "Courier One",
      role: UserRole.COURIER,
    },
  });

  const courierTwoUser = await prisma.user.upsert({
    where: { email: "courier.two@hulleats.local" },
    update: {},
    create: {
      email: "courier.two@hulleats.local",
      fullName: "Courier Two",
      role: UserRole.COURIER,
    },
  });

  const merchant = await prisma.merchant.upsert({
    where: { slug: "firebrick-foods" },
    update: {},
    create: {
      slug: "firebrick-foods",
      name: "Firebrick Foods",
    },
  });

  await prisma.merchantMembership.upsert({
    where: {
      userId_merchantId: {
        userId: merchantUser.id,
        merchantId: merchant.id,
      },
    },
    update: {},
    create: {
      userId: merchantUser.id,
      merchantId: merchant.id,
      role: MembershipRole.MANAGER,
    },
  });

  const customerProfile = await prisma.customerProfile.upsert({
    where: { supabaseAuthUserId: "supabase-user-alex-carter" },
    update: {},
    create: {
      supabaseAuthUserId: "supabase-user-alex-carter",
      email: "alex@example.com",
      fullName: "Alex Carter",
      phone: "07123456789",
      marketingOptIn: true,
      stripeCustomerId: "cus_demo_alex_carter",
    },
  });

  const customerAddress = await prisma.customerAddress.upsert({
    where: { id: "customer-address-alex-home" },
    update: {
      customerProfileId: customerProfile.id,
    },
    create: {
      id: "customer-address-alex-home",
      customerProfileId: customerProfile.id,
      label: "Home",
      type: CustomerAddressType.HOME,
      fullName: "Alex Carter",
      phone: "07123456789",
      addressLine1: "21 King Street",
      city: "Hull",
      postcode: "HU1 1AA",
      deliveryNotes: "Blue door, second floor",
      isDefault: true,
    },
  });

  await prisma.customerProfile.update({
    where: { id: customerProfile.id },
    data: {
      defaultAddressId: customerAddress.id,
    },
  });

  const restaurantStore = await prisma.store.upsert({
    where: { slug: "firebrick-pizza-hull" },
    update: {},
    create: {
      merchantId: merchant.id,
      slug: "firebrick-pizza-hull",
      name: "Firebrick Pizza Hull",
      type: StoreType.RESTAURANT,
      addressLine1: "10 Marina Way",
      city: "Hull",
      postcode: "HU1 2AA",
    },
  });

  const shopStore = await prisma.store.upsert({
    where: { slug: "firebrick-local-mart" },
    update: {},
    create: {
      merchantId: merchant.id,
      slug: "firebrick-local-mart",
      name: "Firebrick Local Mart",
      type: StoreType.SHOP,
      addressLine1: "88 Beverley Road",
      city: "Hull",
      postcode: "HU3 1YA",
    },
  });

  const pizzaCover = await prisma.mediaAsset.upsert({
    where: { id: "asset-store-pizza-cover" },
    update: {
      merchantId: merchant.id,
      storeId: restaurantStore.id,
      url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
    },
    create: {
      id: "asset-store-pizza-cover",
      merchantId: merchant.id,
      storeId: restaurantStore.id,
      url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
      altText: "Fresh pizza on a wooden table",
      mimeType: "image/jpeg",
      purpose: "store_cover",
    },
  });

  const martCover = await prisma.mediaAsset.upsert({
    where: { id: "asset-store-mart-cover" },
    update: {
      merchantId: merchant.id,
      storeId: shopStore.id,
      url: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
    },
    create: {
      id: "asset-store-mart-cover",
      merchantId: merchant.id,
      storeId: shopStore.id,
      url: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
      altText: "Modern convenience store aisle",
      mimeType: "image/jpeg",
      purpose: "store_cover",
    },
  });

  await prisma.store.update({
    where: { id: restaurantStore.id },
    data: {
      shortDescription: "Stone-baked pizza, sides, and quick evening delivery.",
      cuisineLabel: "Stone-baked pizza",
      coverAssetId: pizzaCover.id,
    },
  });

  await prisma.store.update({
    where: { id: shopStore.id },
    data: {
      shortDescription: "Local grocery essentials, snacks, and drinks.",
      cuisineLabel: "Groceries and snacks",
      coverAssetId: martCover.id,
    },
  });

  const pizzaZone = await prisma.deliveryZone.upsert({
    where: { id: "zone-firebrick-pizza-hull-main" },
    update: { storeId: restaurantStore.id },
    create: {
      id: "zone-firebrick-pizza-hull-main",
      storeId: restaurantStore.id,
      name: "Hull Central",
      postcodePatterns: ["HU1*", "HU2*", "HU3*"],
      deliveryFee: money(2.99),
      minimumOrderAmount: money(10),
    },
  });

  const martZone = await prisma.deliveryZone.upsert({
    where: { id: "zone-firebrick-local-mart-main" },
    update: { storeId: shopStore.id },
    create: {
      id: "zone-firebrick-local-mart-main",
      storeId: shopStore.id,
      name: "Local Mart Zone",
      postcodePatterns: ["HU3*", "HU4*"],
      deliveryFee: money(3.49),
      minimumOrderAmount: money(12),
    },
  });

  const pizzaCategory = await prisma.menuCategory.upsert({
    where: { id: "menu-cat-pizza" },
    update: { storeId: restaurantStore.id },
    create: {
      id: "menu-cat-pizza",
      storeId: restaurantStore.id,
      name: "Signature Pizzas",
      sortOrder: 1,
    },
  });

  const martCategory = await prisma.menuCategory.upsert({
    where: { id: "menu-cat-snacks" },
    update: { storeId: shopStore.id },
    create: {
      id: "menu-cat-snacks",
      storeId: shopStore.id,
      name: "Snacks",
      sortOrder: 1,
    },
  });

  const pizzaImage = await prisma.mediaAsset.upsert({
    where: { id: "asset-item-margherita" },
    update: {
      merchantId: merchant.id,
      storeId: restaurantStore.id,
      url: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=900&q=80",
    },
    create: {
      id: "asset-item-margherita",
      merchantId: merchant.id,
      storeId: restaurantStore.id,
      url: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=900&q=80",
      altText: "Margherita pizza",
      mimeType: "image/jpeg",
      purpose: "menu_item",
    },
  });

  const hotHoneyImage = await prisma.mediaAsset.upsert({
    where: { id: "asset-item-hot-honey" },
    update: {
      merchantId: merchant.id,
      storeId: restaurantStore.id,
      url: "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=900&q=80",
    },
    create: {
      id: "asset-item-hot-honey",
      merchantId: merchant.id,
      storeId: restaurantStore.id,
      url: "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=900&q=80",
      altText: "Pepperoni pizza with hot honey",
      mimeType: "image/jpeg",
      purpose: "menu_item",
    },
  });

  const colaImage = await prisma.mediaAsset.upsert({
    where: { id: "asset-item-cola" },
    update: {
      merchantId: merchant.id,
      storeId: shopStore.id,
      url: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=900&q=80",
    },
    create: {
      id: "asset-item-cola",
      merchantId: merchant.id,
      storeId: shopStore.id,
      url: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=900&q=80",
      altText: "2 litre cola bottle",
      mimeType: "image/jpeg",
      purpose: "menu_item",
    },
  });

  const margherita = await prisma.menuItem.upsert({
    where: { id: "item-margherita" },
    update: {
      categoryId: pizzaCategory.id,
      primaryImageAssetId: pizzaImage.id,
      trackStock: false,
      stockStatus: StockStatus.IN_STOCK,
      sortOrder: 1,
    },
    create: {
      id: "item-margherita",
      categoryId: pizzaCategory.id,
      primaryImageAssetId: pizzaImage.id,
      name: "Margherita",
      description: "Stone-baked with mozzarella and basil",
      price: money(11.5),
      isFeatured: true,
      trackStock: false,
      stockStatus: StockStatus.IN_STOCK,
      sortOrder: 1,
    },
  });

  const hotHoney = await prisma.menuItem.upsert({
    where: { id: "item-hot-honey" },
    update: {
      categoryId: pizzaCategory.id,
      primaryImageAssetId: hotHoneyImage.id,
      trackStock: true,
      stockQuantity: 4,
      lowStockThreshold: 5,
      stockStatus: StockStatus.LOW_STOCK,
      allowBackorder: false,
      maxPerOrder: 2,
      sortOrder: 2,
    },
    create: {
      id: "item-hot-honey",
      categoryId: pizzaCategory.id,
      primaryImageAssetId: hotHoneyImage.id,
      name: "Hot Honey Pepperoni",
      description: "Pepperoni, hot honey glaze, mozzarella, oregano",
      price: money(13.9),
      isFeatured: true,
      trackStock: true,
      stockQuantity: 4,
      lowStockThreshold: 5,
      stockStatus: StockStatus.LOW_STOCK,
      allowBackorder: false,
      maxPerOrder: 2,
      sortOrder: 2,
    },
  });

  const garlicDip = await prisma.menuItem.upsert({
    where: { id: "item-garlic-dip" },
    update: {
      categoryId: pizzaCategory.id,
      primaryImageAssetId: hotHoneyImage.id,
      trackStock: true,
      stockQuantity: 0,
      lowStockThreshold: 3,
      stockStatus: StockStatus.OUT_OF_STOCK,
      allowBackorder: false,
      maxPerOrder: 4,
      sortOrder: 3,
    },
    create: {
      id: "item-garlic-dip",
      categoryId: pizzaCategory.id,
      primaryImageAssetId: hotHoneyImage.id,
      name: "Roast Garlic Dip",
      description: "Creamy house dip for crusts and sides",
      price: money(1.5),
      trackStock: true,
      stockQuantity: 0,
      lowStockThreshold: 3,
      stockStatus: StockStatus.OUT_OF_STOCK,
      allowBackorder: false,
      maxPerOrder: 4,
      sortOrder: 3,
    },
  });

  const cola = await prisma.menuItem.upsert({
    where: { id: "item-cola" },
    update: {
      categoryId: martCategory.id,
      primaryImageAssetId: colaImage.id,
      trackStock: true,
      stockQuantity: 12,
      lowStockThreshold: 4,
      stockStatus: StockStatus.IN_STOCK,
      allowBackorder: false,
      maxPerOrder: 6,
      sortOrder: 1,
    },
    create: {
      id: "item-cola",
      categoryId: martCategory.id,
      primaryImageAssetId: colaImage.id,
      name: "Cola Bottle",
      description: "2 litre bottle",
      price: money(2.75),
      trackStock: true,
      stockQuantity: 12,
      lowStockThreshold: 4,
      stockStatus: StockStatus.IN_STOCK,
      allowBackorder: false,
      maxPerOrder: 6,
      sortOrder: 1,
    },
  });

  await prisma.inventoryAdjustment.upsert({
    where: { id: "inventory-adjustment-hot-honey-low" },
    update: {
      menuItemId: hotHoney.id,
      actorUserId: merchantUser.id,
      quantityDelta: -2,
    },
    create: {
      id: "inventory-adjustment-hot-honey-low",
      menuItemId: hotHoney.id,
      actorUserId: merchantUser.id,
      quantityDelta: -2,
      reason: InventoryAdjustmentReason.MANUAL_ADJUSTMENT,
      note: "Reduced stock after prep count",
    },
  });

  await prisma.inventoryAdjustment.upsert({
    where: { id: "inventory-adjustment-cola-restock" },
    update: {
      menuItemId: cola.id,
      actorUserId: merchantUser.id,
      quantityDelta: 12,
    },
    create: {
      id: "inventory-adjustment-cola-restock",
      menuItemId: cola.id,
      actorUserId: merchantUser.id,
      quantityDelta: 12,
      reason: InventoryAdjustmentReason.RESTOCK,
      note: "Morning delivery restock",
    },
  });

  const courierOne = await prisma.courierProfile.upsert({
    where: { userId: courierOneUser.id },
    update: { currentStatus: DriverStatus.AVAILABLE, isActive: true },
    create: {
      userId: courierOneUser.id,
      vehicleType: "bike",
      isActive: true,
      currentStatus: DriverStatus.AVAILABLE,
    },
  });

  const courierTwo = await prisma.courierProfile.upsert({
    where: { userId: courierTwoUser.id },
    update: { currentStatus: DriverStatus.AVAILABLE, isActive: true },
    create: {
      userId: courierTwoUser.id,
      vehicleType: "car",
      isActive: true,
      currentStatus: DriverStatus.AVAILABLE,
    },
  });

  await prisma.driverShift.upsert({
    where: { id: "shift-courier-one" },
    update: { courierProfileId: courierOne.id, isOnline: true },
    create: {
      id: "shift-courier-one",
      courierProfileId: courierOne.id,
      isOnline: true,
    },
  });

  await prisma.driverShift.upsert({
    where: { id: "shift-courier-two" },
    update: { courierProfileId: courierTwo.id, isOnline: true },
    create: {
      id: "shift-courier-two",
      courierProfileId: courierTwo.id,
      isOnline: true,
    },
  });

  const pizzaPrinter = await prisma.printer.upsert({
    where: { id: "printer-pizza-main" },
    update: { storeId: restaurantStore.id },
    create: {
      id: "printer-pizza-main",
      storeId: restaurantStore.id,
      name: "Kitchen Printer",
      adapterType: PrinterAdapterType.MOCK,
      isDefault: true,
      config: { channel: "stdout" },
    },
  });

  await prisma.printer.upsert({
    where: { id: "printer-shop-main" },
    update: { storeId: shopStore.id },
    create: {
      id: "printer-shop-main",
      storeId: shopStore.id,
      name: "Counter Printer",
      adapterType: PrinterAdapterType.MOCK,
      isDefault: true,
      config: { channel: "stdout" },
    },
  });

  const orderOne = await prisma.order.upsert({
    where: { orderNumber: "HE-1001" },
    update: {},
    create: {
      orderNumber: "HE-1001",
      customerProfileId: customerProfile.id,
      customerAddressId: customerAddress.id,
      storeId: restaurantStore.id,
      deliveryZoneId: pizzaZone.id,
      fulfillmentType: FulfillmentType.DELIVERY,
      source: OrderSource.WEB,
      status: OrderStatus.ACCEPTED,
      paymentStatus: PaymentStatus.PAID,
      customerName: customerAddress.fullName,
      customerPhone: customerAddress.phone,
      customerEmail: customerProfile.email,
      addressLine1: customerAddress.addressLine1,
      city: customerAddress.city,
      postcode: customerAddress.postcode,
      notes: customerAddress.deliveryNotes ?? undefined,
      subtotalAmount: money(11.5),
      deliveryFee: money(2.99),
      totalAmount: money(14.49),
      currency: "GBP",
      prepTimeMinutes: 18,
      acceptedAt: new Date(),
      items: {
        create: [
          {
            menuItemId: margherita.id,
            quantity: 1,
            unitPrice: money(11.5),
            totalPrice: money(11.5),
            nameSnapshot: "Margherita",
          },
        ],
      },
      statusHistory: {
        create: [
          {
            actorUserId: admin.id,
            status: OrderStatus.PENDING,
            note: "Customer placed order",
          },
          {
            actorUserId: merchantUser.id,
            status: OrderStatus.ACCEPTED,
            note: "Merchant accepted order",
          },
        ],
      },
    },
  });

  const orderTwo = await prisma.order.upsert({
    where: { orderNumber: "HE-1002" },
    update: {},
    create: {
      orderNumber: "HE-1002",
      customerProfileId: customerProfile.id,
      customerAddressId: customerAddress.id,
      storeId: shopStore.id,
      deliveryZoneId: martZone.id,
      fulfillmentType: FulfillmentType.DELIVERY,
      source: OrderSource.IOS_APP,
      status: OrderStatus.ASSIGNED,
      paymentStatus: PaymentStatus.PAID,
      customerName: customerAddress.fullName,
      customerPhone: customerAddress.phone,
      customerEmail: customerProfile.email,
      addressLine1: customerAddress.addressLine1,
      city: customerAddress.city,
      postcode: customerAddress.postcode,
      subtotalAmount: money(5.5),
      deliveryFee: money(3.49),
      totalAmount: money(8.99),
      currency: "GBP",
      prepTimeMinutes: 10,
      items: {
        create: [
          {
            menuItemId: cola.id,
            quantity: 2,
            unitPrice: money(2.75),
            totalPrice: money(5.5),
            nameSnapshot: "Cola Bottle",
          },
        ],
      },
      statusHistory: {
        create: [
          {
            actorUserId: admin.id,
            status: OrderStatus.PENDING,
          },
          {
            actorUserId: admin.id,
            status: OrderStatus.ASSIGNED,
            note: "Assigned to courier",
          },
        ],
      },
      delivery: {
        create: {
          courierProfileId: courierOne.id,
          assignedByUserId: admin.id,
          status: DeliveryStatus.ASSIGNED,
          assignedAt: new Date(),
          statusHistory: {
            create: [
              {
                actorUserId: admin.id,
                status: DeliveryStatus.ASSIGNED,
                note: "Manual assignment",
              },
            ],
          },
        },
      },
    },
  });

  await prisma.inventoryAdjustment.upsert({
    where: { id: "inventory-adjustment-order-two-cola" },
    update: {
      sourceOrderId: orderTwo.id,
      menuItemId: cola.id,
    },
    create: {
      id: "inventory-adjustment-order-two-cola",
      sourceOrderId: orderTwo.id,
      menuItemId: cola.id,
      quantityDelta: -2,
      reason: InventoryAdjustmentReason.ORDER_PLACED,
      note: "Reserved against order HE-1002",
    },
  });

  await prisma.printJob.upsert({
    where: { id: "print-job-demo-1" },
    update: { printerId: pizzaPrinter.id, orderId: orderOne.id },
    create: {
      id: "print-job-demo-1",
      printerId: pizzaPrinter.id,
      orderId: orderOne.id,
      status: PrintJobStatus.QUEUED,
      payload: {
        orderId: orderOne.id,
        orderNumber: orderOne.orderNumber,
      },
    },
  });

  await prisma.payment.upsert({
    where: { orderId: orderOne.id },
    update: {
      customerProfileId: customerProfile.id,
      status: PaymentRecordStatus.SUCCEEDED,
    },
    create: {
      orderId: orderOne.id,
      customerProfileId: customerProfile.id,
      provider: PaymentProvider.STRIPE,
      status: PaymentRecordStatus.SUCCEEDED,
      methodType: PaymentMethodType.CARD,
      stripeCustomerId: customerProfile.stripeCustomerId,
      stripePaymentIntentId: "pi_demo_order_one",
      stripeChargeId: "ch_demo_order_one",
      amount: money(14.49),
      currency: "GBP",
      events: {
        create: [
          {
            stripeEventId: "evt_demo_order_one",
            type: "payment_intent.succeeded",
            status: PaymentRecordStatus.SUCCEEDED,
            payload: {
              orderNumber: orderOne.orderNumber,
            },
          },
        ],
      },
    },
  });

  await prisma.payment.upsert({
    where: { orderId: orderTwo.id },
    update: {
      customerProfileId: customerProfile.id,
      status: PaymentRecordStatus.SUCCEEDED,
    },
    create: {
      orderId: orderTwo.id,
      customerProfileId: customerProfile.id,
      provider: PaymentProvider.STRIPE,
      status: PaymentRecordStatus.SUCCEEDED,
      methodType: PaymentMethodType.APPLE_PAY,
      stripeCustomerId: customerProfile.stripeCustomerId,
      stripePaymentIntentId: "pi_demo_order_two",
      stripeChargeId: "ch_demo_order_two",
      amount: money(8.99),
      currency: "GBP",
      events: {
        create: [
          {
            stripeEventId: "evt_demo_order_two",
            type: "payment_intent.succeeded",
            status: PaymentRecordStatus.SUCCEEDED,
            payload: {
              orderNumber: orderTwo.orderNumber,
            },
          },
        ],
      },
    },
  });

  await prisma.outboxEvent.create({
    data: {
      aggregateType: "order",
      aggregateId: orderTwo.id,
      eventName: "delivery.assigned",
      payload: {
        orderNumber: orderTwo.orderNumber,
        courierProfileId: courierOne.id,
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
