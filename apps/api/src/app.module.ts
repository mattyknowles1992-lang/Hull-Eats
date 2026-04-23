import { Module } from "@nestjs/common";

import { HealthController } from "./modules/health/health.controller";
import { PublicController } from "./modules/public/public.controller";
import { MerchantController } from "./modules/merchant/merchant.controller";
import { AdminController } from "./modules/admin/admin.controller";
import { CheckoutController } from "./modules/checkout/checkout.controller";
import { CourierController } from "./modules/courier/courier.controller";
import { CustomerController } from "./modules/customer/customer.controller";
import { PaymentsController } from "./modules/payments/payments.controller";
import { RealtimeController } from "./modules/realtime/realtime.controller";
import { OrderUpdatesGateway } from "./modules/realtime/order-updates.gateway";

@Module({
  controllers: [
    HealthController,
    PublicController,
    MerchantController,
    AdminController,
    CheckoutController,
    CourierController,
    CustomerController,
    PaymentsController,
    RealtimeController,
  ],
  providers: [OrderUpdatesGateway],
})
export class AppModule {}
