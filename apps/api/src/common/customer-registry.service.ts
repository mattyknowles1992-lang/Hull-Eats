import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { prisma } from "@hull-eats/db";

type CustomerRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  account_status: string;
  email_verified_at: Date | null;
  marketing_opt_in: boolean;
  preferred_delivery_plan: string;
  created_at: Date;
  default_address: string | null;
  subscription_id: string | null;
  subscription_status: string | null;
  free_delivery_active: boolean | null;
  admin_override: boolean | null;
  manual_review_required: boolean | null;
  moderation_note_count: bigint | number;
};

@Injectable()
export class CustomerRegistryService {
  async listCustomers() {
    const rows = await prisma.$queryRaw<CustomerRow[]>`
      select
        cp.id::text,
        cp.email,
        cp.full_name,
        cp.phone,
        cp.account_status::text,
        cp.email_verified_at,
        cp.marketing_opt_in,
        cp.preferred_delivery_plan::text,
        cp.created_at,
        concat_ws(', ', ca.address_line_1, ca.address_line_2, ca.city, ca.postcode) as default_address,
        s.id::text as subscription_id,
        s.status::text as subscription_status,
        s.free_delivery_active,
        coalesce(s.admin_override, false) as admin_override,
        coalesce(cp.manual_review_required, false) as manual_review_required,
        coalesce(notes.moderation_note_count, 0) as moderation_note_count
      from public.customer_profiles cp
      left join public.customer_addresses ca on ca.id = cp.default_address_id
      left join lateral (
        select *
        from public.subscriptions s
        where s.customer_profile_id = cp.id
        order by s.created_at desc
        limit 1
      ) s on true
      left join lateral (
        select count(*)::bigint as moderation_note_count
        from public.customer_account_events cae
        where cae.customer_profile_id = cp.id
      ) notes on true
      order by cp.created_at desc
      limit 500
    `;

    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name ?? "Customer",
      phone: row.phone ?? "",
      accountStatus: row.account_status,
      emailVerified: Boolean(row.email_verified_at),
      marketingOptIn: row.marketing_opt_in,
      preferredDeliveryPlan: row.preferred_delivery_plan,
      createdAt: row.created_at.toISOString(),
      defaultAddress: row.default_address ?? "",
      subscriptionId: row.subscription_id,
      subscriptionStatus: row.subscription_status ?? "none",
      hullEatsPlusActive: Boolean(row.free_delivery_active),
      adminOverride: Boolean(row.admin_override),
      manualReviewRequired: Boolean(row.manual_review_required),
      moderationNoteCount: Number(row.moderation_note_count),
    }));
  }

  async updateCustomer(
    customerProfileId: string,
    input: {
      accountStatus?: string;
      manualReviewRequired?: boolean;
      moderationNote?: string;
      hullEatsPlusActive?: boolean;
      subscriptionStatus?: string;
      overrideReason?: string;
    },
  ) {
    const allowedStatuses = new Set(["active", "suspended", "banned", "disabled", "deleted"]);
    const allowedSubscriptionStatuses = new Set(["inactive", "incomplete", "trialing", "active", "past_due", "unpaid", "paused", "canceled"]);

    if (input.accountStatus && !allowedStatuses.has(input.accountStatus)) {
      throw new BadRequestException("Unsupported customer account status.");
    }

    if (input.subscriptionStatus && !allowedSubscriptionStatuses.has(input.subscriptionStatus)) {
      throw new BadRequestException("Unsupported subscription status.");
    }

    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      select id::text from public.customer_profiles where id = ${customerProfileId}::uuid
    `;

    if (!existing[0]) {
      throw new NotFoundException("Customer profile not found.");
    }

    if (input.accountStatus || typeof input.manualReviewRequired === "boolean") {
      await prisma.$executeRaw`
        update public.customer_profiles
        set
          account_status = coalesce(${input.accountStatus ?? null}::public.customer_account_status, account_status),
          manual_review_required = coalesce(${input.manualReviewRequired ?? null}::boolean, manual_review_required),
          suspended_at = case when ${input.accountStatus ?? null} in ('suspended', 'disabled') then timezone('utc', now()) else suspended_at end,
          banned_at = case when ${input.accountStatus ?? null} = 'banned' then timezone('utc', now()) else banned_at end,
          updated_at = timezone('utc', now())
        where id = ${customerProfileId}::uuid
      `;
    }

    if (typeof input.hullEatsPlusActive === "boolean" || input.subscriptionStatus) {
      await prisma.$executeRaw`
        insert into public.subscriptions (
          customer_profile_id,
          provider,
          plan_code,
          status,
          free_delivery_active,
          admin_override,
          override_reason,
          access_granted_at
        )
        values (
          ${customerProfileId}::uuid,
          'stripe',
          'hull-eats-plus-monthly',
          coalesce(${input.subscriptionStatus ?? null}::public.subscription_status, case when ${input.hullEatsPlusActive ?? false} then 'active'::public.subscription_status else 'inactive'::public.subscription_status end),
          coalesce(${input.hullEatsPlusActive ?? null}::boolean, false),
          true,
          nullif(${input.overrideReason ?? ""}, ''),
          case when coalesce(${input.hullEatsPlusActive ?? null}::boolean, false) then timezone('utc', now()) else null end
        )
        on conflict (customer_profile_id) do update
        set
          status = coalesce(${input.subscriptionStatus ?? null}::public.subscription_status, public.subscriptions.status),
          free_delivery_active = coalesce(${input.hullEatsPlusActive ?? null}::boolean, public.subscriptions.free_delivery_active),
          admin_override = true,
          override_reason = coalesce(nullif(${input.overrideReason ?? ""}, ''), public.subscriptions.override_reason),
          access_granted_at = case when coalesce(${input.hullEatsPlusActive ?? null}::boolean, false) then timezone('utc', now()) else public.subscriptions.access_granted_at end,
          suspended_at = case when coalesce(${input.hullEatsPlusActive ?? null}::boolean, true) = false then timezone('utc', now()) else public.subscriptions.suspended_at end,
          updated_at = timezone('utc', now())
      `;
    }

    if (input.moderationNote?.trim()) {
      await prisma.$executeRaw`
        insert into public.customer_account_events (customer_profile_id, event_type, note, created_by)
        values (${customerProfileId}::uuid, 'manual_review', ${input.moderationNote.trim()}, 'admin')
      `;
    }

    const updated = await this.listCustomers();
    return updated.find((customer) => customer.id === customerProfileId);
  }
}
