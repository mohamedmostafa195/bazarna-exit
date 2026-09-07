import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getActiveEvent, getQueueStats, scheduleQueueBroadcast } from "@/lib/queue";
import { getEntranceFromRequest } from "@/lib/entrance-server";
import { prisma } from "@/lib/prisma";
import { parseJsonBody, withApiHandler } from "@/lib/api-error";
import { logAction } from "@/lib/action-log";

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const entranceType = getEntranceFromRequest(request) ?? "BAZARNA";
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim().toLowerCase() ?? "";
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);

    const event = await getActiveEvent(entranceType);
    if (!event) {
      return NextResponse.json({
        event: null,
        feedback: [],
        pagination: { page: 1, limit, total: 0, totalPages: 1 },
      });
    }

    const stats = await getQueueStats(event.id);
    let items = stats.tickets
      .filter((t) => Boolean(t.note && t.note.trim().length > 0))
      .map((t) => ({
        id: t.id,
        queueNumber: t.queueNumber,
        status: t.status,
        brandName: t.user.brandName,
        boothNumber: t.user.boothNumber,
        representativeName: t.user.representativeName,
        requestedAt: t.requestedAt,
        calledAt: t.calledAt,
        completedAt: t.completedAt,
        qrToken: t.qrToken,
        note: t.note!,
      }));

    if (status && status !== "all") {
      items = items.filter((t) => t.status === status.toUpperCase());
    }

    if (search) {
      items = items.filter(
        (t) =>
          t.brandName.toLowerCase().includes(search) ||
          t.boothNumber.toLowerCase().includes(search) ||
          t.note.toLowerCase().includes(search) ||
          String(t.queueNumber).includes(search)
      );
    }

    const total = items.length;
    const offset = (page - 1) * limit;
    const paginated = items.slice(offset, offset + limit);

    return NextResponse.json({
      event: {
        id: event.id,
        eventName: event.eventName,
        entranceType: event.entranceType,
      },
      feedback: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  }, "GET /api/admin/feedback");
}

export async function DELETE(request: Request) {
  return withApiHandler(async () => {
    const { error, session } = await requireAdmin(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    let ticketId = searchParams.get("ticketId");

    if (!ticketId) {
      const body = await parseJsonBody<{ ticketId?: string }>(request).catch(
        () => ({}) as { ticketId?: string }
      );
      ticketId = body.ticketId ?? null;
    }

    if (!ticketId) {
      return NextResponse.json(
        { error: "Ticket ID is required" },
        { status: 400 }
      );
    }

    const ticket = await prisma.queueTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { brandName: true, boothNumber: true } },
        event: { select: { id: true, entranceType: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const previousNote = ticket.note;

    // Clear the note from the ticket
    await prisma.queueTicket.update({
      where: { id: ticketId },
      data: { note: null },
    });

    scheduleQueueBroadcast(ticket.eventId);

    const actor = session?.user?.name ?? session?.user?.email ?? "Admin";
    void logAction({
      action: "NOTE_DELETED",
      actorName: actor,
      entranceType: ticket.event.entranceType,
      eventId: ticket.event.id,
      brandName: ticket.user.brandName,
      queueNumber: ticket.queueNumber,
      details: `Admin deleted note for ${ticket.user.brandName} (Booth ${ticket.user.boothNumber}): "${previousNote ?? ""}"`,
    }).catch((err) => console.error("Failed to log note deletion:", err));

    return NextResponse.json({ success: true });
  }, "DELETE /api/admin/feedback");
}
