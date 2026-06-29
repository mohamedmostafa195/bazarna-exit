import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getActiveEvent, skipCurrentNumber } from "@/lib/queue";

import { getEntranceFromRequest } from "@/lib/entrance-server";

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const entranceType = getEntranceFromRequest(request) ?? "BAZARNA";
  const event = await getActiveEvent(entranceType);
  if (!event) {
    return NextResponse.json({ error: "No active event" }, { status: 404 });
  }

  const result = await skipCurrentNumber(event.id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
