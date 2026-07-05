import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getQueueStats } from "@/lib/queue";
import { withApiHandler } from "@/lib/api-error";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  return withApiHandler(async () => {
    const { token } = await params;

    const ticket = await prisma.queueTicket.findUnique({
      where: { qrToken: token },
      include: {
        user: {
          select: {
            brandName: true,
            boothNumber: true,
            representativeName: true,
          },
        },
        event: {
          select: {
            id: true,
            eventName: true,
            currentServingNumber: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const stats = await getQueueStats(ticket.eventId);
    const brandsBefore =
      ticket.status === "WAITING" && stats.currentServing
        ? Math.max(0, ticket.queueNumber - stats.currentServing - 1)
        : 0;

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        queueNumber: ticket.queueNumber,
        status: ticket.status,
        requestedAt: ticket.requestedAt,
        calledAt: ticket.calledAt,
        completedAt: ticket.completedAt,
        brandName: ticket.user.brandName,
        boothNumber: ticket.user.boothNumber,
        representativeName: ticket.user.representativeName,
        eventName: ticket.event.eventName,
        eventId: ticket.event.id,
      },
      currentServing: stats.currentServing,
      brandsBefore,
    });
  }, "GET /api/ticket/[token]");
}
