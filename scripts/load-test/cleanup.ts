import { prisma } from "../../lib/prisma";
import { LOADTEST } from "./config";
import { withDbRetry } from "./db-retry";

const LOADTEST_EVENT_NAMES = [
  `${LOADTEST.eventTag} Bazarna`,
  `${LOADTEST.eventTag} Byouth`,
];

export async function cleanupLoadTestData() {
  await withDbRetry("Cleanup tickets", () =>
    prisma.queueTicket.deleteMany({
      where: {
        OR: [
          { event: { eventName: { in: LOADTEST_EVENT_NAMES } } },
          {
            user: {
              email: {
                endsWith: `@${LOADTEST.emailDomain}`,
              },
            },
          },
        ],
      },
    })
  );

  await withDbRetry("Cleanup event zones", () =>
    prisma.eventZone.deleteMany({
      where: { event: { eventName: { in: LOADTEST_EVENT_NAMES } } },
    })
  );

  await withDbRetry("Cleanup events", () =>
    prisma.event.deleteMany({
      where: { eventName: { in: LOADTEST_EVENT_NAMES } },
    })
  );

  await withDbRetry("Cleanup users", () =>
    prisma.user.deleteMany({
      where: {
        email: { endsWith: `@${LOADTEST.emailDomain}` },
      },
    })
  );
}
