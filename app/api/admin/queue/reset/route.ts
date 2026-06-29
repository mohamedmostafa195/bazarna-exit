import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getActiveEvent, resetQueue } from "@/lib/queue";

import { getEntranceFromRequest } from "@/lib/entrance-server";

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const entranceType = getEntranceFromRequest(request) ?? "BAZARNA";
  const event = await getActiveEvent(entranceType);
  if (!event) {
    return NextResponse.json({ error: "No active event" }, { status: 404 });
  }

  await resetQueue(event.id);
  return NextResponse.json({ success: true });
}
