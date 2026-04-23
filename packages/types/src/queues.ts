export const queueNames = {
  orderEvents: "order-events",
  printJobs: "print-jobs",
  notifications: "notifications",
  dispatchUpdates: "dispatch-updates",
} as const;

export type QueueName = (typeof queueNames)[keyof typeof queueNames];

