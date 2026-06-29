import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getActiveEvent, getQueueStats } from "@/lib/queue";

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const status = searchParams.get("status");
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  const event = eventId
    ? await import("@/lib/prisma").then(({ prisma }) =>
        prisma.event.findUnique({ where: { id: eventId } })
      )
    : await getActiveEvent();

  if (!event) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  const stats = await getQueueStats(event.id);

  let tickets = stats.tickets;

  if (status && status !== "all") {
    tickets = tickets.filter((t) => t.status === status.toUpperCase());
  }

  if (search) {
    const q = search.toLowerCase();
    tickets = tickets.filter(
      (t) =>
        t.user.brandName.toLowerCase().includes(q) ||
        t.user.boothNumber.toLowerCase().includes(q) ||
        String(t.queueNumber).includes(q)
    );
  }

  const total = tickets.length;
  const offset = (page - 1) * limit;
  const paginated = tickets.slice(offset, offset + limit);

  return NextResponse.json({
    event: {
      id: event.id,
      eventName: event.eventName,
      queueOpenTime: event.queueOpenTime,
      queueCloseTime: event.queueCloseTime,
      currentServingNumber: event.currentServingNumber,
    },
    tickets: paginated.map((t) => ({
      id: t.id,
      queueNumber: t.queueNumber,
      status: t.status,
      brandName: t.user.brandName,
      boothNumber: t.user.boothNumber,
      requestedAt: t.requestedAt,
      calledAt: t.calledAt,
      completedAt: t.completedAt,
      qrToken: t.qrToken,
    })),
    stats: {
      currentServing: stats.currentServing,
      upcoming: stats.upcoming,
      totalWaiting: stats.totalWaiting,
      totalCompleted: stats.totalCompleted,
      total: stats.tickets.length,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
