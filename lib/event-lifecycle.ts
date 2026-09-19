import { prisma } from "@/lib/prisma";
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
  _event: { id: string; eventDate: Date }
): Promise<boolean> {
  // Manual reset only via Admin Dashboard
  return false;
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

  return event;
}
