import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isEntranceType, ENTRANCE_COOKIE } from "@/lib/entrance";
import { parseJsonBody, withApiHandler } from "@/lib/api-error";
import { requireAuth } from "@/lib/auth-helpers";
import { clearEntranceCookie, setEntranceCookie } from "@/lib/entrance-cookie";

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const { session, error } = await requireAuth(request);
    if (error) return error;

    const body = await parseJsonBody<{ entranceType?: string }>(request);
    const { entranceType } = body;

    if (!isEntranceType(entranceType)) {
      return NextResponse.json({ error: "Invalid entrance type" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session!.user.id },
      data: { entranceType },
    });

    const response = NextResponse.json({ success: true, entranceType });
    setEntranceCookie(response, entranceType);
    return response;
  }, "POST /api/entrance");
}

export async function DELETE() {
  return withApiHandler(async () => {
    const response = NextResponse.json({ success: true });
    clearEntranceCookie(response);
    return response;
  }, "DELETE /api/entrance");
}

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const match = cookieHeader.match(new RegExp(`${ENTRANCE_COOKIE}=([^;]+)`));
    const fromCookie = match?.[1] ?? null;
    const entranceType = isEntranceType(fromCookie) ? fromCookie : null;

    return NextResponse.json({ entranceType });
  }, "GET /api/entrance");
}
