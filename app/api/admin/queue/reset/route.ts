import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getActiveEvent, resetQueue } from "@/lib/queue";
import { logAction } from "@/lib/action-log";
import { getEntranceFromRequest } from "@/lib/entrance-server";

export async function POST(request: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const entranceType = getEntranceFromRequest(request) ?? "BAZARNA";
  const event = await getActiveEvent(entranceType);
  if (!event) {
    return NextResponse.json({ error: "No active event" }, { status: 404 });
  }

  await resetQueue(event.id);

  await logAction({
    action: "QUEUE_RESET",
    entranceType: event.entranceType,
    eventId: event.id,
    actorName: session!.user.name ?? session!.user.email,
    details: `Reset queue for ${event.eventName}`,
  });

  return NextResponse.json({ success: true });
}
