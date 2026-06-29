import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getActiveEvent, markCompleted } from "@/lib/queue";
import { getEntranceFromRequest } from "@/lib/entrance-server";

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const { ticketId } = body;
  if (!ticketId) {
    return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });
  }

  const entranceType = getEntranceFromRequest(request) ?? "BAZARNA";
  const event = await getActiveEvent(entranceType);
  if (!event) {
    return NextResponse.json({ error: "No active event" }, { status: 404 });
  }

  const result = await markCompleted(ticketId, event.id);
  if (result.error) {
    return NextResponse.json(
      { error: result.error, alreadyCompleted: result.alreadyCompleted },
      { status: result.alreadyCompleted ? 409 : 400 }
    );
  }

  return NextResponse.json({ success: true });
}
