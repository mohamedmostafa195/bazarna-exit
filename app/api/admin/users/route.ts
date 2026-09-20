import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { logAction } from "@/lib/action-log";
import { prisma } from "@/lib/prisma";
import { parseJsonBody, withApiHandler } from "@/lib/api-error";

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const users = await prisma.user.findMany({
      where: { role: "BRAND" },
      select: {
        id: true,
        brandName: true,
        representativeName: true,
        boothNumber: true,
        email: true,
        entranceType: true,
        createdAt: true,
        _count: { select: { tickets: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        brandName: u.brandName,
        representativeName: u.representativeName,
        boothNumber: u.boothNumber,
        email: u.email,
        entranceType: u.entranceType,
        ticketCount: u._count.tickets,
        createdAt: u.createdAt,
      })),
      total: users.length,
    });
  }, "GET /api/admin/users");
}

export async function DELETE(request: Request) {
  return withApiHandler(async () => {
    const { session, error } = await requireAdmin(request);
    if (error) return error;

    const body = await parseJsonBody<{ confirm?: string }>(request).catch(
      () => ({}) as { confirm?: string }
    );
    if (body.confirm !== "DELETE_ALL_BRANDS") {
      return NextResponse.json(
        { error: 'Confirmation required. Send { "confirm": "DELETE_ALL_BRANDS" }' },
        { status: 400 }
      );
    }

    const result = await prisma.user.deleteMany({
      where: { role: "BRAND" },
    });

    await logAction({
      action: "QUEUE_RESET",
      actorName: session!.user.name ?? session!.user.email,
      details: `Deleted all brand accounts (${result.count} removed)`,
    });

    return NextResponse.json({ deleted: result.count });
  }, "DELETE /api/admin/users");
}

export async function PATCH(request: Request) {
  return withApiHandler(async () => {
    const { session, error } = await requireAdmin(request);
    if (error) return error;

    const body = await parseJsonBody<{ action?: string; confirm?: string }>(request).catch(
      () => ({}) as { action?: string; confirm?: string }
    );

    if (body.action === "RESET_ALL_BOOTHS" || body.confirm === "RESET_ALL_BOOTHS") {
      const result = await prisma.user.updateMany({
        where: { role: "BRAND" },
        data: { boothNumber: "N/A" },
      });

      await logAction({
        action: "QUEUE_RESET",
        actorName: session!.user.name ?? session!.user.email,
        details: `Reset booth numbers to N/A for all brand accounts (${result.count} updated)`,
      });

      return NextResponse.json({ updated: result.count });
    }

    return NextResponse.json(
      { error: 'Invalid action. Send { "action": "RESET_ALL_BOOTHS" }' },
      { status: 400 }
    );
  }, "PATCH /api/admin/users");
}

