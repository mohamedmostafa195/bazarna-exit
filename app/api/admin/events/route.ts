import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { eventSettingsSchema } from "@/lib/validations";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const events = await prisma.event.findMany({
    orderBy: { eventDate: "desc" },
  });

  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = eventSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const eventDate = new Date(parsed.data.eventDate);
  const [openH, openM] = parsed.data.queueOpenTime.split(":").map(Number);
  const [closeH, closeM] = parsed.data.queueCloseTime.split(":").map(Number);

  const queueOpenTime = new Date(eventDate);
  queueOpenTime.setHours(openH, openM, 0, 0);

  const queueCloseTime = new Date(eventDate);
  queueCloseTime.setHours(closeH, closeM, 0, 0);

  await prisma.event.updateMany({ data: { isActive: false } });

  const event = await prisma.event.create({
    data: {
      eventName: parsed.data.eventName,
      eventDate,
      queueOpenTime,
      queueCloseTime,
      isActive: true,
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}

export async function PUT(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const { eventId, ...rest } = body;

  if (!eventId) {
    return NextResponse.json({ error: "Event ID required" }, { status: 400 });
  }

  const parsed = eventSettingsSchema.safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const eventDate = new Date(parsed.data.eventDate);
  const [openH, openM] = parsed.data.queueOpenTime.split(":").map(Number);
  const [closeH, closeM] = parsed.data.queueCloseTime.split(":").map(Number);

  const queueOpenTime = new Date(eventDate);
  queueOpenTime.setHours(openH, openM, 0, 0);

  const queueCloseTime = new Date(eventDate);
  queueCloseTime.setHours(closeH, closeM, 0, 0);

  const event = await prisma.event.update({
    where: { id: eventId },
    data: {
      eventName: parsed.data.eventName,
      eventDate,
      queueOpenTime,
      queueCloseTime,
    },
  });

  return NextResponse.json({ event });
}
