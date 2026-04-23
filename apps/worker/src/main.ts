import { QueueEvents, Worker } from "bullmq";
import IORedis from "ioredis";

import { loadEnv, resolveRedisUrl } from "@hull-eats/config";
import { MockPrinterAdapter } from "@hull-eats/printer";
import { queueNames, type DomainEvent, type PrintJobPayload } from "@hull-eats/types";

const env = loadEnv(process.env);
const connection = new IORedis(resolveRedisUrl(env), { maxRetriesPerRequest: null });
const printer = new MockPrinterAdapter();

const orderEventsWorker = new Worker(
  queueNames.orderEvents,
  async (job) => {
    const event = job.data as DomainEvent;
    console.log(`[order-events] ${event.eventName} for ${event.aggregateType}:${event.aggregateId}`);
    return { handledAt: new Date().toISOString() };
  },
  { connection, concurrency: env.WORKER_CONCURRENCY },
);

const printJobsWorker = new Worker(
  queueNames.printJobs,
  async (job) => {
    const payload = job.data as PrintJobPayload;
    return printer.printOrderSlip(
      {
        id: payload.printerId,
        storeId: payload.storeId,
        name: "Mock Printer",
        adapterType: "mock",
        config: { source: "worker" },
      },
      payload,
    );
  },
  { connection, concurrency: env.WORKER_CONCURRENCY },
);

new QueueEvents(queueNames.orderEvents, { connection });
new QueueEvents(queueNames.printJobs, { connection });

async function shutdown(): Promise<void> {
  await Promise.all([orderEventsWorker.close(), printJobsWorker.close()]);
  await connection.quit();
}

process.on("SIGINT", () => {
  shutdown()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
});

console.log("Worker online", {
  queues: [queueNames.orderEvents, queueNames.printJobs],
  concurrency: env.WORKER_CONCURRENCY,
});
