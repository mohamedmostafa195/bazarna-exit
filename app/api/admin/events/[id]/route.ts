import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/admin-route";
import { prisma } from "@/lib/prisma";
import { parseDateOnlyToDb, toDateInputValue } from "@/lib/datetime";
import { eventSettingsSchema } from "@/lib/validations";
import { parseJsonBody, withApiHandler } from "@/lib/api-error";
import { deactivateSiblingEvents } from "@/lib/event-admin";
import { resetQueue } from "@/lib/queue";

export const PATCH = adminRoute(async (request, ctx) => {
  return withApiHandler(async () => {
    const { id } = await ctx!.params;
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

    const dateChanged =
      toDateInputValue(existing.eventDate) !== toDateInputValue(eventDate);
    if (dateChanged && existing.isActive) {
      await resetQueue(event.id);
    }

    if (existing.isActive) {
      await deactivateSiblingEvents(parsed.data.entranceType, event.id);
    }

    return NextResponse.json({ event });
  }, "PATCH /api/admin/events/[id]");
});
