import { Injectable, Logger } from "@nestjs/common";

type ResetDeliveryMode = "stub" | "preview" | "email";

@Injectable()
export class MerchantPasswordResetDeliveryService {
  private readonly logger = new Logger(MerchantPasswordResetDeliveryService.name);

  getDeliveryMode(): ResetDeliveryMode {
    return process.env.NODE_ENV === "production" ? "stub" : "preview";
  }

  async sendResetCode(input: { email: string; businessName: string; code: string }) {
    const deliveryMode = this.getDeliveryMode();

    this.logger.log(`Merchant password reset requested for ${input.email} (${input.businessName}).`);
    this.logger.debug(`Merchant password reset code for ${input.email}: ${input.code}`);

    if (deliveryMode === "preview") {
      return {
        deliveryMode,
        debugCode: input.code,
      };
    }

    return {
      deliveryMode,
    };
  }
}
