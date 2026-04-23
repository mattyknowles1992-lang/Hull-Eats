import { Body, Controller, Get, Post } from "@nestjs/common";

import { createCustomerAddressInputSchema, customerAddressSchema, customerProfileSchema } from "@hull-eats/types";

import { demoOrders } from "../../common/demo-data";

const demoCustomer = customerProfileSchema.parse({
  id: "customer_alex_carter",
  supabaseAuthUserId: "supabase-user-alex-carter",
  email: "alex@example.com",
  fullName: "Alex Carter",
  phone: "07123456789",
  stripeCustomerId: "cus_demo_alex_carter",
  defaultAddressId: "customer-address-alex-home",
});

const demoAddresses = [
  customerAddressSchema.parse({
    id: "customer-address-alex-home",
    customerProfileId: "customer_alex_carter",
    label: "Home",
    type: "home",
    fullName: "Alex Carter",
    phone: "07123456789",
    addressLine1: "21 King Street",
    city: "Hull",
    postcode: "HU1 1AA",
    deliveryNotes: "Blue door, second floor",
    isDefault: true,
  }),
];

@Controller("customer")
export class CustomerController {
  @Get("me")
  getCustomerProfile() {
    return demoCustomer;
  }

  @Get("me/addresses")
  listCustomerAddresses() {
    return demoAddresses;
  }

  @Post("me/addresses")
  createCustomerAddress(@Body() body: unknown) {
    const input = createCustomerAddressInputSchema.parse(body);

    return customerAddressSchema.parse({
      id: `customer-address-${Date.now()}`,
      customerProfileId: demoCustomer.id,
      ...input,
    });
  }

  @Get("me/orders")
  listCustomerOrders() {
    return demoOrders;
  }
}

