import { Controller, Get, HttpCode } from "@nestjs/common";

@Controller()
export class RootController {
  @Get()
  getRoot(): object {
    return {
      service: "hull-eats-api",
      status: "ok",
      apiBase: "/v1",
      health: "/v1/health",
    };
  }

  /** Browsers request this automatically; avoids noisy 404s in API logs. */
  @Get("favicon.ico")
  @HttpCode(204)
  favicon(): void {
    return undefined;
  }
}
