import { prisma } from "../../lib/prisma";
import { requestQueueNumber, resetQueue } from "../../lib/queue";
import type { ClientWithBooth } from "./assign-booths";
import { withDbRetry } from "./db-retry";

export interface QueueRequestResult {
  entrance: "BAZARNA" | "BYOUTH";
  email: string;
  boothNumber: string;
  queueNumber: number | null;
  qrToken: string | null;
  error: string | null;
}

type QueueJob = {
  client: ClientWithBooth;
  eventId: string;
  entrance: "BAZARNA" | "BYOUTH";
};

async function persistBoothNumbers(clients: ClientWithBooth[]) {
  const chunkSize = 25;
  for (let i = 0; i < clients.length; i += chunkSize) {
    const chunk = clients.slice(i, i + chunkSize);
    await withDbRetry(`Save booths ${i + 1}–${i + chunk.length}`, async () => {
      await prisma.$transaction(
        chunk.map((client) =>
          prisma.user.update({
            where: { id: client.id },
            data: { boothNumber: client.boothNumber },
          })
        )
      );
    });
  }
}

/** Mix Bazarna and Byouth so both queues run together, not one after the other. */
function interleaveJobs(
  bazarnaClients: ClientWithBooth[],
  byouthClients: ClientWithBooth[],
  bazarnaEventId: string,
  byouthEventId: string
): QueueJob[] {
  const jobs: QueueJob[] = [];
  const max = Math.max(bazarnaClients.length, byouthClients.length);
  for (let i = 0; i < max; i++) {
    if (bazarnaClients[i]) {
      jobs.push({
        client: bazarnaClients[i],
        eventId: bazarnaEventId,
        entrance: "BAZARNA",
      });
    }
    if (byouthClients[i]) {
      jobs.push({
        client: byouthClients[i],
        eventId: byouthEventId,
        entrance: "BYOUTH",
      });
    }
  }
  return jobs;
}

async function runPool(
  jobs: QueueJob[],
  concurrency: number
): Promise<QueueRequestResult[]> {
  const results: QueueRequestResult[] = new Array(jobs.length);
  let next = 0;

  async function worker() {
    while (true) {
      const index = next;
      next += 1;
      if (index >= jobs.length) return;

      const job = jobs[index];
      try {
        const result = await requestQueueNumber(
          job.client.id,
          job.eventId,
          job.client.boothNumber
        );
        results[index] = {
          entrance: job.entrance,
          email: job.client.email,
          boothNumber: job.client.boothNumber,
          queueNumber: result.ticket?.queueNumber ?? null,
          qrToken: result.ticket?.qrToken ?? null,
          error: result.error ?? null,
        };
      } catch (error) {
        results[index] = {
          entrance: job.entrance,
          email: job.client.email,
          boothNumber: job.client.boothNumber,
          queueNumber: null,
          qrToken: null,
          error: String(error),
        };
      }
    }
  }

  const workers = Math.max(1, Math.min(concurrency, jobs.length));
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

export async function fireAllEntrancesAtOnce(
  bazarnaClients: ClientWithBooth[],
  byouthClients: ClientWithBooth[],
  bazarnaEventId: string,
  byouthEventId: string,
  concurrency = 8
): Promise<QueueRequestResult[]> {
  await persistBoothNumbers([...bazarnaClients, ...byouthClients]);

  await Promise.all([
    resetQueue(bazarnaEventId),
    resetQueue(byouthEventId),
  ]);

  const jobs = interleaveJobs(
    bazarnaClients,
    byouthClients,
    bazarnaEventId,
    byouthEventId
  );

  return runPool(jobs, concurrency);
}
