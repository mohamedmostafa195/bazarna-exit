import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { markCompleted } from "@/lib/queue";
import { logAction } from "@/lib/action-log";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const { qrToken } = body;

  if (!qrToken) {
    return NextResponse.json({ error: "QR token required" }, { status: 400 });
  }

  const ticket = await prisma.queueTicket.findUnique({
    where: { qrToken },
    include: {
      user: {
        select: { brandName: true, boothNumber: true },
      },
      event: { select: { id: true, eventName: true, entranceType: true } },
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (ticket.status === "COMPLETED") {
    return NextResponse.json({
      error: "This brand has already completed checkout.",
      alreadyCompleted: true,
      ticket: {
        brandName: ticket.user.brandName,
        boothNumber: ticket.user.boothNumber,
        queueNumber: ticket.queueNumber,
        status: ticket.status,
        eventName: ticket.event.eventName,
      },
    }, { status: 409 });
  }

  const result = await markCompleted(ticket.id, ticket.event.id);
  if (result.error && !result.alreadyCompleted) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAction({
    action: "CHECKOUT",
    entranceType: ticket.event.entranceType,
    eventId: ticket.event.id,
    actorName: session!.user.name ?? session!.user.email,
    brandName: ticket.user.brandName,
    queueNumber: ticket.queueNumber,
    details: `Checked out #${ticket.queueNumber} — ${ticket.user.brandName}`,
  });

  return NextResponse.json({
    success: true,
    ticket: {
      brandName: ticket.user.brandName,
      boothNumber: ticket.user.boothNumber,
      queueNumber: ticket.queueNumber,
      status: "COMPLETED",
      eventName: ticket.event.eventName,
    },
  });
}

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const qrToken = searchParams.get("token");

  if (!qrToken) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const ticket = await prisma.queueTicket.findUnique({
    where: { qrToken },
    include: {
      user: {
        select: { brandName: true, boothNumber: true },
      },
      event: { select: { eventName: true } },
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  return NextResponse.json({
    ticket: {
      id: ticket.id,
      qrToken: ticket.qrToken,
      brandName: ticket.user.brandName,
      boothNumber: ticket.user.boothNumber,
      queueNumber: ticket.queueNumber,
      status: ticket.status,
      eventName: ticket.event.eventName,
    },
  });
}
