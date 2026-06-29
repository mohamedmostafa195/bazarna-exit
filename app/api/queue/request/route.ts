import { NextResponse } from "next/server";
import { requireBrand } from "@/lib/auth-helpers";
import { getActiveEvent, requestQueueNumber } from "@/lib/queue";
import { getQueueWindowState, getTicketUrl } from "@/lib/utils";
import { sendQueueConfirmationEmail } from "@/lib/email";
import { resolveEntranceType } from "@/lib/entrance-server";
import { prisma } from "@/lib/prisma";
import { getEntranceLabel, isEntranceType } from "@/lib/entrance";

export async function POST(request: Request) {
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
    return NextResponse.json(
      { error: "Queue is not open" },
      { status: 403 }
    );
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

  const user = await prisma.user.findUnique({ where: { id: ticket.userId } });
  const eventRecord = await prisma.event.findUnique({
    where: { id: ticket.eventId },
  });

  await sendQueueConfirmationEmail({
    to: session!.user.email!,
    brandName: user?.brandName ?? session!.user.brandName,
    queueNumber: ticket.queueNumber,
    eventName: eventRecord?.eventName ?? event.eventName,
    entranceLabel: isEntranceType(event.entranceType)
      ? getEntranceLabel(event.entranceType)
      : "Exit",
    ticketUrl,
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
  });
}
