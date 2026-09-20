import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { logAction } from "@/lib/action-log";
import { prisma } from "@/lib/prisma";
import { parseJsonBody, withApiHandler } from "@/lib/api-error";
import { normalizeBoothCode } from "@/lib/booth-validation";

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const { session, error } = await requireAdmin(request);
    if (error) return error;

    const body = await parseJsonBody<{
      ticketId?: string;
      brandName?: string;
      boothNumber?: string;
    }>(request);

    const { ticketId, brandName, boothNumber } = body;
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

    const newBrandName = brandName !== undefined ? brandName.trim() : ticket.user.brandName;
    const newBoothRaw = boothNumber !== undefined ? boothNumber.trim() : ticket.user.boothNumber;
    const newBoothNumber = normalizeBoothCode(newBoothRaw) || newBoothRaw.toUpperCase();

    if (!newBrandName) {
      return NextResponse.json({ error: "Brand name cannot be empty" }, { status: 400 });
    }
    if (!newBoothNumber) {
      return NextResponse.json({ error: "Booth number cannot be empty" }, { status: 400 });
    }

    // Update user associated with this ticket
    const updatedUser = await prisma.user.update({
      where: { id: ticket.userId },
      data: {
        brandName: newBrandName,
        boothNumber: newBoothNumber,
      },
    });

    await logAction({
      action: "TICKET_EDIT",
      entranceType: ticket.event.entranceType,
      eventId: ticket.eventId,
      actorName: session!.user.name ?? session!.user.email,
      brandName: newBrandName,
      queueNumber: ticket.queueNumber,
      details: `Edited #${ticket.queueNumber}: Brand "${ticket.user.brandName}" → "${newBrandName}", Booth "${ticket.user.boothNumber}" → "${newBoothNumber}"`,
    });

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        queueNumber: ticket.queueNumber,
        brandName: updatedUser.brandName,
        boothNumber: updatedUser.boothNumber,
      },
    });
  }, "POST /api/admin/queue/edit");
}
