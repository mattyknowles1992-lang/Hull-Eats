import { z } from "zod";

export const aggregateTypes = ["merchant", "store", "order", "delivery", "print_job"] as const;
export const domainEventNames = [
  "order.created",
  "order.accepted",
  "order.rejected",
  "order.prep_time_updated",
  "order.ready_for_dispatch",
  "delivery.assigned",
  "delivery.accepted",
  "delivery.picked_up",
  "delivery.delivered",
  "printjob.created",
  "printjob.completed",
  "printjob.failed",
] as const;

export type AggregateType = (typeof aggregateTypes)[number];
export type DomainEventName = (typeof domainEventNames)[number];

export const aggregateTypeSchema = z.enum(aggregateTypes);
export const domainEventNameSchema = z.enum(domainEventNames);

export const domainEventSchema = z.object({
  id: z.string().min(1),
  aggregateType: aggregateTypeSchema,
  aggregateId: z.string().min(1),
  eventName: domainEventNameSchema,
  payload: z.record(z.string(), z.unknown()),
  occurredAt: z.string().datetime(),
});

export type DomainEvent = z.infer<typeof domainEventSchema>;

