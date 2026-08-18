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
  eventId: string
): Promise<boolean> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || !isEventDayPassed(event.eventDate)) {
    return false;
  }

  await resetQueue(eventId);
  return true;
}

export async function getActiveEventReady(entranceType?: string | null) {
  const event = await getActiveEvent(entranceType);
  if (!event) return null;

  await resetQueueIfEventDayPassed(event.id);
  return prisma.event.findUnique({
    where: { id: event.id },
    include: { zones: { orderBy: { name: "asc" } } },
  });
}
