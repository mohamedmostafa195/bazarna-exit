import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getActiveEvent, getQueueStats } from "@/lib/queue";

export async function GET() {
  const event = await getActiveEvent();
  if (!event) {
    return NextResponse.json({
      event: null,
      currentServing: null,
      upcoming: [],
    });
  }

  const stats = await getQueueStats(event.id);

  return NextResponse.json({
    event: {
      id: event.id,
      eventName: event.eventName,
    },
    currentServing: stats.currentServing,
    upcoming: stats.upcoming,
    totalWaiting: stats.totalWaiting,
    totalCompleted: stats.totalCompleted,
  });
}
