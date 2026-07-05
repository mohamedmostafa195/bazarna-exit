import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ENTRANCE_COOKIE, isEntranceType } from "@/lib/entrance";
import { parseJsonBody, withApiHandler } from "@/lib/api-error";

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await parseJsonBody<{ entranceType?: string }>(request);
    const { entranceType } = body;

    if (!isEntranceType(entranceType)) {
      return NextResponse.json({ error: "Invalid entrance type" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { entranceType },
    });

    const response = NextResponse.json({ success: true, entranceType });
    response.cookies.set(ENTRANCE_COOKIE, entranceType, {
      path: "/",
      maxAge: 60 * 60 * 24 * 8,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  }, "POST /api/entrance");
}

export async function DELETE() {
  return withApiHandler(async () => {
    const response = NextResponse.json({ success: true });
    response.cookies.set(ENTRANCE_COOKIE, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
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
