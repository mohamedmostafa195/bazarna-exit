import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getActiveEvent, getQueueStats } from "@/lib/queue";
import { getEntranceFromRequest } from "@/lib/entrance-server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/api-error";

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const { error } = await requireAdmin(request);
    if (error) return error;

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const entranceType = getEntranceFromRequest(request) ?? "BAZARNA";
  const status = searchParams.get("status");
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  const event = eventId
    ? await prisma.event.findUnique({
        where: { id: eventId },
        include: { zones: { orderBy: { name: "asc" } } },
      })
    : await prisma.event.findFirst({
        where: {
          isActive: true,
          ...(entranceType ? { entranceType } : {}),
        },
        orderBy: { eventDate: "desc" },
        include: { zones: { orderBy: { name: "asc" } } },
      });

  if (!event) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  const stats = await getQueueStats(event.id);

  let tickets = stats.tickets;

  if (status === "notes") {
    tickets = tickets.filter((t) => Boolean(t.note && t.note.trim().length > 0));
  } else if (status && status !== "all") {
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

  // Fetch booth-brand mappings for this event
  const boothBrandRows = await prisma.$queryRawUnsafe<
    { booth_code: string; brand_name: string }[]
  >(
    `SELECT booth_code, brand_name FROM event_booth_brands WHERE event_id = $1`,
    event.id
  ).catch(() => []);

  const boothBrands: Record<string, string> = {};
  for (const row of boothBrandRows) {
    boothBrands[row.booth_code] = row.brand_name;
  }

  const occupiedBooths = tickets.map((t) => t.user.boothNumber).filter(Boolean);

  return NextResponse.json({
    event: {
      id: event.id,
      eventName: event.eventName,
      entranceType: event.entranceType,
      queueOpenTime: event.queueOpenTime,
      queueCloseTime: event.queueCloseTime,
      currentServingNumber: event.currentServingNumber,
      zones: event.zones,
    },
    boothBrands,
    occupiedBooths,
    tickets: paginated.map((t) => ({
      id: t.id,
      userId: t.userId,
      queueNumber: t.queueNumber,
      status: t.status,
      brandName: t.user.brandName,
      boothNumber: t.user.boothNumber,
      requestedAt: t.requestedAt,
      calledAt: t.calledAt,
      completedAt: t.completedAt,
      qrToken: t.qrToken,
      note: t.note,
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
  }, "GET /api/admin/queue");
}
