import { BadRequestException, Injectable } from "@nestjs/common";

import { prisma } from "@hull-eats/db";

type OrderNotificationSnapshot = {
  id: string;
  orderNumber: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
};

type RegisterCustomerPushTokenInput = {
  token?: string;
  platform?: string;
  orderId?: string;
  orderNumber?: string;
  customerEmail?: string;
  customerPhone?: string;
  /** When set, stored as customer_push_tokens.customer_id (matches orders.customer_profile_id). */
  customerProfileId?: string;
};

const customerWebBaseUrl = () => (process.env.CUSTOMER_WEB_URL ?? "https://hull-eats.onrender.com").replace(/\/$/, "");
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const orderLookupWhere = (orderId?: string, orderNumber?: string) => {
  const clauses: Array<Record<string, string>> = [];

  if (orderId && uuidPattern.test(orderId)) {
    clauses.push({ id: orderId });
  }

  if (orderNumber) {
    clauses.push({ orderNumber });
  }

  return clauses.length > 0 ? { OR: clauses } : undefined;
};

@Injectable()
export class CustomerNotificationsService {
  async registerPushToken(input: RegisterCustomerPushTokenInput) {
    const token = input.token?.trim();

    if (!token) {
      throw new BadRequestException("Push token is required.");
    }

    const orderWhere = orderLookupWhere(input.orderId, input.orderNumber);
    const order = orderWhere
      ? await prisma.order.findFirst({
          where: orderWhere as any,
          select: {
            id: true,
            customerEmail: true,
            customerPhone: true,
          },
        })
      : null;

    const profileId =
      input.customerProfileId && uuidPattern.test(input.customerProfileId.trim()) ? input.customerProfileId.trim() : null;

    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        insert into public.customer_push_tokens (
          order_id,
          customer_email,
          customer_phone,
          token,
          platform,
          is_active,
          customer_id,
          created_at,
          updated_at
        )
        values ($1::uuid, $2, $3, $4, $5, true, $6::uuid, timezone('utc', now()), timezone('utc', now()))
        on conflict (token) do update set
          order_id = coalesce(excluded.order_id, public.customer_push_tokens.order_id),
          customer_email = coalesce(excluded.customer_email, public.customer_push_tokens.customer_email),
          customer_phone = coalesce(excluded.customer_phone, public.customer_push_tokens.customer_phone),
          customer_id = coalesce(excluded.customer_id, public.customer_push_tokens.customer_id),
          platform = excluded.platform,
          is_active = true,
          updated_at = timezone('utc', now())
        returning id
      `,
      order?.id ?? null,
      input.customerEmail ?? order?.customerEmail ?? null,
      input.customerPhone ?? order?.customerPhone ?? null,
      token,
      input.platform ?? "unknown",
      profileId,
    );

    return {
      id: rows[0]?.id,
      registered: true,
    };
  }

  async notifyOrderPickedUp(order: OrderNotificationSnapshot) {
    return this.notifyOrderEvent(order, {
      event: "order.picked_up",
      title: "Your Hull Eats order has been picked up",
      body: `Your courier is on the way. You can now track order ${order.orderNumber}.`,
    });
  }

  async notifyOrderDelivered(order: OrderNotificationSnapshot) {
    return this.notifyOrderEvent(order, {
      event: "order.delivered",
      title: "Your Hull Eats order has been delivered",
      body: `Order ${order.orderNumber} has been marked as delivered.`,
    });
  }

  private async notifyOrderEvent(
    order: OrderNotificationSnapshot,
    notification: { event: string; title: string; body: string },
  ) {
    const deepLink = `${customerWebBaseUrl()}/track/${encodeURIComponent(order.orderNumber)}`;
    const tokens = await prisma.$queryRawUnsafe<Array<{ token: string }>>(
      `
        select t.token
        from public.customer_push_tokens t
        where t.is_active = true
          and (
            t.order_id = $1::uuid
            or ($2::text is not null and lower(t.customer_email) = lower($2::text))
            or ($3::text is not null and t.customer_phone = $3::text)
            or exists (
              select 1
              from public.orders o
              where o.id = $1::uuid
                and o.customer_profile_id is not null
                and o.customer_profile_id = t.customer_id
            )
          )
        order by t.updated_at desc
        limit 10
      `,
      order.id,
      order.customerEmail ?? null,
      order.customerPhone ?? null,
    );

    let status = tokens.length > 0 ? "queued" : "no_token";
    let providerResponse: unknown = null;

    if (tokens.length > 0) {
      providerResponse = await this.sendExpoPush(tokens.map((entry) => entry.token), {
        title: notification.title,
        body: notification.body,
        data: {
          orderNumber: order.orderNumber,
          url: deepLink,
          event: notification.event,
        },
      });
      status = providerResponse ? "sent" : "failed";
    }

    await prisma.$executeRawUnsafe(
      `
        insert into public.customer_notifications (
          order_id,
          order_number,
          customer_email,
          channel,
          event,
          title,
          body,
          deep_link,
          status,
          token_count,
          provider_response,
          created_at,
          sent_at
        )
        values ($1::uuid, $2, $3, 'push', $4, $5, $6, $7, $8, $9, $10::jsonb, timezone('utc', now()), case when $8 = 'sent' then timezone('utc', now()) else null end)
      `,
      order.id,
      order.orderNumber,
      order.customerEmail ?? null,
      notification.event,
      notification.title,
      notification.body,
      deepLink,
      status,
      tokens.length,
      JSON.stringify(providerResponse ?? {}),
    );

    return {
      status,
      tokenCount: tokens.length,
    };
  }

  private async sendExpoPush(tokens: string[], message: { title: string; body: string; data: Record<string, string> }) {
    const expoTokens = tokens.filter((token) => token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken["));

    if (expoTokens.length === 0) {
      return null;
    }

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        expoTokens.map((to) => ({
          to,
          sound: "default",
          title: message.title,
          body: message.body,
          data: message.data,
        })),
      ),
    });

    return response.json();
  }
}

export const customerNotifications = new CustomerNotificationsService();
