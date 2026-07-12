import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getActiveEvent, recallNumber } from "@/lib/queue";
import { logAction } from "@/lib/action-log";
import { getEntranceFromRequest } from "@/lib/entrance-server";
import { prisma } from "@/lib/prisma";
import { parseJsonBody, withApiHandler } from "@/lib/api-error";

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const { session, error } = await requireAdmin(request);
    if (error) return error;

    const body = await parseJsonBody<{ queueNumber?: number | string }>(request);
    const queueNumber = parseInt(String(body.queueNumber), 10);
    if (!queueNumber || isNaN(queueNumber)) {
      return NextResponse.json({ error: "Invalid queue number" }, { status: 400 });
    }

    const entranceType = getEntranceFromRequest(request) ?? "BAZARNA";
    const event = await getActiveEvent(entranceType);
    if (!event) {
      return NextResponse.json({ error: "No active event" }, { status: 404 });
    }

    const ticket = await prisma.queueTicket.findFirst({
      where: { eventId: event.id, queueNumber },
      include: { user: { select: { brandName: true } } },
    });

    await recallNumber(event.id, queueNumber);

    await logAction({
      action: "RECALL",
      entranceType: event.entranceType,
      eventId: event.id,
      actorName: session!.user.name ?? session!.user.email,
      brandName: ticket?.user.brandName,
      queueNumber,
      details: `Recalled #${queueNumber}${ticket?.user.brandName ? ` — ${ticket.user.brandName}` : ""}`,
    });

    return NextResponse.json({ success: true });
  }, "POST /api/admin/queue/recall");
}
