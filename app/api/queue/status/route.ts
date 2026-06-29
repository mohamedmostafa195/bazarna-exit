import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getActiveEvent } from "@/lib/queue";
import { getQueueWindowState } from "@/lib/utils";
import { resolveEntranceType } from "@/lib/entrance-server";
import { prisma } from "@/lib/prisma";
import { getEntranceLabel } from "@/lib/entrance";

export async function GET(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const entranceType = await resolveEntranceType(
    request,
    session!.user.entranceType
  );

  if (!entranceType && session!.user.role === "BRAND") {
    return NextResponse.json(
      { error: "Please select Bazarna or Byouth entrance first", needsEntrance: true },
      { status: 400 }
    );
  }

  const event = await getActiveEvent(entranceType);
  if (!event) {
    return NextResponse.json({
      event: null,
      windowState: "closed" as const,
      entranceType,
      entranceLabel: entranceType ? getEntranceLabel(entranceType) : null,
    });
  }

  const windowState = getQueueWindowState(
    event.queueOpenTime,
    event.queueCloseTime
  );

  const ticket = await prisma.queueTicket.findUnique({
    where: {
      userId_eventId: {
        userId: session!.user.id,
        eventId: event.id,
      },
    },
  });

  return NextResponse.json({
    event: {
      id: event.id,
      eventName: event.eventName,
      entranceType: event.entranceType,
      queueOpenTime: event.queueOpenTime,
      queueCloseTime: event.queueCloseTime,
      eventDate: event.eventDate,
      currentServingNumber: event.currentServingNumber,
    },
    windowState,
    ticket,
    entranceType,
    entranceLabel: entranceType ? getEntranceLabel(entranceType) : null,
    user: {
      brandName: session!.user.brandName,
      boothNumber: session!.user.boothNumber,
    },
  });
}
