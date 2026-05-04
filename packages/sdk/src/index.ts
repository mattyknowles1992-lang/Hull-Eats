import type {
  CheckoutSession,
  CourierCompleteDeliveryInput,
  CourierDelivery,
  CourierLocationInput,
  CourierStartDeliveryInput,
  CreateCheckoutSessionInput,
  CreateCustomerAddressInput,
  CreateOrderInput,
  CreatePaymentIntentInput,
  CustomerAddress,
  CustomerProfile,
  ManualDriverAssignmentInput,
  MerchantAcceptOrderInput,
  MerchantRejectOrderInput,
  OrderSummary,
  PaymentRecord,
  StoreSummary,
  TrackedOrder,
} from "@hull-eats/types";

type Fetcher = typeof fetch;

export type ApiClientOptions = {
  baseUrl: string;
  token?: string;
  fetcher?: Fetcher;
};

export class HullEatsApiClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly fetcher: Fetcher;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.token = options.token;
    this.fetcher = options.fetcher ?? fetch;
  }

  async listPublicStores(): Promise<StoreSummary[]> {
    return this.request<StoreSummary[]>("/v1/public/stores");
  }

  async getPublicStore(storeId: string): Promise<StoreSummary> {
    return this.request<StoreSummary>(`/v1/public/stores/${storeId}`);
  }

  async createOrder(input: CreateOrderInput): Promise<OrderSummary> {
    return this.request<OrderSummary>("/v1/public/orders", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSession> {
    return this.request<CheckoutSession>("/v1/checkout/sessions", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getCustomerProfile(): Promise<CustomerProfile> {
    return this.request<CustomerProfile>("/v1/customer/me");
  }

  async listCustomerAddresses(): Promise<CustomerAddress[]> {
    return this.request<CustomerAddress[]>("/v1/customer/me/addresses");
  }

  async createCustomerAddress(input: CreateCustomerAddressInput): Promise<CustomerAddress> {
    return this.request<CustomerAddress>("/v1/customer/me/addresses", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async listCustomerOrders(): Promise<OrderSummary[]> {
    return this.request<OrderSummary[]>("/v1/customer/me/orders");
  }

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentRecord> {
    return this.request<PaymentRecord>("/v1/payments/intents", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async trackOrder(orderId: string): Promise<TrackedOrder> {
    return this.request<TrackedOrder>(`/v1/public/orders/${orderId}/track`);
  }

  async listMerchantOrders(): Promise<OrderSummary[]> {
    return this.request<OrderSummary[]>("/v1/merchant/orders");
  }

  async acceptMerchantOrder(orderId: string, input: MerchantAcceptOrderInput): Promise<OrderSummary> {
    return this.request<OrderSummary>(`/v1/merchant/orders/${orderId}/accept`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async rejectMerchantOrder(orderId: string, input: MerchantRejectOrderInput): Promise<OrderSummary> {
    return this.request<OrderSummary>(`/v1/merchant/orders/${orderId}/reject`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async assignDriver(orderId: string, input: ManualDriverAssignmentInput): Promise<OrderSummary> {
    return this.request<OrderSummary>(`/v1/admin/orders/${orderId}/assign-driver`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async listCourierJobs(): Promise<CourierDelivery[]> {
    return this.request<CourierDelivery[]>("/v1/courier/jobs");
  }

  async startCourierDelivery(input: CourierStartDeliveryInput): Promise<CourierDelivery> {
    return this.request<CourierDelivery>("/v1/courier/deliveries/start", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async sendCourierLocation(deliveryId: string, input: CourierLocationInput): Promise<CourierDelivery> {
    return this.request<CourierDelivery>(`/v1/courier/deliveries/${deliveryId}/location`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async completeCourierDelivery(deliveryId: string, input: CourierCompleteDeliveryInput): Promise<CourierDelivery> {
    return this.request<CourierDelivery>(`/v1/courier/deliveries/${deliveryId}/complete`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }
}

export const createApiClient = (options: ApiClientOptions): HullEatsApiClient =>
  new HullEatsApiClient(options);

export * from "./demo-marketplace";
