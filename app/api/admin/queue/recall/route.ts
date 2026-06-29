import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getActiveEvent, recallNumber } from "@/lib/queue";

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const queueNumber = parseInt(body.queueNumber, 10);
  if (!queueNumber || isNaN(queueNumber)) {
    return NextResponse.json({ error: "Invalid queue number" }, { status: 400 });
  }

  const event = await getActiveEvent();
  if (!event) {
    return NextResponse.json({ error: "No active event" }, { status: 404 });
  }

  await recallNumber(event.id, queueNumber);
  return NextResponse.json({ success: true });
}
