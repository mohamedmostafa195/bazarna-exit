import { NextResponse } from "next/server";
import { requireBrand } from "@/lib/auth-helpers";
import { getActiveEvent, requestQueueNumber } from "@/lib/queue";
import { logAction } from "@/lib/action-log";
import { getQueueWindowState, getTicketUrl } from "@/lib/utils";
import { sendQueueConfirmationEmail } from "@/lib/email";
import { resolveEntranceType } from "@/lib/entrance-server";
import { prisma } from "@/lib/prisma";
import { getEntranceLabel, isEntranceType } from "@/lib/entrance";
import { withApiHandler } from "@/lib/api-error";

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const { session, error } = await requireBrand();
    if (error) return error;

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

    const event = await getActiveEvent(entranceType);
    if (!event) {
      return NextResponse.json({ error: "No active event" }, { status: 404 });
    }

    const windowState = getQueueWindowState(
      event.queueOpenTime,
      event.queueCloseTime
    );

    if (windowState !== "open") {
      return NextResponse.json({ error: "Queue is not open" }, { status: 403 });
    }

    const result = await requestQueueNumber(session!.user.id, event.id);

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
      details: `Requested #${ticket.queueNumber} — ${brandName}`,
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
