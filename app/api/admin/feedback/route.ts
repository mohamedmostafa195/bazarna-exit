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
