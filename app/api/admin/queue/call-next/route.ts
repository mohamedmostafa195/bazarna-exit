import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getActiveEvent, callNextNumber } from "@/lib/queue";

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  const event = await getActiveEvent();
  if (!event) {
    return NextResponse.json({ error: "No active event" }, { status: 404 });
  }

  const result = await callNextNumber(event.id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
