import { prisma } from "@/lib/prisma";
import type { EntranceType } from "@/lib/entrance";

/** Keep only one active event per entrance type. */
export async function deactivateSiblingEvents(
  entranceType: EntranceType,
  keepEventId: string
) {
  await prisma.event.updateMany({
    where: {
      entranceType,
      isActive: true,
      id: { not: keepEventId },
    },
    data: { isActive: false },
  });
}

export async function ensureActiveEvent(entranceType: EntranceType) {
  const today = new Date();
  const openTime = new Date(today);
  openTime.setHours(9, 0, 0, 0);
  const closeTime = new Date(today);
  closeTime.setHours(23, 0, 0, 0);

  const defaultName =
    entranceType === "BAZARNA"
      ? "Bazarna Summer Market 2026"
      : "Byouth Festival 2026";

  let event = await prisma.event.findFirst({
    where: { entranceType, isActive: true },
    orderBy: { eventDate: "desc" },
  });

  if (!event) {
    event = await prisma.event.findFirst({
      where: { entranceType },
      orderBy: { eventDate: "desc" },
    });
  }

  if (event) {
    event = await prisma.event.update({
      where: { id: event.id },
      data: {
        isActive: true,
        queueOpenTime: openTime,
        queueCloseTime: closeTime,
        eventDate: today,
      },
    });
    await deactivateSiblingEvents(entranceType, event.id);
    return event;
  }

  await prisma.event.updateMany({
    where: { entranceType },
    data: { isActive: false },
  });

  return prisma.event.create({
    data: {
      eventName: defaultName,
      entranceType,
      eventDate: today,
      queueOpenTime: openTime,
      queueCloseTime: closeTime,
      isActive: true,
    },
  });
}

export async function ensureAllEntranceEvents() {
  const bazarna = await ensureActiveEvent("BAZARNA");
  const byouth = await ensureActiveEvent("BYOUTH");
  return { bazarna, byouth };
}
