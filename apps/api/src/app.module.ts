import { Module } from "@nestjs/common";

import { RootController } from "./modules/root/root.controller";
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
import { HubRegistryService } from "./common/hub-registry.service";
import { InternalAuthService } from "./common/internal-auth.service";
import { CourierRegistryService } from "./common/courier-registry.service";
import { CustomerNotificationsService } from "./common/customer-notifications.service";
import { CustomerRegistryService } from "./common/customer-registry.service";

@Module({
  controllers: [
    RootController,
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
  providers: [OrderUpdatesGateway, HubRegistryService, InternalAuthService, CourierRegistryService, CustomerNotificationsService, CustomerRegistryService],
})
export class AppModule {}
