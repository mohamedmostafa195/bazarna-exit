import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getActiveEvent, callNextNumber } from "@/lib/queue";
import { logAction } from "@/lib/action-log";
import { getEntranceFromRequest } from "@/lib/entrance-server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/api-error";

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const entranceType = getEntranceFromRequest(request) ?? "BAZARNA";
    const event = await getActiveEvent(entranceType);
    if (!event) {
      return NextResponse.json({ error: "No active event" }, { status: 404 });
    }

    const result = await callNextNumber(event.id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const ticket = await prisma.queueTicket.findFirst({
      where: { eventId: event.id, queueNumber: result.queueNumber },
      include: { user: { select: { brandName: true } } },
    });

    await logAction({
      action: "CALL_NEXT",
      entranceType: event.entranceType,
      eventId: event.id,
      actorName: session!.user.name ?? session!.user.email,
      brandName: ticket?.user.brandName,
      queueNumber: result.queueNumber,
      details: `Called #${result.queueNumber}${ticket?.user.brandName ? ` — ${ticket.user.brandName}` : ""}`,
    });

    return NextResponse.json(result);
  }, "POST /api/admin/queue/call-next");
}
