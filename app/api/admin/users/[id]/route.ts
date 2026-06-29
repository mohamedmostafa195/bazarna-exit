import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { logAction } from "@/lib/action-log";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
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
}
