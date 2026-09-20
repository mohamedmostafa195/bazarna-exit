import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { logAction } from "@/lib/action-log";
import { prisma } from "@/lib/prisma";
import { parseJsonBody, withApiHandler } from "@/lib/api-error";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const { session, error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "ADMIN") {
      return NextResponse.json(
        { error: "Cannot delete admin accounts" },
        { status: 403 }
      );
    }

    if (user.id === session!.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 403 }
      );
    }

    await prisma.user.delete({ where: { id } });

    await logAction({
      action: "QUEUE_RESET",
      actorName: session!.user.name ?? session!.user.email,
      brandName: user.brandName,
      details: `Deleted brand account: ${user.brandName} (${user.email})`,
    });

    return NextResponse.json({ success: true });
  }, "DELETE /api/admin/users/[id]");
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const { session, error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const body = await parseJsonBody<{ boothNumber?: string }>(request);
    const boothNumber =
      body.boothNumber !== undefined ? body.boothNumber.trim() : "N/A";

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { boothNumber: boothNumber || "N/A" },
    });

    await logAction({
      action: "TICKET_EDIT",
      actorName: session!.user.name ?? session!.user.email,
      brandName: user.brandName,
      details: `Reset booth for ${user.brandName} to ${updated.boothNumber}`,
    });

    return NextResponse.json({ success: true, user: updated });
  }, "PATCH /api/admin/users/[id]");
}

