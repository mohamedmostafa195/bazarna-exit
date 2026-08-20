import { prisma } from "../../lib/prisma";
import { markCompleted } from "../../lib/queue";
import type { QueueRequestResult } from "./run-queue";

export interface ScanResult {
  entrance: "BAZARNA" | "BYOUTH";
  qrToken: string;
  queueNumber: number | null;
  error: string | null;
  alreadyCompleted: boolean;
}

/** Same logic as POST /api/admin/scanner — lookup QR token and mark COMPLETED. */
async function scanExit(qrToken: string): Promise<{
  queueNumber: number | null;
  entrance: "BAZARNA" | "BYOUTH";
  error: string | null;
  alreadyCompleted: boolean;
}> {
  const ticket = await prisma.queueTicket.findUnique({
    where: { qrToken },
    include: {
      event: { select: { id: true, entranceType: true } },
    },
  });

  if (!ticket) {
    return {
      queueNumber: null,
      entrance: "BAZARNA",
      error: "Ticket not found",
      alreadyCompleted: false,
    };
  }

  const entrance = ticket.event.entranceType as "BAZARNA" | "BYOUTH";

  if (ticket.status === "COMPLETED") {
    return {
      queueNumber: ticket.queueNumber,
      entrance,
      error: "Already completed",
      alreadyCompleted: true,
    };
  }

  const result = await markCompleted(ticket.id, ticket.event.id);
  if (result.error && !result.alreadyCompleted) {
    return {
      queueNumber: ticket.queueNumber,
      entrance,
      error: result.error,
      alreadyCompleted: false,
    };
  }

  return {
    queueNumber: ticket.queueNumber,
    entrance,
    error: null,
    alreadyCompleted: Boolean(result.alreadyCompleted),
  };
}

async function runPool(
  jobs: QueueRequestResult[],
  concurrency: number
): Promise<ScanResult[]> {
  const results: ScanResult[] = new Array(jobs.length);
  let next = 0;

  async function worker() {
    while (true) {
      const index = next;
      next += 1;
      if (index >= jobs.length) return;

      const job = jobs[index];
      if (!job.qrToken) {
        results[index] = {
          entrance: job.entrance,
          qrToken: "",
          queueNumber: job.queueNumber,
          error: job.error ?? "No QR token",
          alreadyCompleted: false,
        };
        continue;
      }

      try {
        const outcome = await scanExit(job.qrToken);
        results[index] = {
          entrance: outcome.entrance,
          qrToken: job.qrToken,
          queueNumber: outcome.queueNumber,
          error: outcome.error,
          alreadyCompleted: outcome.alreadyCompleted,
        };
      } catch (error) {
        results[index] = {
          entrance: job.entrance,
          qrToken: job.qrToken,
          queueNumber: job.queueNumber,
          error: String(error),
          alreadyCompleted: false,
        };
      }
    }
  }

  const workers = Math.max(1, Math.min(concurrency, jobs.length));
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

/** Interleave Bazarna + Byouth scans like real admin scanning both entrances. */
function interleaveScans(results: QueueRequestResult[]): QueueRequestResult[] {
  const bazarna = results.filter(
    (r) => r.entrance === "BAZARNA" && r.qrToken
  );
  const byouth = results.filter((r) => r.entrance === "BYOUTH" && r.qrToken);
  const jobs: QueueRequestResult[] = [];
  const max = Math.max(bazarna.length, byouth.length);
  for (let i = 0; i < max; i++) {
    if (bazarna[i]) jobs.push(bazarna[i]);
    if (byouth[i]) jobs.push(byouth[i]);
  }
  return jobs;
}

export async function fireAllScansAtOnce(
  queueResults: QueueRequestResult[],
  concurrency = 8
): Promise<ScanResult[]> {
  const jobs = interleaveScans(queueResults);
  return runPool(jobs, concurrency);
}
