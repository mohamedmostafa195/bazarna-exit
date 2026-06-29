import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getActiveEvent, getQueueStats } from "@/lib/queue";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const event = await getActiveEvent();
  if (!event) {
    return NextResponse.json({ event: null, stats: null });
  }

  const stats = await getQueueStats(event.id);

  return NextResponse.json({
    event: {
      id: event.id,
      eventName: event.eventName,
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
  });
}
