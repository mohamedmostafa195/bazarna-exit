import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { logAction } from "@/lib/action-log";
import { prisma } from "@/lib/prisma";
import { parseJsonBody, withApiHandler } from "@/lib/api-error";
import { normalizeBoothCode } from "@/lib/booth-validation";

import { scheduleQueueBroadcast } from "@/lib/queue";

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const { session, error } = await requireAdmin(request);
    if (error) return error;

    const body = await parseJsonBody<{
      ticketId?: string;
      userId?: string;
      brandName?: string;
      boothNumber?: string;
      status?: string;
    }>(request);

    const { ticketId, userId, brandName, boothNumber, status } = body;
    if (!ticketId) {
      return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });
    }

    const ticket = await prisma.queueTicket.findUnique({
      where: { id: ticketId },
      include: { user: true, event: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const targetUserId = userId || ticket.userId;

    if (userId && userId !== ticket.userId) {
      const existing = await prisma.queueTicket.findUnique({
        where: {
          userId_eventId: {
            userId,
            eventId: ticket.eventId,
          },
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Selected brand already has a ticket for this event" },
          { status: 400 }
        );
      }
    }

    const targetUser =
      targetUserId === ticket.userId
        ? ticket.user
        : await prisma.user.findUnique({ where: { id: targetUserId } });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newBrandName = brandName !== undefined ? brandName.trim() : targetUser.brandName;
    const newBoothRaw = boothNumber !== undefined ? boothNumber.trim() : targetUser.boothNumber;
    const newBoothNumber = normalizeBoothCode(newBoothRaw) || newBoothRaw.toUpperCase();

    if (!newBrandName) {
      return NextResponse.json({ error: "Brand name cannot be empty" }, { status: 400 });
    }
    if (!newBoothNumber) {
      return NextResponse.json({ error: "Booth number cannot be empty" }, { status: 400 });
    }

    // Update user associated with this ticket
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        brandName: newBrandName,
        boothNumber: newBoothNumber,
      },
    });

    // If account was switched, reassign ticket
    if (targetUserId !== ticket.userId) {
      await prisma.queueTicket.update({
        where: { id: ticket.id },
        data: { userId: targetUserId },
      });
    }

    // Update ticket status if provided
    let updatedTicket = ticket;
    const validStatuses = ["WAITING", "CALLED", "COMPLETED"];
    if (status && validStatuses.includes(status.toUpperCase()) && status.toUpperCase() !== ticket.status) {
      const newStatus = status.toUpperCase();
      updatedTicket = await prisma.queueTicket.update({
        where: { id: ticket.id },
        data: {
          status: newStatus,
          calledAt: newStatus === "CALLED" ? (ticket.calledAt ?? new Date()) : (newStatus === "WAITING" ? null : ticket.calledAt),
          completedAt: newStatus === "COMPLETED" ? (ticket.completedAt ?? new Date()) : null,
        },
        include: { user: true, event: true },
      });

      // Synchronize currentServingNumber on Event
      if (newStatus === "CALLED") {
        await prisma.event.update({
          where: { id: ticket.eventId },
          data: { currentServingNumber: ticket.queueNumber },
        });
      } else if (ticket.event.currentServingNumber === ticket.queueNumber && newStatus !== "CALLED") {
        await prisma.event.update({
          where: { id: ticket.eventId },
          data: { currentServingNumber: null },
        });
      }
    }

    // Broadcast update immediately to screens
    scheduleQueueBroadcast(ticket.eventId);

    await logAction({
      action: "TICKET_EDIT",
      entranceType: ticket.event.entranceType,
      eventId: ticket.eventId,
      actorName: session!.user.name ?? session!.user.email,
      brandName: newBrandName,
      queueNumber: ticket.queueNumber,
      details: `Edited #${ticket.queueNumber}: Brand "${ticket.user.brandName}" → "${newBrandName}", Booth "${ticket.user.boothNumber}" → "${newBoothNumber}"${status ? `, Status: ${updatedTicket.status}` : ""}`,
    });

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        queueNumber: ticket.queueNumber,
        status: updatedTicket.status,
        brandName: updatedUser.brandName,
        boothNumber: updatedUser.boothNumber,
      },
    });
  }, "POST /api/admin/queue/edit");
}
