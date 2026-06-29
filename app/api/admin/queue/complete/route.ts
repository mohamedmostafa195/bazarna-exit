import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getActiveEvent, markCompleted } from "@/lib/queue";
import { logAction } from "@/lib/action-log";
import { getEntranceFromRequest } from "@/lib/entrance-server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const { ticketId } = body;
  if (!ticketId) {
    return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });
  }

  const entranceType = getEntranceFromRequest(request) ?? "BAZARNA";
  const event = await getActiveEvent(entranceType);
  if (!event) {
    return NextResponse.json({ error: "No active event" }, { status: 404 });
  }

  const ticket = await prisma.queueTicket.findUnique({
    where: { id: ticketId },
    include: { user: { select: { brandName: true } } },
  });

  const result = await markCompleted(ticketId, event.id);
  if (result.error) {
    return NextResponse.json(
      { error: result.error, alreadyCompleted: result.alreadyCompleted },
      { status: result.alreadyCompleted ? 409 : 400 }
    );
  }

  await logAction({
    action: "COMPLETED",
    entranceType: event.entranceType,
    eventId: event.id,
    actorName: session!.user.name ?? session!.user.email,
    brandName: ticket?.user.brandName,
    queueNumber: ticket?.queueNumber,
    details: `Completed #${ticket?.queueNumber}${ticket?.user.brandName ? ` — ${ticket.user.brandName}` : ""}`,
  });

  return NextResponse.json({ success: true });
}
