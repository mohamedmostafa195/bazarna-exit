import { NextResponse } from "next/server";
import { requireBrand } from "@/lib/auth-helpers";
import { getActiveEventReady } from "@/lib/event-lifecycle";
import { getActiveTicketInOtherEntrance, requestQueueNumber } from "@/lib/queue";
import { logAction } from "@/lib/action-log";
import { getQueueWindowState, getTicketUrl } from "@/lib/utils";
import { sendQueueConfirmationEmail } from "@/lib/email";
import { resolveEntranceType } from "@/lib/entrance-server";
import { prisma } from "@/lib/prisma";
import { getEntranceLabel, isEntranceType } from "@/lib/entrance";
import { parseJsonBody, withApiHandler } from "@/lib/api-error";

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const { session, error } = await requireBrand(request);
    if (error) return error;

    const body = await parseJsonBody<{ boothNumber?: string }>(request).catch(
      () => ({}) as { boothNumber?: string }
    );
    const boothNumber = body.boothNumber?.trim();

    if (!boothNumber) {
      return NextResponse.json(
        { error: "Please enter your booth number before requesting an exit number" },
        { status: 400 }
      );
    }

    const entranceType = await resolveEntranceType(
      request,
      session!.user.entranceType
    );

    if (!entranceType) {
      return NextResponse.json(
        { error: "Please select Bazarna or Byouth entrance first" },
        { status: 400 }
      );
    }

    let finalBoothNumber = boothNumber;

    // Strict validation for Byouth: must be number + Y (e.g. 1Y, 14Y, 105Y)
    if (entranceType === "BYOUTH") {
      const byouthPattern = /^(\d+)[yY]$/;
      const match = boothNumber.match(byouthPattern);
      if (!match) {
        return NextResponse.json(
          {
            error: "For Byouth exit, booth number must be a number followed by Y (e.g. 1Y, 10Y, 20Y)",
          },
          { status: 400 }
        );
      }
      finalBoothNumber = `${match[1]}Y`;
    }

    const event = await getActiveEventReady(entranceType);
    if (!event) {
      return NextResponse.json({ error: "No active event" }, { status: 404 });
    }

    const otherTicket = await getActiveTicketInOtherEntrance(
      session!.user.id,
      event.id
    );

    if (otherTicket && isEntranceType(otherTicket.event.entranceType)) {
      const label = getEntranceLabel(otherTicket.event.entranceType);
      return NextResponse.json(
        {
          error: `You already have an active exit number (#${otherTicket.queueNumber}) in ${label} Exit. Each brand can only join one exit queue.`,
        },
        { status: 400 }
      );
    }

    // Check if another brand already has an active ticket with this booth number
    const activeEvents = await prisma.event.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    const activeEventIds = activeEvents.map((e) => e.id);

    const duplicateBooth = await prisma.queueTicket.findFirst({
      where: {
        eventId: { in: activeEventIds.length > 0 ? activeEventIds : [event.id] },
        userId: { not: session!.user.id },
        user: {
          boothNumber: {
            equals: finalBoothNumber,
            mode: "insensitive",
          },
        },
      },
      include: { user: { select: { brandName: true } } },
    });

    if (duplicateBooth) {
      return NextResponse.json(
        {
          error: `Booth number "${finalBoothNumber}" is already used by "${duplicateBooth.user.brandName}". Please enter your correct booth number.`,
        },
        { status: 409 }
      );
    }

    // Update the brand user's booth number in DB for this event
    await prisma.user.update({
      where: { id: session!.user.id },
      data: { boothNumber: finalBoothNumber },
    });

    const windowState = getQueueWindowState(
      event.queueOpenTime,
      event.queueCloseTime
    );

    if (windowState !== "open") {
      return NextResponse.json({ error: "Queue is not open" }, { status: 403 });
    }

    const result = await requestQueueNumber(session!.user.id, event.id, finalBoothNumber);

    if (result.error) {
      if (result.ticket) {
        return NextResponse.json(
          { error: result.error, ticket: result.ticket },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const ticket = result.ticket!;
    const ticketUrl = getTicketUrl(ticket.qrToken);
    const entranceLabel = isEntranceType(event.entranceType)
      ? getEntranceLabel(event.entranceType)
      : "Exit";

    const user = await prisma.user.findUnique({ where: { id: ticket.userId } });
    const brandName = user?.brandName ?? session!.user.brandName;

    // Don't block the response — email & logging run in the background.
    void sendQueueConfirmationEmail({
      to: session!.user.email!,
      brandName,
      queueNumber: ticket.queueNumber,
      eventName: event.eventName,
      entranceLabel,
      ticketUrl,
    }).catch((emailError) => {
      console.error("Email send failed (non-fatal):", emailError);
    });

    void logAction({
      action: "QUEUE_REQUESTED",
      entranceType: event.entranceType,
      eventId: event.id,
      brandName,
      queueNumber: ticket.queueNumber,
      details: `Requested #${ticket.queueNumber} — ${brandName} (Booth ${finalBoothNumber})`,
    }).catch((logError) => {
      console.error("Action log failed (non-fatal):", logError);
    });

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        queueNumber: ticket.queueNumber,
        status: ticket.status,
        qrToken: ticket.qrToken,
        requestedAt: ticket.requestedAt,
        ticketUrl,
      },
      entranceType: event.entranceType,
      entranceLabel,
    });
  }, "POST /api/queue/request");
}
