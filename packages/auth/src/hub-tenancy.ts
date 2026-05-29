export class MerchantHubAccessError extends Error {
  constructor(message = "Merchant token does not belong to this hub.") {
    super(message);
    this.name = "MerchantHubAccessError";
  }
}

/** Ensures a hub user's business id matches the hub id on the request path. */
export function assertMerchantHubAccess(userMerchantId: string, requestedHubId: string | undefined): void {
  if (requestedHubId && userMerchantId !== requestedHubId) {
    throw new MerchantHubAccessError();
  }
}
