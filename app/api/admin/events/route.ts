import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/admin-route";
import { prisma } from "@/lib/prisma";
import { parseDateOnlyToDb } from "@/lib/datetime";
import { eventSettingsSchema } from "@/lib/validations";
import { parseJsonBody, withApiHandler } from "@/lib/api-error";
import { deactivateSiblingEvents } from "@/lib/event-admin";

function parseEventPayload(body: unknown) {
  const parsed = eventSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      ),
    };
  }

  const eventDate = parseDateOnlyToDb(parsed.data.eventDate);
  const queueOpenTime = new Date(parsed.data.queueOpenAt);
  const queueCloseTime = new Date(parsed.data.queueCloseAt);

  if (isNaN(queueOpenTime.getTime()) || isNaN(queueCloseTime.getTime())) {
    return {
      error: NextResponse.json(
        { error: "Invalid queue open or close time" },
        { status: 400 }
      ),
    };
  }

  if (queueCloseTime <= queueOpenTime) {
    return {
      error: NextResponse.json(
        { error: "Queue close time must be after open time" },
        { status: 400 }
      ),
    };
  }

  return {
    data: {
      eventName: parsed.data.eventName,
      entranceType: parsed.data.entranceType,
      eventDate,
      queueOpenTime,
      queueCloseTime,
    },
  };
}

export const GET = adminRoute(async () => {
  return withApiHandler(async () => {
    const events = await prisma.event.findMany({
      orderBy: { eventDate: "desc" },
    });

    return NextResponse.json({ events });
  }, "GET /api/admin/events");
});

export const POST = adminRoute(async (request) => {
  return withApiHandler(async () => {
    const body = await parseJsonBody(request);
    const parsed = parseEventPayload(body);
    if (parsed.error) return parsed.error;

    await prisma.event.updateMany({
      where: { entranceType: parsed.data!.entranceType },
      data: { isActive: false },
    });

    const event = await prisma.event.create({
      data: {
        ...parsed.data!,
        isActive: true,
      },
    });

    await deactivateSiblingEvents(parsed.data!.entranceType, event.id);

    return NextResponse.json({ event }, { status: 201 });
  }, "POST /api/admin/events");
});
