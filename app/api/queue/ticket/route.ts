import { NextResponse } from "next/server";
import { requireBrand } from "@/lib/auth-helpers";
import { getActiveEvent, releaseQueueTicket } from "@/lib/queue";
import { resolveEntranceType } from "@/lib/entrance-server";
import { withApiHandler } from "@/lib/api-error";

export async function DELETE(request: Request) {
  return withApiHandler(async () => {
    const { session, error } = await requireBrand(request);
    if (error) return error;

    const entranceType = await resolveEntranceType(
      request,
      session!.user.entranceType
    );

    if (!entranceType) {
      return NextResponse.json({ success: true, released: false });
    }

    const event = await getActiveEvent(entranceType);
    if (!event) {
      return NextResponse.json({ success: true, released: false });
    }

    const result = await releaseQueueTicket(session!.user.id, event.id);

    return NextResponse.json({
      success: result.success,
      released: result.released,
      queueNumber: result.queueNumber ?? null,
      error: result.error ?? null,
    });
  }, "DELETE /api/queue/ticket");
}
