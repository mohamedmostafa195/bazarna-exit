import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getActiveEvent, markCompleted } from "@/lib/queue";

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const { ticketId } = body;
  if (!ticketId) {
    return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });
  }

  const event = await getActiveEvent();
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
