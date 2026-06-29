import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getActiveEvent } from "@/lib/queue";
import { getQueueWindowState } from "@/lib/utils";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const event = await getActiveEvent();
  if (!event) {
    return NextResponse.json({ event: null, windowState: "closed" as const });
  }

  const windowState = getQueueWindowState(
    event.queueOpenTime,
    event.queueCloseTime
  );

  const ticket = await import("@/lib/prisma").then(({ prisma }) =>
    prisma.queueTicket.findUnique({
      where: {
        userId_eventId: {
          userId: session!.user.id,
          eventId: event.id,
        },
      },
    })
  );

  return NextResponse.json({
    event: {
      id: event.id,
      eventName: event.eventName,
      queueOpenTime: event.queueOpenTime,
      queueCloseTime: event.queueCloseTime,
      eventDate: event.eventDate,
      currentServingNumber: event.currentServingNumber,
    },
    windowState,
    ticket,
    user: {
      brandName: session!.user.brandName,
      boothNumber: session!.user.boothNumber,
    },
  });
}
