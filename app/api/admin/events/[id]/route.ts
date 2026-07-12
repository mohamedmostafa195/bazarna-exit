import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { parseDateOnlyToDb } from "@/lib/datetime";
import { eventSettingsSchema } from "@/lib/validations";
import { parseJsonBody, withApiHandler } from "@/lib/api-error";
import { deactivateSiblingEvents } from "@/lib/event-admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck.error) return adminCheck.error;

  return withApiHandler(async () => {
    const { id } = await params;
    const body = await parseJsonBody(request);

  const parsed = eventSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const eventDate = parseDateOnlyToDb(parsed.data.eventDate);
  const queueOpenTime = new Date(parsed.data.queueOpenAt);
  const queueCloseTime = new Date(parsed.data.queueCloseAt);

  if (isNaN(queueOpenTime.getTime()) || isNaN(queueCloseTime.getTime())) {
    return NextResponse.json(
      { error: "Invalid queue open or close time" },
      { status: 400 }
    );
  }

  if (queueCloseTime <= queueOpenTime) {
    return NextResponse.json(
      { error: "Queue close time must be after open time" },
      { status: 400 }
    );
  }

  const event = await prisma.event.update({
    where: { id },
    data: {
      eventName: parsed.data.eventName,
      entranceType: parsed.data.entranceType,
      eventDate,
      queueOpenTime,
      queueCloseTime,
    },
  });

  if (existing.isActive) {
    await deactivateSiblingEvents(parsed.data.entranceType, event.id);
  }

    return NextResponse.json({ event });
  }, "PATCH /api/admin/events/[id]");
}
