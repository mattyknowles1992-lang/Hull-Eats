import { Injectable, UnauthorizedException } from "@nestjs/common";

import { safeEqual, signSessionToken, verifySessionToken } from "@hull-eats/auth";
import { loadEnv } from "@hull-eats/config";
import type { HubUser } from "@hull-eats/types";

type InternalSessionScope = "admin" | "merchant";

type InternalSessionPayload = {
  sub: string;
  scope: InternalSessionScope;
  email?: string;
  hubId?: string;
  username?: string;
  role?: string;
  iat: number;
  exp: number;
};

@Injectable()
export class InternalAuthService {
  private readonly env = loadEnv(process.env);
  private readonly ttlSeconds = this.env.INTERNAL_SESSION_TTL_HOURS * 60 * 60;

  loginAdmin(email: string, password: string) {
    if (!safeEqual(email.trim().toLowerCase(), this.env.ADMIN_BOOTSTRAP_EMAIL.trim().toLowerCase())) {
      throw new UnauthorizedException("Admin email or password was incorrect.");
    }

    if (!safeEqual(password, this.env.ADMIN_BOOTSTRAP_PASSWORD)) {
      throw new UnauthorizedException("Admin email or password was incorrect.");
    }

    return {
      token: this.issueToken({
        sub: this.env.ADMIN_BOOTSTRAP_EMAIL,
        scope: "admin",
        email: this.env.ADMIN_BOOTSTRAP_EMAIL,
      }),
      admin: {
        email: this.env.ADMIN_BOOTSTRAP_EMAIL,
      },
    };
  }

  issueMerchantToken(user: HubUser) {
    return this.issueToken({
      sub: user.id,
      scope: "merchant",
      hubId: user.hubId,
      username: user.username,
      role: user.role,
    });
  }

  requireAdminToken(authorization?: string) {
    const payload = this.requireToken(authorization);
    if (payload.scope !== "admin") {
      throw new UnauthorizedException("Admin token required.");
    }

    return payload;
  }

  requireMerchantToken(authorization?: string, hubId?: string) {
    const payload = this.requireToken(authorization);
    if (payload.scope !== "merchant") {
      throw new UnauthorizedException("Merchant token required.");
    }

    if (hubId && payload.hubId !== hubId) {
      throw new UnauthorizedException("Merchant token does not belong to this hub.");
    }

    return payload;
  }

  private issueToken(input: Omit<InternalSessionPayload, "iat" | "exp">) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    return signSessionToken(
      {
        ...input,
        iat: nowSeconds,
        exp: nowSeconds + this.ttlSeconds,
      },
      this.env.INTERNAL_AUTH_TOKEN_SECRET,
    );
  }

  private requireToken(authorization?: string) {
    const token = this.extractBearerToken(authorization);

    let payload: InternalSessionPayload;
    try {
      payload = verifySessionToken<InternalSessionPayload>(token, this.env.INTERNAL_AUTH_TOKEN_SECRET);
    } catch {
      throw new UnauthorizedException("Session token was invalid.");
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException("Session token expired.");
    }

    return payload;
  }

  private extractBearerToken(authorization?: string) {
    if (!authorization) {
      throw new UnauthorizedException("Missing authorization header.");
    }

    const [scheme, token] = authorization.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedException("Authorization header must be a Bearer token.");
    }

    return token;
  }
}
