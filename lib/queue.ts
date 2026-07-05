import { prisma } from "@/lib/prisma";
import { emitQueueUpdate } from "@/lib/socket-server";
import { randomBytes } from "crypto";
import { getEntranceLabel, isEntranceType } from "@/lib/entrance";

type TicketStatus = "WAITING" | "CALLED" | "COMPLETED";

export async function getActiveEvent(entranceType?: string | null) {
  return prisma.event.findFirst({
    where: {
      isActive: true,
      ...(entranceType ? { entranceType } : {}),
    },
    orderBy: { eventDate: "desc" },
  });
}

export async function getQueueStats(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  const tickets = await prisma.queueTicket.findMany({
    where: { eventId },
    orderBy: { queueNumber: "asc" },
    include: {
      user: {
        select: {
          brandName: true,
          boothNumber: true,
          representativeName: true,
        },
      },
    },
  });

  const currentServing = event?.currentServingNumber ?? null;
  const calledTicket = tickets.find(
    (t) => t.status === "CALLED" || t.queueNumber === currentServing
  );

  const upcoming = tickets
    .filter((t) => t.status === "WAITING")
    .slice(0, 5)
    .map((t) => t.queueNumber);

  return {
    event,
    tickets,
    currentServing,
    calledTicket,
    upcoming,
    totalWaiting: tickets.filter((t) => t.status === "WAITING").length,
    totalCompleted: tickets.filter((t) => t.status === "COMPLETED").length,
  };
}

export async function broadcastQueueUpdate(eventId: string) {
  const stats = await getQueueStats(eventId);
  emitQueueUpdate(eventId, {
    currentServing: stats.currentServing,
    upcoming: stats.upcoming,
    tickets: stats.tickets.map((t) => ({
      id: t.id,
      queueNumber: t.queueNumber,
      status: t.status,
      brandName: t.user.brandName,
      boothNumber: t.user.boothNumber,
      requestedAt: t.requestedAt,
      calledAt: t.calledAt,
      completedAt: t.completedAt,
    })),
    totalWaiting: stats.totalWaiting,
    totalCompleted: stats.totalCompleted,
  });
}

export async function getActiveTicketInOtherEntrance(
  userId: string,
  currentEventId: string
) {
  const currentEvent = await prisma.event.findUnique({
    where: { id: currentEventId },
  });
  if (!currentEvent) return null;

  const otherEvent = await prisma.event.findFirst({
    where: {
      isActive: true,
      entranceType: { not: currentEvent.entranceType },
    },
  });
  if (!otherEvent) return null;

  return prisma.queueTicket.findFirst({
    where: {
      userId,
      eventId: otherEvent.id,
      status: { in: ["WAITING", "CALLED"] },
    },
    include: { event: true },
  });
}

export async function requestQueueNumber(userId: string, eventId: string) {
  const existing = await prisma.queueTicket.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });
  if (existing) {
    return { error: "You already have a queue number for this event", ticket: existing };
  }

  const otherTicket = await getActiveTicketInOtherEntrance(userId, eventId);
  if (otherTicket && isEntranceType(otherTicket.event.entranceType)) {
    const label = getEntranceLabel(otherTicket.event.entranceType);
    return {
      error: `You already have an active ${label} exit number (#${otherTicket.queueNumber}). Bazarna and Byouth use separate queues — switch exit type only if you are at that location.`,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const lastTicket = await tx.queueTicket.findFirst({
      where: { eventId },
      orderBy: { queueNumber: "desc" },
    });
    const nextNumber = (lastTicket?.queueNumber ?? 0) + 1;
    const qrToken = randomBytes(24).toString("hex");

    const ticket = await tx.queueTicket.create({
      data: {
        userId,
        eventId,
        queueNumber: nextNumber,
        status: "WAITING",
        qrToken,
      },
      include: {
        user: true,
        event: true,
      },
    });

    return ticket;
  });

  await broadcastQueueUpdate(eventId);
  return { ticket: result, error: null };
}

export async function releaseQueueTicket(userId: string, eventId: string) {
  const ticket = await prisma.queueTicket.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });

  if (!ticket) {
    return { success: true, released: false };
  }

  if (ticket.status !== "WAITING") {
    return {
      success: false,
      released: false,
      error: "Your number was already called — it cannot be released on logout",
    };
  }

  await prisma.queueTicket.delete({ where: { id: ticket.id } });
  await broadcastQueueUpdate(eventId);

  return {
    success: true,
    released: true,
    queueNumber: ticket.queueNumber,
  };
}

export async function callNextNumber(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { error: "Event not found" };

  const nextTicket = await prisma.queueTicket.findFirst({
    where: { eventId, status: "WAITING" },
    orderBy: { queueNumber: "asc" },
  });

  if (!nextTicket) return { error: "No waiting tickets" };

  await prisma.$transaction(async (tx) => {
    if (event.currentServingNumber) {
      await tx.queueTicket.updateMany({
        where: {
          eventId,
          queueNumber: event.currentServingNumber,
          status: "CALLED",
        },
        data: { status: "WAITING", calledAt: null },
      });
    }

    await tx.queueTicket.update({
      where: { id: nextTicket.id },
      data: { status: "CALLED", calledAt: new Date() },
    });

    await tx.event.update({
      where: { id: eventId },
      data: { currentServingNumber: nextTicket.queueNumber },
    });
  });

  await broadcastQueueUpdate(eventId);
  return { success: true, queueNumber: nextTicket.queueNumber };
}

export async function skipCurrentNumber(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event?.currentServingNumber) return { error: "No number being served" };

  await prisma.queueTicket.updateMany({
    where: {
      eventId,
      queueNumber: event.currentServingNumber,
    },
    data: { status: "WAITING", calledAt: null },
  });

  return callNextNumber(eventId);
}

export async function recallNumber(eventId: string, queueNumber: number) {
  await prisma.$transaction(async (tx) => {
    await tx.queueTicket.updateMany({
      where: { eventId, status: "CALLED" },
      data: { status: "WAITING", calledAt: null },
    });

    await tx.queueTicket.updateMany({
      where: { eventId, queueNumber },
      data: { status: "CALLED", calledAt: new Date() },
    });

    await tx.event.update({
      where: { id: eventId },
      data: { currentServingNumber: queueNumber },
    });
  });

  await broadcastQueueUpdate(eventId);
  return { success: true };
}

export async function markCompleted(
  ticketId: string,
  eventId: string
) {
  const ticket = await prisma.queueTicket.findUnique({
    where: { id: ticketId },
  });
  if (!ticket) return { error: "Ticket not found" };
  if (ticket.status === "COMPLETED") {
    return { error: "Already completed", alreadyCompleted: true };
  }

  await prisma.queueTicket.update({
    where: { id: ticketId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await broadcastQueueUpdate(eventId);
  return { success: true };
}

export async function resetQueue(eventId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.queueTicket.deleteMany({ where: { eventId } });
    await tx.event.update({
      where: { id: eventId },
      data: { currentServingNumber: null },
    });
  });

  await broadcastQueueUpdate(eventId);
  return { success: true };
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  eventId: string
) {
  const data: { status: TicketStatus; calledAt?: Date | null; completedAt?: Date | null } = {
    status,
  };
  if (status === "CALLED") data.calledAt = new Date();
  if (status === "COMPLETED") data.completedAt = new Date();
  if (status === "WAITING") {
    data.calledAt = null;
    data.completedAt = null;
  }

  await prisma.queueTicket.update({
    where: { id: ticketId },
    data,
  });

  if (status === "CALLED") {
    const ticket = await prisma.queueTicket.findUnique({ where: { id: ticketId } });
    if (ticket) {
      await prisma.event.update({
        where: { id: eventId },
        data: { currentServingNumber: ticket.queueNumber },
      });
    }
  }

  await broadcastQueueUpdate(eventId);
  return { success: true };
}
