import { NextResponse } from "next/server";
import { getActiveEvent, getQueueStats } from "@/lib/queue";
import { getEntranceFromRequest } from "@/lib/entrance-server";
import { withApiHandler } from "@/lib/api-error";

export async function GET(request: Request) {
  return withApiHandler(async () => {
  const entranceType = getEntranceFromRequest(request) ?? "BAZARNA";
  const event = await getActiveEvent(entranceType);

  if (!event) {
    return NextResponse.json({
      event: null,
      entranceType,
      currentServing: null,
      upcoming: [],
    });
  }

  const stats = await getQueueStats(event.id);

  return NextResponse.json({
    event: {
      id: event.id,
      eventName: event.eventName,
      entranceType: event.entranceType,
    },
    entranceType,
    currentServing: stats.currentServing,
    currentBrand: stats.calledTicket?.user.brandName ?? null,
    currentBooth: stats.calledTicket?.user.boothNumber ?? null,
    upcoming: stats.upcoming,
    totalWaiting: stats.totalWaiting,
    totalCompleted: stats.totalCompleted,
  });
  }, "GET /api/display");
}
