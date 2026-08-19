import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getQueueWindowState } from "@/lib/utils";
import { resolveEntranceType } from "@/lib/entrance-server";
import { prisma } from "@/lib/prisma";
import { getEntranceLabel, isEntranceType, type EntranceType } from "@/lib/entrance";
import { withApiHandler } from "@/lib/api-error";
import { getActiveTicketInOtherEntrance } from "@/lib/queue";
import {
  getActiveEventReady,
  isEventDayPassed,
} from "@/lib/event-lifecycle";
import { normalizeBoothCode } from "@/lib/booth-validation";

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const { session, error } = await requireAuth(request);
    if (error) return error;

    const entranceType = await resolveEntranceType(
      request,
      session!.user.entranceType
    );

    const user = {
      brandName: session!.user.brandName,
      boothNumber: session!.user.boothNumber,
    };

    if (!entranceType && session!.user.role === "BRAND") {
      return NextResponse.json(
        {
          error: "Please select Bazarna or Byouth entrance first",
          needsEntrance: true,
        },
        { status: 400 }
      );
    }

    const event = await getActiveEventReady(entranceType);
    if (!event) {
      return NextResponse.json({
        event: null,
        windowState: "closed" as const,
        entranceType,
        entranceLabel: entranceType ? getEntranceLabel(entranceType) : null,
        eventDayPassed: false,
        queueEndedToday: false,
        user,
      });
    }

    const windowState = getQueueWindowState(
      event.queueOpenTime,
      event.queueCloseTime
    );
    const eventDayPassed = isEventDayPassed(event.eventDate);
    const queueEndedToday = windowState === "closed" && !eventDayPassed;

    const [ticket, activeEvents] = await Promise.all([
      prisma.queueTicket.findUnique({
        where: {
          userId_eventId: {
            userId: session!.user.id,
            eventId: event.id,
          },
        },
      }),
      prisma.event.findMany({
        where: { isActive: true },
        select: { id: true },
      }),
    ]);

    const activeEventIds = activeEvents.map((e) => e.id);

    const [otherTicket, activeTickets] = await Promise.all([
      !ticket
        ? getActiveTicketInOtherEntrance(session!.user.id, event.id)
        : Promise.resolve(null),
      prisma.queueTicket.findMany({
        where: {
          eventId: { in: activeEventIds.length > 0 ? activeEventIds : [event.id] },
          userId: { not: session!.user.id },
        },
        select: {
          user: {
            select: { boothNumber: true },
          },
        },
      }),
    ]);

    let otherEntranceTicket = null;
    if (otherTicket && isEntranceType(otherTicket.event.entranceType)) {
      otherEntranceTicket = {
        id: otherTicket.id,
        queueNumber: otherTicket.queueNumber,
        status: otherTicket.status,
        qrToken: otherTicket.qrToken,
        entranceType: otherTicket.event.entranceType as EntranceType,
        entranceLabel: getEntranceLabel(otherTicket.event.entranceType),
        eventName: otherTicket.event.eventName,
      };
    }

    const occupiedBooths = Array.from(
      new Set(
        activeTickets
          .map((t) => normalizeBoothCode(t.user.boothNumber))
          .filter((b): b is string => Boolean(b))
      )
    );

    return NextResponse.json({
      event: {
        id: event.id,
        eventName: event.eventName,
        entranceType: event.entranceType,
        queueOpenTime: event.queueOpenTime,
        queueCloseTime: event.queueCloseTime,
        eventDate: event.eventDate,
        currentServingNumber: event.currentServingNumber,
        zones: event.zones ?? [],
      },
      windowState,
      ticket,
      otherEntranceTicket,
      occupiedBooths,
      entranceType,
      entranceLabel: entranceType ? getEntranceLabel(entranceType) : null,
      eventDayPassed,
      queueEndedToday,
      user,
    });
  }, "GET /api/queue/status");
}
