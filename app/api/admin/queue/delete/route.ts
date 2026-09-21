import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { logAction } from "@/lib/action-log";
import { prisma } from "@/lib/prisma";
import { parseJsonBody, withApiHandler } from "@/lib/api-error";
import { scheduleQueueBroadcast } from "@/lib/queue";

async function handleDelete(request: Request) {
  const { session, error } = await requireAdmin(request);
  if (error) return error;

  const url = new URL(request.url);
  const queryTicketId = url.searchParams.get("ticketId");

  let ticketId = queryTicketId;
  if (!ticketId) {
    const body = await parseJsonBody<{ ticketId?: string }>(request).catch(
      () => ({}) as { ticketId?: string }
    );
    ticketId = body.ticketId ?? null;
  }

  if (!ticketId) {
    return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
  }

  const ticket = await prisma.queueTicket.findUnique({
    where: { id: ticketId },
    include: { user: true, event: true },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Delete the ticket
  await prisma.queueTicket.delete({
    where: { id: ticketId },
  });

  // If this ticket was currently being called, clear or reset current serving number
  if (ticket.event.currentServingNumber === ticket.queueNumber) {
    await prisma.event.update({
      where: { id: ticket.eventId },
      data: { currentServingNumber: null },
    });
  }

  // Broadcast update immediately to live dashboards and screens
  scheduleQueueBroadcast(ticket.eventId);

  const actorName = session!.user.name ?? session!.user.email ?? "Admin";

  await logAction({
    action: "TICKET_DELETED",
    entranceType: ticket.event.entranceType,
    eventId: ticket.eventId,
    actorName,
    brandName: ticket.user.brandName,
    queueNumber: ticket.queueNumber,
    details: `Deleted ticket #${ticket.queueNumber} for "${ticket.user.brandName}" (Booth ${ticket.user.boothNumber})`,
  });

  return NextResponse.json({
    success: true,
    deleted: {
      id: ticket.id,
      queueNumber: ticket.queueNumber,
      brandName: ticket.user.brandName,
    },
  });
}

export async function POST(request: Request) {
  return withApiHandler(() => handleDelete(request), "POST /api/admin/queue/delete");
}

export async function DELETE(request: Request) {
  return withApiHandler(() => handleDelete(request), "DELETE /api/admin/queue/delete");
}
