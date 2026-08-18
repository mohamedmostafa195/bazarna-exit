import { prisma } from "../../lib/prisma";
import type { ZoneConfig } from "../../lib/booth-validation";
import { deactivateSiblingEvents } from "../../lib/event-admin";
import { LOADTEST } from "./config";
import { withDbRetry } from "./db-retry";
import { info, success } from "./logger";

export interface LoadTestEvent {
  id: string;
  entranceType: "BAZARNA" | "BYOUTH";
  eventName: string;
  zones: ZoneConfig[];
}

function queueWindow() {
  const now = new Date();
  return {
    eventDate: now,
    queueOpenTime: new Date(now.getTime() - 60 * 60 * 1000),
    queueCloseTime: new Date(now.getTime() + 8 * 60 * 60 * 1000),
  };
}

async function createEvent(
  entranceType: "BAZARNA" | "BYOUTH",
  eventName: string,
  zones: ZoneConfig[]
): Promise<LoadTestEvent> {
  const window = queueWindow();

  await withDbRetry(`Deactivate old ${entranceType} load-test events`, () =>
    prisma.event.updateMany({
      where: { entranceType, eventName: { startsWith: LOADTEST.eventTag } },
      data: { isActive: false },
    })
  );

  const event = await withDbRetry(`Create ${eventName}`, () =>
    prisma.event.create({
      data: {
        eventName,
        entranceType,
        eventDate: window.eventDate,
        queueOpenTime: window.queueOpenTime,
        queueCloseTime: window.queueCloseTime,
        isActive: true,
        nextQueueNumber: 1,
        currentServingNumber: null,
        zones: {
          create: zones.map((z) => ({
            name: z.name.trim().toUpperCase(),
            limit: z.limit,
          })),
        },
      },
      include: { zones: { orderBy: { name: "asc" } } },
    })
  );

  await deactivateSiblingEvents(entranceType, event.id);

  return {
    id: event.id,
    entranceType,
    eventName: event.eventName,
    zones: event.zones.map((z) => ({ name: z.name, limit: z.limit })),
  };
}

/** Two active events (Bazarna + Byouth) with the same queue window and zone limits. */
export async function createLoadTestEvents(
  bazarnaZones: ZoneConfig[],
  byouthZones: ZoneConfig[]
): Promise<{ bazarna: LoadTestEvent; byouth: LoadTestEvent }> {
  info("Creating Bazarna event with zones…");
  const bazarna = await createEvent(
    "BAZARNA",
    `${LOADTEST.eventTag} Bazarna`,
    bazarnaZones
  );
  info(
    `  Zones: ${bazarna.zones.map((z) => `${z.name}(1–${z.limit})`).join(", ")}`
  );

  info("Creating Byouth event with zones…");
  const byouth = await createEvent(
    "BYOUTH",
    `${LOADTEST.eventTag} Byouth`,
    byouthZones
  );
  info(
    `  Zones: ${byouth.zones.map((z) => `${z.name}(1–${z.limit})`).join(", ")}`
  );

  success("Both events are active with the same queue window");
  return { bazarna, byouth };
}
