import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getQueueWindowState } from "@/lib/utils";
import { getEntranceFromRequest } from "@/lib/entrance-server";
import { prisma } from "@/lib/prisma";
import { getEntranceLabel, isEntranceType, type EntranceType } from "@/lib/entrance";
import { withApiHandler } from "@/lib/api-error";
import { getActiveTicketInOtherEntrance } from "@/lib/queue";
import {
  getActiveEventReady,
  isEventDayPassed,
} from "@/lib/event-lifecycle";
import { normalizeBoothCode } from "@/lib/booth-validation";

function resolveEntranceFromRequest(
  request: Request,
  sessionEntrance?: string | null
): EntranceType | null {
  const fromRequest = getEntranceFromRequest(request);
  if (fromRequest) return fromRequest;
  if (sessionEntrance && isEntranceType(sessionEntrance)) {
    return sessionEntrance;
  }
  return null;
}

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const { session, error } = await requireAuth(request);
    if (error) return error;

    const entranceType = resolveEntranceFromRequest(
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

    const ticket = await prisma.queueTicket.findUnique({
      where: {
        userId_eventId: {
          userId: session!.user.id,
          eventId: event.id,
        },
      },
    });

    // Already has a ticket — skip booth + other-entrance lookups.
    if (ticket) {
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
        otherEntranceTicket: null,
        occupiedBooths: [],
        entranceType,
        entranceLabel: entranceType ? getEntranceLabel(entranceType) : null,
        eventDayPassed,
        queueEndedToday,
        user,
      });
    }

    const needsOccupiedBooths =
      windowState === "open" && !eventDayPassed;

    const [activeTickets, otherTicket] = await Promise.all([
      needsOccupiedBooths
        ? prisma.queueTicket.findMany({
            where: {
              eventId: event.id,
              userId: { not: session!.user.id },
              status: { in: ["WAITING", "CALLED"] },
            },
            select: { user: { select: { boothNumber: true } } },
          })
        : Promise.resolve([]),
      getActiveTicketInOtherEntrance(
        session!.user.id,
        event.entranceType
      ),
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
      ticket: null,
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
