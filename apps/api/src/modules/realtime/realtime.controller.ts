import { Controller, Get } from "@nestjs/common";

@Controller("realtime")
export class RealtimeController {
  @Get("token")
  issueRealtimeToken() {
    return {
      token: "mvp-dev-token",
      channels: ["orders:*", "stores:*", "drivers:*"],
    };
  }
}
