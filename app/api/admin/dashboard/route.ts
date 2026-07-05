import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getActiveEvent, getQueueStats } from "@/lib/queue";
import { getEntranceFromRequest } from "@/lib/entrance-server";
import { withApiHandler } from "@/lib/api-error";

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const { error } = await requireAdmin();
    if (error) return error;

  const entranceType = getEntranceFromRequest(request) ?? "BAZARNA";
  const event = await getActiveEvent(entranceType);

  if (!event) {
    return NextResponse.json({
      event: null,
      stats: null,
      entranceType,
    });
  }

  const stats = await getQueueStats(event.id);

  return NextResponse.json({
    event: {
      id: event.id,
      eventName: event.eventName,
      entranceType: event.entranceType,
      queueOpenTime: event.queueOpenTime,
      queueCloseTime: event.queueCloseTime,
      eventDate: event.eventDate,
      currentServingNumber: event.currentServingNumber,
    },
    stats: {
      currentServing: stats.currentServing,
      upcoming: stats.upcoming,
      totalWaiting: stats.totalWaiting,
      totalCompleted: stats.totalCompleted,
      total: stats.tickets.length,
    },
    entranceType,
  });
  }, "GET /api/admin/dashboard");
}
