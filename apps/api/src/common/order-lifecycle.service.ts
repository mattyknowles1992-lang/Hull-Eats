import { Injectable, OnModuleInit } from "@nestjs/common";

import { expireStalePendingMerchantOrders } from "./order-repository";

@Injectable()
export class OrderLifecycleService implements OnModuleInit {
  onModuleInit() {
    const tick = () => {
      void expireStalePendingMerchantOrders().catch((error) => {
        console.error("[order-lifecycle] expire pending orders failed", error);
      });
    };

    tick();
    setInterval(tick, 15_000);
  }
}
