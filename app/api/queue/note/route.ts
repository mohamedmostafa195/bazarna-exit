import { NextResponse } from "next/server";
import { requireBrand } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { parseJsonBody, withApiHandler } from "@/lib/api-error";
import { scheduleQueueBroadcast } from "@/lib/queue";
import { logAction } from "@/lib/action-log";

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const { session, error } = await requireBrand(request);
    if (error) return error;

    const body = await parseJsonBody<{ ticketId?: string; note?: string }>(
      request
    ).catch(() => ({}) as { ticketId?: string; note?: string });

    const rawNote = typeof body.note === "string" ? body.note.trim() : "";
    const note = rawNote.length > 0 ? rawNote : null;

    let ticket = null;
    if (body.ticketId) {
      ticket = await prisma.queueTicket.findFirst({
        where: {
          id: body.ticketId,
          userId: session!.user.id,
        },
      });
    } else {
      // Find the most recent active ticket for this user
      ticket = await prisma.queueTicket.findFirst({
        where: {
          userId: session!.user.id,
          status: { in: ["WAITING", "CALLED", "COMPLETED"] },
        },
        orderBy: { requestedAt: "desc" },
      });
    }

    if (!ticket) {
      return NextResponse.json(
        { error: "No active ticket found to attach a note" },
        { status: 404 }
      );
    }

    const updated = await prisma.queueTicket.update({
      where: { id: ticket.id },
      data: { note },
      include: {
        user: { select: { brandName: true, boothNumber: true } },
        event: { select: { id: true, entranceType: true } },
      },
    });

    scheduleQueueBroadcast(ticket.eventId);

    if (note) {
      void logAction({
        action: "NOTE_SUBMITTED",
        entranceType: updated.event.entranceType,
        eventId: updated.event.id,
        brandName: updated.user.brandName,
        queueNumber: updated.queueNumber,
        details: `Note from ${updated.user.brandName} (Booth ${updated.user.boothNumber}): "${note}"`,
      }).catch((err) => console.error("Failed to log note:", err));
    }

    return NextResponse.json({
      success: true,
      note: updated.note,
    });
  }, "POST /api/queue/note");
}
