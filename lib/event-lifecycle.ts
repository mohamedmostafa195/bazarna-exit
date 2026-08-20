import { prisma } from "@/lib/prisma";
import { getActiveEvent, resetQueue } from "@/lib/queue";
import { toDateInputValue } from "@/lib/datetime";

/** True when the stored event date is before today (UTC calendar day). */
export function isEventDayPassed(eventDate: Date, now = new Date()): boolean {
  return toDateInputValue(eventDate) < toDateInputValue(now);
}

/**
 * Clear queue tickets and numbering when a new calendar day starts.
 * Ensures brands can get fresh #1, #2… on the next event day.
 */
export async function resetQueueIfEventDayPassed(
  event: { id: string; eventDate: Date }
): Promise<boolean> {
  if (!isEventDayPassed(event.eventDate)) {
    return false;
  }

  await resetQueue(event.id);
  return true;
}

export async function getActiveEventReady(entranceType?: string | null) {
  // Single query: get the active event with its zones in one DB round-trip.
  const event = await prisma.event.findFirst({
    where: {
      isActive: true,
      ...(entranceType ? { entranceType } : {}),
    },
    orderBy: { eventDate: "desc" },
    include: { zones: { orderBy: { name: "asc" } } },
  });

  if (!event) return null;

  // Reset tickets if the event day has passed (rare path, only fires once per day).
  if (isEventDayPassed(event.eventDate)) {
    await resetQueue(event.id);
    // Reload so currentServingNumber / nextQueueNumber reflect the reset.
    return prisma.event.findUnique({
      where: { id: event.id },
      include: { zones: { orderBy: { name: "asc" } } },
    });
  }

  return event;
}
