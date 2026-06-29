import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getActiveEvent, resetQueue } from "@/lib/queue";

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  const event = await getActiveEvent();
  if (!event) {
    return NextResponse.json({ error: "No active event" }, { status: 404 });
  }

  await resetQueue(event.id);
  return NextResponse.json({ success: true });
}
