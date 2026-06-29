import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { logAction } from "@/lib/action-log";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAdmin();
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
}

export async function DELETE(request: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => ({}));
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
}
